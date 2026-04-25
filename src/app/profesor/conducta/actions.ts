'use server';
// Profesor crea reporte de conducta. Notifica al orientador automáticamente.
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function crearReporteConducta(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!prof) return { error: 'No eres docente' };

  const alumno_id = String(fd.get('alumno_id') ?? '');
  const tipo = String(fd.get('tipo') ?? 'negativo') as 'positivo' | 'negativo';
  const categoria = String(fd.get('categoria') ?? '').trim();
  const descripcion = String(fd.get('descripcion') ?? '').trim();
  const acciones_tomadas = String(fd.get('acciones_tomadas') ?? '').trim() || null;
  const fecha = String(fd.get('fecha') ?? '') || null;

  if (!alumno_id) return { error: 'Alumno requerido' };
  if (descripcion.length < 15) return { error: 'La descripción debe ser más detallada' };
  if (!categoria) return { error: 'Selecciona una categoría' };

  const { data: rep, error } = await supabase.from('reportes_conducta').insert({
    alumno_id, profesor_id: prof.id, tipo, categoria, descripcion, acciones_tomadas,
    fecha: fecha ?? new Date().toISOString().slice(0, 10),
  }).select('id').single();
  if (error) return { error: error.message };

  // Notificar al orientador del grupo del alumno (si hay)
  const { data: insc } = await supabase.from('inscripciones')
    .select('grupo:grupos(orientador_id)').eq('alumno_id', alumno_id).limit(1).maybeSingle();
  const orientadorProfId = (insc as any)?.grupo?.orientador_id;
  if (orientadorProfId) {
    const { data: orientadorProf } = await supabase.from('profesores')
      .select('perfil_id').eq('id', orientadorProfId).maybeSingle();
    if (orientadorProf?.perfil_id) {
      await supabase.from('notificaciones').insert({
        user_id: orientadorProf.perfil_id,
        tipo: 'conducta',
        titulo: `Nuevo reporte de conducta (${tipo})`,
        mensaje: `${categoria}: ${descripcion.slice(0, 80)}…`,
        url: `/profesor/conducta/bandeja`,
      });
    }
  }

  revalidatePath('/profesor/conducta');
  return { ok: true };
}

export async function atenderReporte(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const id = String(fd.get('id') ?? '');
  const notas = String(fd.get('notas_orientador') ?? '').trim();
  const nuevo_estado = String(fd.get('estado') ?? 'atendido') as any;

  const { error } = await supabase.from('reportes_conducta').update({
    estado: nuevo_estado,
    notas_orientador: notas || null,
    atendido_por: user.id,
    atendido_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/profesor/conducta/bandeja');
  return { ok: true };
}
