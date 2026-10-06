import 'server-only';
import { requireIdentity } from './access';
import { ADMIN_ROLES, hasRole } from './policy';
import { adminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function requireUuid(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error('Identificador inválido.');
}

/** All row checks use the caller's JWT and RLS even when the mutation is server-only. */
export async function requireResource(table: string, id: unknown, owned = false) {
  requireUuid(id);
  const identity = await requireIdentity(null);
  if (hasRole(identity.profile.rol, ADMIN_ROLES)) return;
  if (identity.profile.rol === 'profesor' && ['examen_preguntas','examen_respuestas','entregas_tarea'].includes(table)) {
    const parentColumn = table === 'examen_preguntas' ? 'examen_id' : table === 'examen_respuestas' ? 'intento_id' : 'tarea_id';
    const { data: resource } = await identity.client.from(table).select(parentColumn).eq('id', id).maybeSingle();
    const parentId = resource && (resource as unknown as Record<string,string>)[parentColumn];
    if (!parentId) throw new Error('Registro no disponible.');
    if (table === 'examen_respuestas') {
      const { data: attempt } = await identity.client.from('examen_intentos').select('examen_id').eq('id', parentId).maybeSingle();
      if (!attempt) throw new Error('Intento no disponible.');
      await requireResource('examenes', attempt.examen_id);
    } else await requireResource(table === 'entregas_tarea' ? 'tareas' : 'examenes', parentId);
    return;
  }
  if (identity.profile.rol === 'profesor' && ['asignaciones','tareas','examenes','planeaciones'].includes(table)) {
    const { data: resource } = await identity.client.from(table).select(table === 'asignaciones' ? 'id' : 'asignacion_id').eq('id',id).maybeSingle();
    if (!resource) throw new Error('Registro no disponible.');
    const assignmentId = table === 'asignaciones' ? id : 'asignacion_id' in resource ? resource.asignacion_id : null;
    const { data: professor } = await identity.client.from('profesores').select('id').eq('perfil_id',identity.user.id).maybeSingle();
    const { data: assignment } = await identity.client.from('asignaciones').select('id').eq('id',assignmentId).eq('profesor_id',professor?.id).maybeSingle();
    if (!assignment) throw new Error('Solo el docente asignado puede modificar esta clase.');
    return;
  }
  if (owned && table === 'rubrica_criterios') {
    const { data: criterion } = await identity.client.from(table).select('rubrica_id').eq('id', id).maybeSingle();
    if (!criterion) throw new Error('Criterio no disponible.');
    await requireResource('rubricas', criterion.rubrica_id, true);
    return;
  }
  if (owned && table === 'chat_grupal_mensajes') {
    const { data: message } = await identity.client.from(table).select('autor_id').eq('id', id).maybeSingle();
    if (!message || message.autor_id !== identity.user.id) throw new Error('Solo puedes eliminar tus mensajes.');
    return;
  }
  let query = identity.client.from(table).select('id').eq('id', id);
  if (owned && table === 'rubricas') query = query.eq('creado_por', identity.user.id);
  const { data, error } = await query.maybeSingle();
  if (error || !data) throw new Error('No tienes permiso para acceder a este registro.');
}
export async function requireAssignment(id: unknown) { await requireResource('asignaciones', id); }
export async function requireRoster(assignmentId: unknown, studentIds: string[]) {
  requireUuid(assignmentId);
  if (!studentIds.length || studentIds.length > 500 || new Set(studentIds).size !== studentIds.length) throw new Error('Lista de alumnos inválida.');
  studentIds.forEach(requireUuid);
  await requireAssignment(assignmentId);
  const client = adminClient();
  const { data: assignment } = await client.from('asignaciones').select('grupo_id,ciclo_id').eq('id', assignmentId).maybeSingle();
  if (!assignment) throw new Error('Asignación inválida.');
  const { data: enrolled, error } = await client.from('inscripciones').select('alumno_id').eq('grupo_id', assignment.grupo_id).eq('ciclo_id', assignment.ciclo_id).eq('estatus','activa').in('alumno_id',studentIds);
  if (error || new Set(enrolled?.map(r=>r.alumno_id)).size !== studentIds.length) throw new Error('La lista contiene alumnos fuera de esta asignación.');
}
export async function requireStudent(id: unknown) { await requireResource('alumnos', id); }

export async function requireProfessor(id: unknown) {
  requireUuid(id);
  const identity = await requireIdentity(null);
  if (hasRole(identity.profile.rol, ADMIN_ROLES)) return;
  const { data: allowed, error } = await identity.client.rpc('security_can_contact_professor', { p_profesor_id: id });
  if (error || !allowed) throw new Error('No tienes permiso para contactar a este docente.');
}

export async function requireReportOrientation(id: unknown) {
  await requireResource('reportes_conducta', id);
  const identity = await requireIdentity(null);
  if (hasRole(identity.profile.rol, ADMIN_ROLES)) return;
  const { data: report } = await identity.client.from('reportes_conducta').select('alumno_id').eq('id', id).maybeSingle();
  const { data: allowed } = await identity.client.rpc('security_is_student_counselor', { p_alumno_id: report?.alumno_id });
  if (!allowed) throw new Error('Solo el orientador del alumno puede atender el reporte.');
}

export async function requireAttempt(id: unknown, questionId?: unknown, allowExpired = false) {
  requireUuid(id);
  const identity = await requireIdentity(['alumno']);
  const { data: attempt, error } = await identity.client.from('examen_intentos').select('id,examen_id,estado,inicio').eq('id', id).maybeSingle();
  if (error || !attempt || attempt.estado !== 'en_curso') throw new Error('Intento no disponible.');
  const { data: exam } = await identity.client.from('examenes').select('id,fecha_apertura,fecha_cierre,duracion_min').eq('id', attempt.examen_id).maybeSingle();
  if (!exam || Date.parse(exam.fecha_apertura) > Date.now()) throw new Error('Examen no disponible.');
  const deadline = Math.min(Date.parse(exam.fecha_cierre), Date.parse(attempt.inicio) + Number(exam.duracion_min) * 60_000);
  if (!allowExpired && Date.now() > deadline) throw new Error('El tiempo del examen terminó.');
  if (questionId) {
    requireUuid(questionId);
    const { data: question } = await adminClient().from('examen_preguntas').select('id').eq('id', questionId).eq('examen_id', attempt.examen_id).maybeSingle();
    if (!question) throw new Error('La pregunta no pertenece a este examen.');
  }
  return attempt;
}

/** Private reads keep RLS instead of allowing a URL parameter to select any student. */
export async function scopedClient() {
  const identity = await requireIdentity(null);
  return hasRole(identity.profile.rol, [...ADMIN_ROLES,'finanzas']) ? adminClient() : identity.client;
}
