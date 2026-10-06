'use server';
import { requireResource, requireAttempt, requireUuid } from '@/lib/security/resources';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function iniciarIntento(examen_id: string): Promise<{ error?: string; id?: string }> {
  const identity = await requireAccess(['alumno'], 'alumno/examenes/actions.ts:iniciarIntento');
  await requireResource('examenes', examen_id);
  const { data, error } = await adminClient().rpc('security_exam_start', { p_examen_id: examen_id, p_actor_id: identity.user.id });
  return error ? { error: error.message } : { id: data };
}

export async function guardarRespuesta(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const identity = await requireAccess(['alumno'], 'alumno/examenes/actions.ts:guardarRespuesta');
  await validateFormData(fd);
  await requireAttempt(fd.get('intento_id'), fd.get('pregunta_id'));
  const preguntaId = String(fd.get('pregunta_id') ?? '');
  const { error } = await adminClient().rpc('security_exam_answer', {
    p_intento_id: fd.get('intento_id'), p_actor_id: identity.user.id,
    p_answers: { [preguntaId]: String(fd.get('respuesta') ?? '') }, p_submit: false,
  });
  return error ? { error: error.message } : { ok: true };
}

export async function entregarIntento(intento_id: string, answers: Record<string,string> = {}): Promise<{ error?: string; ok?: boolean }> {
  const identity = await requireAccess(['alumno'], 'alumno/examenes/actions.ts:entregarIntento');
  await requireResource('examen_intentos', intento_id);
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length > 500) return { error: 'Respuestas inválidas.' };
  let size = 0;
  for (const [id,value] of Object.entries(answers)) {
    requireUuid(id);
    if (typeof value !== 'string' || value.length > 10000 || (size += value.length) > 100000) return { error: 'Respuestas demasiado extensas.' };
  }
  // One database transaction saves the current draft and freezes the attempt.
  const { error } = await adminClient().rpc('security_exam_answer', {
    p_intento_id: intento_id, p_actor_id: identity.user.id, p_answers: answers, p_submit: true,
  });
  if (error) return { error: error.message };
  revalidatePath('/alumno/examenes');
  return { ok: true };
}
