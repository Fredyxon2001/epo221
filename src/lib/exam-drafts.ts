/** Shared browser/server budget below the existing 100 kB PostgreSQL JSONB limit.
 * JSONB adds whitespace; 90 kB leaves room without changing database/deadline rules.
 */
export const EXAM_DRAFT_BUDGET = 90000;
export function examDraftBytes(answers: Record<string, string>): number {
  const json = JSON.stringify(answers);
  let bytes = 0;
  for (const point of json) {
    const code = point.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}
export function dirtyExamAnswers(current: Record<string, string>, confirmed: Record<string, string>) {
  return Object.fromEntries(Object.entries(current).filter(([id, value]) => value !== (confirmed[id] ?? '')));
}
/** Confirm pending large drafts serially, then atomically freeze only the last dirty snapshot.
 * An expired client clock never resends answers; the server still owns the real deadline.
 */
export async function submitExamDraft<T>(options: {
  current: () => Record<string, string>;
  confirmed: () => Record<string, string>;
  active: () => boolean;
  expired: () => boolean;
  save: (question: string, answer: string) => Promise<void>;
  finish: (answers: Record<string, string>) => Promise<T>;
}): Promise<T> {
  const assertActive = () => { if (!options.active()) throw Error('La pantalla del examen cambió.'); };
  const finish = () => {
    assertActive();
    const dirty = options.expired() ? {} : dirtyExamAnswers(options.current(), options.confirmed());
    if (examDraftBytes(dirty) > EXAM_DRAFT_BUDGET) throw Error('No se confirmó el guardado de todas las respuestas. Reintenta.');
    return options.finish(dirty);
  };
  assertActive();
  if (options.expired()) return finish();
  const dirty = dirtyExamAnswers(options.current(), options.confirmed());
  if (examDraftBytes(dirty) > EXAM_DRAFT_BUDGET) {
    for (const [question, answer] of Object.entries(dirty)) {
      assertActive();
      if (options.expired()) return finish();
      if (examDraftBytes({ [question]: answer }) > EXAM_DRAFT_BUDGET) throw Error('Una respuesta supera el límite permitido.');
      try { await options.save(question, answer); }
      catch (error) { if (options.expired()) return finish(); throw error; }
    }
  }
  return finish();
}
