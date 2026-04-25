'use server';
// Acciones de tareas (docente): crear, editar y calificar entregas.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function crearTarea(fd: FormData): Promise<{ error?: string; ok?: boolean; id?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!prof) return { error: 'No eres docente' };

  const asignacion_id = String(fd.get('asignacion_id') ?? '');
  const titulo = String(fd.get('titulo') ?? '').trim();
  const instrucciones = String(fd.get('instrucciones') ?? '').trim();
  const parcial = Number(fd.get('parcial') ?? 1) || null;
  const puntos = Number(fd.get('puntos') ?? 10);
  const permite_archivos = fd.get('permite_archivos') === 'on';
  const cierra_estricto = fd.get('cierra_estricto') === 'on';
  const fecha_entrega = String(fd.get('fecha_entrega') ?? '');
  const rubrica_id = String(fd.get('rubrica_id') ?? '') || null;

  if (!asignacion_id) return { error: 'Selecciona una asignación' };
  if (titulo.length < 3) return { error: 'Título demasiado corto' };
  if (instrucciones.length < 10) return { error: 'Describe mejor las instrucciones' };
  if (!fecha_entrega) return { error: 'Define fecha de entrega' };

  // Confirmar que la asignación es del docente
  const { data: asig } = await supabase.from('asignaciones').select('id').eq('id', asignacion_id).eq('profesor_id', prof.id).maybeSingle();
  if (!asig) return { error: 'Asignación inválida' };

  const { data: t, error } = await supabase.from('tareas').insert({
    asignacion_id, titulo, instrucciones, parcial, puntos,
    permite_archivos, cierra_estricto,
    fecha_entrega: new Date(fecha_entrega).toISOString(),
    rubrica_id,
    creada_por: user.id,
  }).select('id').single();
  if (error) return { error: error.message };

  // Notificar a los alumnos inscritos en el grupo
  const { data: asigFull } = await supabase.from('asignaciones').select('grupo_id').eq('id', asignacion_id).maybeSingle();
  if (asigFull?.grupo_id) {
    const { data: inscr } = await supabase.from('inscripciones')
      .select('alumno:alumnos(perfil_id)').eq('grupo_id', asigFull.grupo_id);
    const ids = (inscr ?? []).map((i: any) => i.alumno?.perfil_id).filter(Boolean);
    if (ids.length) {
      const rows = ids.map((uid: string) => ({
        user_id: uid,
        tipo: 'tarea',
        titulo: `Nueva tarea: ${titulo}`,
        mensaje: `Entrega antes del ${new Date(fecha_entrega).toLocaleString('es-MX')}`,
        url: `/alumno/tareas/${t.id}`,
      }));
      await supabase.from('notificaciones').insert(rows);
    }
  }

  revalidatePath('/profesor/tareas');
  return { ok: true, id: t.id };
}

export async function calificarEntrega(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const id = String(fd.get('id') ?? '');
  const calificacion = Number(fd.get('calificacion') ?? 0);
  const retroalimentacion = String(fd.get('retroalimentacion') ?? '').trim() || null;
  if (!id) return { error: 'Entrega inválida' };
  if (isNaN(calificacion)) return { error: 'Calificación inválida' };

  const { error } = await supabase.from('entregas_tarea').update({
    calificacion, retroalimentacion,
    calificada_at: new Date().toISOString(),
    calificada_por: user.id,
    estado: 'calificada',
  }).eq('id', id);
  if (error) return { error: error.message };

  // Notificar al alumno
  const { data: ent } = await supabase.from('entregas_tarea')
    .select('alumno_id, tarea_id, tarea:tareas(titulo)').eq('id', id).maybeSingle();
  if (ent) {
    const { data: al } = await supabase.from('alumnos').select('perfil_id').eq('id', (ent as any).alumno_id).maybeSingle();
    if (al?.perfil_id) {
      await supabase.from('notificaciones').insert({
        user_id: al.perfil_id,
        tipo: 'calificacion',
        titulo: `Calificación: ${(ent as any).tarea?.titulo ?? 'tarea'}`,
        mensaje: `Tu tarea fue calificada con ${calificacion}`,
        url: `/alumno/tareas/${(ent as any).tarea_id}`,
      });
    }
  }

  revalidatePath(`/profesor/tareas`);
  return { ok: true };
}

export async function eliminarTarea(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const admin = adminClient();
  // Borrar archivos asociados del bucket 'tareas'
  const { data: files } = await admin.storage.from('tareas').list(id, { limit: 1000 });
  if (files?.length) {
    await admin.storage.from('tareas').remove(files.map((f: any) => `${id}/${f.name}`));
  }
  await supabase.from('entregas_tarea').delete().eq('tarea_id', id);
  const { error } = await supabase.from('tareas').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/profesor/tareas');
  return { ok: true };
}
