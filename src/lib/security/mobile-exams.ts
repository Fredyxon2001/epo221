import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { examDraftBytes, EXAM_DRAFT_BUDGET } from '@/lib/exam-drafts';

export const mobileUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export class MobileExamError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}
export function examAnswers(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 500) return false;
  if (!Object.entries(value).every(([id, answer]) => mobileUuid(id) && typeof answer === 'string' && answer.length <= 10000)) return false;
  return examDraftBytes(value as Record<string, string>) <= EXAM_DRAFT_BUDGET;
}
const examColumns = 'id,asignacion_id,titulo,instrucciones,duracion_min,fecha_apertura,fecha_cierre,intentos_max,mostrar_resultados,aleatorizar,parcial,asignacion:asignaciones(ciclo_id,materia:materias(nombre))';
const attemptColumns = 'id,examen_id,estado,inicio,numero,calificacion';
type Exam = { id: string; asignacion_id: string; titulo: string; instrucciones: string | null; duracion_min: number; fecha_apertura: string; fecha_cierre: string; intentos_max: number; mostrar_resultados: boolean; aleatorizar: boolean; parcial: number | null; asignacion: { ciclo_id: string; materia: { nombre: string } | null } | null };
type Attempt = { id: string; examen_id: string; estado: string; inicio: string; numero: number; calificacion: number | null };
function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new MobileExamError('No se pudo consultar el examen. Intenta nuevamente.');
  return result.data;
}
function publicAttempt(attempt: Attempt | null, exam: Exam) {
  return attempt ? { id: attempt.id, estado: attempt.estado, inicio: attempt.inicio, numero: attempt.numero,
    calificacion: exam.mostrar_resultados && attempt.estado === 'calificado' ? attempt.calificacion : null } : null;
}
function publicExam(exam: Exam) {
  return { id: exam.id, titulo: exam.titulo, instrucciones: exam.instrucciones, duracion_min: exam.duracion_min,
    fecha_apertura: exam.fecha_apertura, fecha_cierre: exam.fecha_cierre, intentos_max: exam.intentos_max,
    mostrar_resultados: exam.mostrar_resultados, materia: exam.asignacion?.materia?.nombre ?? '', parcial: exam.parcial };
}
export async function mobileStudent(client: SupabaseClient, actor: string) {
  const student = checked(await client.from('alumnos').select('id').eq('perfil_id', actor).is('deleted_at', null).maybeSingle());
  if (!student) throw new MobileExamError('Expediente de alumno no disponible.', 403);
  return student.id as string;
}
export async function mobileExam(client: SupabaseClient, id: string) {
  const exam = checked(await client.from('examenes').select(examColumns).eq('id', id).maybeSingle()) as unknown as Exam | null;
  if (!exam?.asignacion?.ciclo_id) throw new MobileExamError('Examen no disponible.', 404);
  return exam;
}
export async function assertExamCycleOpen(client: SupabaseClient, exam: Exam) {
  const cycle = checked(await client.from('ciclos_escolares').select('id,cerrado_en').eq('id', exam.asignacion!.ciclo_id).maybeSingle());
  if (!cycle || cycle.cerrado_en !== null) throw new MobileExamError('El ciclo está cerrado. Consulta a tu escuela.', 409);
}
export async function listMobileExams(client: SupabaseClient, student: string) {
  // RLS enforces the current active enrollment; do not replace this with a service read.
  const exams = checked(await client.from('examenes').select(examColumns).order('fecha_cierre').limit(501)) as unknown as Exam[];
  if (exams.length > 500) throw new MobileExamError('Hay demasiados exámenes. Consulta el portal escolar.', 409);
  const attempts: Attempt[] = [];
  if (exams.length) for (let offset = 0; offset <= 5000; offset += 500) {
    const batch = checked(await client.from('examen_intentos_visibles').select(attemptColumns).eq('alumno_id', student).in('examen_id', exams.map(e => e.id)).order('numero', { ascending: false }).order('id').range(offset, offset + 499)) as Attempt[];
    attempts.push(...batch);
    if (attempts.length > 5000) throw new MobileExamError('El historial es demasiado grande. Consulta el portal escolar.', 409);
    if (batch.length < 500) break;
  }
  return { exams: exams.map(exam => ({ ...publicExam(exam), attempt: publicAttempt(attempts.find(a => a.examen_id === exam.id) ?? null, exam) })), server_now: new Date().toISOString() };
}
export async function mobileExamDetail(client: SupabaseClient, student: string, id: string, exactAttempt?: string) {
  const exam = await mobileExam(client, id);
  let query = client.from('examen_intentos_visibles').select(attemptColumns).eq('examen_id', id).eq('alumno_id', student);
  if (exactAttempt) query = query.eq('id', exactAttempt);
  const attempt = checked(await query.order('numero', { ascending: false }).limit(1).maybeSingle()) as Attempt | null;
  if (exactAttempt && !attempt) throw new MobileExamError('Intento no disponible.', 404);
  if (!attempt) return { exam: publicExam(exam), attempt: null, questions: [], answers: {}, deadline: null, server_now: new Date().toISOString() };
  // Explicit allowlists exclude answer keys and scoring columns even after a submission.
  const questions = checked(await client.from('examen_preguntas').select('id,tipo,enunciado,puntos,opciones,orden').eq('examen_id', id).order('orden').limit(501)) ?? [];
  if (questions.length > 500) throw new MobileExamError('Este examen requiere el portal escolar.', 409);
  const rows = checked(await client.from('examen_respuestas').select('pregunta_id,respuesta').eq('intento_id', attempt.id).limit(501)) ?? [];
  if (rows.length > 500) throw new MobileExamError('No se pudieron recuperar las respuestas.', 503);
  const allowed = new Set(questions.map(q => q.id));
  const answers: Record<string, string> = {};
  for (const row of rows) if (allowed.has(row.pregunta_id)) answers[row.pregunta_id] = row.respuesta ?? '';
  const ordered = exam.aleatorizar ? [...questions].sort((a, b) => {
    const order = (question: string) => createHash('sha256').update(attempt.id + ':' + question).digest('hex');
    return order(a.id).localeCompare(order(b.id));
  }) : questions;
  const deadline = Math.min(Date.parse(exam.fecha_cierre), Date.parse(attempt.inicio) + Number(exam.duracion_min ?? 60) * 60000);
  if (!Number.isFinite(deadline)) throw new MobileExamError('No se pudo recuperar el tiempo del intento.');
  return { exam: publicExam(exam), attempt: publicAttempt(attempt, exam), questions: ordered.map(q => ({
    id: q.id, tipo: q.tipo, enunciado: q.enunciado, puntos: q.puntos, orden: q.orden,
    opciones: Array.isArray(q.opciones) ? q.opciones.map((option: { clave?: unknown; texto?: unknown }) => ({ clave: typeof option?.clave === 'string' ? option.clave : '', texto: typeof option?.texto === 'string' ? option.texto : '' })) : [],
  })), answers, deadline: new Date(deadline).toISOString(), server_now: new Date().toISOString() };
}
