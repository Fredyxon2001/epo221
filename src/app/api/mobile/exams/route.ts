import { nativeLearningReady } from '@/lib/security/native-learning';
import { mobileIdentity, mobileReply } from '@/lib/security/mobile';
import { rateLimit } from '@/lib/security/rate-limit';
import { assertExamCycleOpen, examAnswers, listMobileExams, MobileExamError, mobileExam, mobileExamDetail, mobileStudent, mobileUuid } from '@/lib/security/mobile-exams';

export const runtime = 'nodejs';
function failed(error: unknown) { return error instanceof MobileExamError ? mobileReply(error.message, error.status) : mobileReply('No se pudo consultar el examen. Intenta nuevamente.', 503); }
export async function GET(req: Request) {
  try {
    const identity = await mobileIdentity(req); if (identity.response) return identity.response;
    if (identity.profile.rol !== 'alumno') return mobileReply('Acceso de alumno requerido.', 403);
    if (!await rateLimit('mobile-exam-read', 120, 600, identity.user.id)) return mobileReply('Demasiadas consultas. Intenta más tarde.', 429);
    const id = new URL(req.url).searchParams.get('exam_id');
    if (id !== null && !mobileUuid(id)) return mobileReply('Examen inválido.', 400);
    const student = await mobileStudent(identity.client, identity.user.id);
    const result = id ? await mobileExamDetail(identity.client, student, id) : await listMobileExams(identity.client, student);
    return Response.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failed(error); }
}
export async function POST(req: Request) {
  try {
    const identity = await mobileIdentity(req); if (identity.response) return identity.response;
    if (identity.profile.rol !== 'alumno') return mobileReply('Acceso de alumno requerido.', 403);
    if (!req.headers.get('content-type')?.startsWith('application/json')) return mobileReply('Solicitud inválida.', 400);
    if (Number(req.headers.get('content-length') ?? 0) > 120000) return mobileReply('Respuestas demasiado grandes.', 413);
    const raw = await req.text(); if (Buffer.byteLength(raw, 'utf8') > 120000) return mobileReply('Respuestas demasiado grandes.', 413);
    let input; try { input = JSON.parse(raw); } catch { return mobileReply('Solicitud inválida.', 400); }
    if (!['start', 'save', 'submit'].includes(input?.action)) return mobileReply('Acción inválida.', 400);
    if (input.action === 'start' ? !mobileUuid(input.exam_id) : (!mobileUuid(input.attempt_id) || !examAnswers(input.answers))) return mobileReply('Respuestas o examen inválidos.', 400);
    if (!await rateLimit(input.action === 'save' ? 'mobile-exam-save' : 'mobile-exam-mutate', input.action === 'save' ? 600 : 30, 600, identity.user.id)) return mobileReply('Demasiados intentos. Intenta más tarde.', 429);
    if (!await nativeLearningReady(identity.service)) return mobileReply('Estas funciones móviles todavía no están habilitadas. Usa el portal escolar.', 503);
    const student = await mobileStudent(identity.client, identity.user.id);
    if (input.action === 'start') {
      if (!mobileUuid(input.exam_id)) return mobileReply('Examen inválido.', 400);
      const exam = await mobileExam(identity.client, input.exam_id);
      await assertExamCycleOpen(identity.client, exam);
      const result = await identity.service.rpc('security_exam_start', { p_examen_id: input.exam_id, p_actor_id: identity.user.id });
      if (result.error || !mobileUuid(result.data)) return mobileReply('No se pudo iniciar. Comprueba el horario y tus intentos disponibles.', 409);
      return Response.json(await mobileExamDetail(identity.client, student, input.exam_id, result.data), { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (!mobileUuid(input.attempt_id) || !examAnswers(input.answers)) return mobileReply('Respuestas inválidas.', 400);
    const attempt = await identity.client.from('examen_intentos').select('examen_id').eq('id', input.attempt_id).eq('alumno_id', student).maybeSingle();
    if (attempt.error) throw new MobileExamError('No se pudo comprobar el intento.');
    if (!attempt.data) return mobileReply('Intento no disponible.', 404);
    const exam = await mobileExam(identity.client, attempt.data.examen_id);
    await assertExamCycleOpen(identity.client, exam);
    // The existing transaction serializes saves/submits, validates membership and freezes late answers.
    const result = await identity.service.rpc('security_exam_answer', { p_intento_id: input.attempt_id, p_actor_id: identity.user.id, p_answers: input.answers, p_submit: input.action === 'submit' });
    if (result.error) return mobileReply('No se pudo guardar. Comprueba el tiempo, las preguntas y el estado del intento.', 409);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failed(error); }
}
