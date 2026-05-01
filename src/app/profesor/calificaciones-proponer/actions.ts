'use server';
// El maestro de la asignación PROPONE calificaciones por parcial.
// Luego el orientador del grupo las valida y se aplican a `calificaciones`.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function enviarPropuestasCalificaciones(fd: FormData): Promise<{ ok?: boolean; error?: string; total?: number }> {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const asignacion_id = String(fd.get('asignacion_id') ?? '');
  const parcial = Number(fd.get('parcial') ?? 1);
  const observaciones = String(fd.get('observaciones') ?? '').trim() || null;
  if (!asignacion_id || ![1, 2, 3].includes(parcial)) return { error: 'Datos inválidos' };

  // Verificar que el user es el maestro de la asignación
  const { data: asig } = await supabase
    .from('asignaciones')
    .select('id, profesor_id, profesor:profesores(perfil_id), grupo:grupos(orientador_id, orientador:profesores(perfil_id))')
    .eq('id', asignacion_id).maybeSingle();
  if (!asig) return { error: 'Asignación no existe' };
  if ((asig as any).profesor?.perfil_id !== user.id) return { error: 'No eres el maestro de esta asignación' };

  // Recolectar entradas: campos calificacion_<alumnoId> y faltas_<alumnoId>
  const entries: Array<{ alumno_id: string; calificacion: number | null; faltas: number }> = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('calificacion_')) {
      const alumnoId = k.replace('calificacion_', '');
      const cal = String(v).trim();
      const faltasStr = String(fd.get(`faltas_${alumnoId}`) ?? '0').trim();
      const calificacion = cal === '' ? null : Number(cal);
      const faltas = Number(faltasStr || 0);
      if (calificacion !== null && (calificacion < 0 || calificacion > 10)) {
        return { error: `Calificación inválida para alumno ${alumnoId}: ${cal}` };
      }
      entries.push({ alumno_id: alumnoId, calificacion, faltas });
    }
  }
  if (!entries.length) return { error: 'Sin filas para enviar' };

  // Insertar propuestas (una fila por alumno+parcial+timestamp)
  const rows = entries.map((e) => ({
    alumno_id: e.alumno_id,
    asignacion_id,
    parcial,
    calificacion: e.calificacion,
    faltas: e.faltas,
    observaciones,
    estado: 'pendiente' as const,
    propuesta_por: user.id,
  }));
  const { error } = await supabase.from('calificaciones_propuestas').insert(rows);
  if (error) return { error: error.message };

  // Notificar al orientador del grupo
  const orientadorPerfilId = (asig as any).grupo?.orientador?.perfil_id;
  if (orientadorPerfilId) {
    await admin.from('notificaciones').insert({
      perfil_id: orientadorPerfilId,
      titulo: '📝 Calificaciones por validar',
      mensaje: `El maestro envió ${rows.length} calificaciones del Parcial ${parcial} para tu validación.`,
      url: '/profesor/orientacion/calificaciones',
    });
  }

  revalidatePath('/profesor/calificaciones-proponer');
  revalidatePath('/profesor/orientacion/calificaciones');
  return { ok: true, total: rows.length };
}

export async function validarPropuesta(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const id = String(fd.get('id') ?? '');
  const accion = String(fd.get('accion') ?? '');
  const motivo = String(fd.get('motivo') ?? '').trim() || null;
  if (!id || !['validar', 'rechazar'].includes(accion)) return { error: 'Datos inválidos' };

  // Verificar que el user es orientador del grupo de esta propuesta
  const { data: prop } = await supabase
    .from('calificaciones_propuestas')
    .select('id, estado, alumno_id, asignacion_id, parcial, propuesta_por, asignacion:asignaciones(grupo:grupos(orientador:profesores(perfil_id)))')
    .eq('id', id).maybeSingle();
  if (!prop) return { error: 'Propuesta no encontrada' };
  if ((prop as any).asignacion?.grupo?.orientador?.perfil_id !== user.id) {
    return { error: 'No eres el orientador del grupo' };
  }
  if (prop.estado !== 'pendiente') return { error: 'La propuesta ya fue procesada' };

  if (accion === 'validar') {
    const { error } = await supabase
      .from('calificaciones_propuestas')
      .update({ estado: 'validada', validada_por: user.id, validada_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };

    // Aplicar a calificaciones
    const { error: rpcErr } = await supabase.rpc('aplicar_propuesta_calificacion', { p_propuesta_id: id });
    if (rpcErr) return { error: rpcErr.message };

    // Notificar al maestro y al alumno
    await admin.from('notificaciones').insert([
      {
        perfil_id: prop.propuesta_por,
        titulo: '✅ Calificación validada',
        mensaje: `El orientador validó tu propuesta del parcial ${prop.parcial}.`,
        url: '/profesor/calificaciones-proponer',
      },
    ]);
  } else {
    const { error } = await supabase
      .from('calificaciones_propuestas')
      .update({ estado: 'rechazada', validada_por: user.id, validada_at: new Date().toISOString(), motivo_rechazo: motivo })
      .eq('id', id);
    if (error) return { error: error.message };

    await admin.from('notificaciones').insert({
      perfil_id: prop.propuesta_por,
      titulo: '❌ Calificación rechazada',
      mensaje: `El orientador rechazó tu propuesta del parcial ${prop.parcial}${motivo ? ': ' + motivo : ''}.`,
      url: '/profesor/calificaciones-proponer',
    });
  }

  revalidatePath('/profesor/orientacion/calificaciones');
  revalidatePath('/profesor/calificaciones-proponer');
  return { ok: true };
}

export async function validarLote(fd: FormData): Promise<{ ok?: boolean; error?: string; total?: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const ids = fd.getAll('ids[]').map((x) => String(x));
  if (!ids.length) return { error: 'Sin propuestas seleccionadas' };

  let total = 0;
  for (const id of ids) {
    const f = new FormData();
    f.set('id', id);
    f.set('accion', 'validar');
    const r = await validarPropuesta(f);
    if (r.ok) total++;
  }
  return { ok: true, total };
}
