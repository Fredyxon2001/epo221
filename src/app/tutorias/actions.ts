'use server';
// Agenda de tutorías: horarios del docente + citas (alumno/tutor solicita, profe confirma).
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function guardarHorarioTutoria(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!prof) return { error: 'No eres docente' };

  const dia_semana = Number(fd.get('dia_semana') ?? 0);
  const hora_inicio = String(fd.get('hora_inicio') ?? '');
  const hora_fin = String(fd.get('hora_fin') ?? '');
  const modalidad = String(fd.get('modalidad') ?? 'presencial');
  const lugar = String(fd.get('lugar') ?? '').trim() || null;

  if (!hora_inicio || !hora_fin) return { error: 'Faltan horas' };

  const { error } = await supabase.from('tutorias_horarios').insert({
    profesor_id: prof.id, dia_semana, hora_inicio, hora_fin, modalidad, lugar,
  });
  if (error) return { error: error.message };
  revalidatePath('/profesor/tutorias');
  return { ok: true };
}

export async function eliminarHorarioTutoria(id: string) {
  const supabase = createClient();
  await supabase.from('tutorias_horarios').delete().eq('id', id);
  revalidatePath('/profesor/tutorias');
}

export async function solicitarCita(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const profesor_id = String(fd.get('profesor_id') ?? '');
  const fecha = String(fd.get('fecha') ?? '');
  const duracion_min = Number(fd.get('duracion_min') ?? 30);
  const motivo = String(fd.get('motivo') ?? '').trim();
  const modalidad = String(fd.get('modalidad') ?? 'presencial');
  const solicitante_tipo = String(fd.get('solicitante_tipo') ?? 'alumno') as any;
  const tutor_contacto = String(fd.get('tutor_contacto') ?? '').trim() || null;

  if (!profesor_id || !fecha || !motivo) return { error: 'Datos incompletos' };

  // Si es alumno, anclar alumno_id
  let alumno_id: string | null = null;
  const { data: al } = await supabase.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (al) alumno_id = al.id;

  const { error } = await supabase.from('tutorias_citas').insert({
    profesor_id, alumno_id,
    solicitante_tipo: alumno_id ? 'alumno' : solicitante_tipo,
    tutor_contacto,
    fecha: new Date(fecha).toISOString(),
    duracion_min, motivo, modalidad,
    estado: 'solicitada',
  });
  if (error) return { error: error.message };

  // Notificar al docente
  const { data: prof } = await supabase.from('profesores').select('perfil_id').eq('id', profesor_id).maybeSingle();
  if (prof?.perfil_id) {
    await supabase.from('notificaciones').insert({
      user_id: prof.perfil_id,
      tipo: 'tutoria',
      titulo: 'Nueva solicitud de tutoría',
      mensaje: `${new Date(fecha).toLocaleString('es-MX')} · ${motivo.slice(0, 60)}`,
      url: '/profesor/tutorias',
    });
  }

  revalidatePath('/alumno/tutorias');
  revalidatePath('/profesor/tutorias');
  return { ok: true };
}

export async function actualizarCita(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const id = String(fd.get('id') ?? '');
  const estado = String(fd.get('estado') ?? '') as any;
  const notas_profesor = String(fd.get('notas_profesor') ?? '').trim() || null;
  if (!id || !estado) return { error: 'Datos incompletos' };

  const { error } = await supabase.from('tutorias_citas').update({
    estado, notas_profesor, updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { error: error.message };

  // Notificar al alumno
  const { data: c } = await supabase.from('tutorias_citas').select('alumno_id, fecha').eq('id', id).maybeSingle();
  if (c?.alumno_id) {
    const { data: al } = await supabase.from('alumnos').select('perfil_id').eq('id', c.alumno_id).maybeSingle();
    if (al?.perfil_id) {
      await supabase.from('notificaciones').insert({
        user_id: al.perfil_id, tipo: 'tutoria',
        titulo: `Tutoría: ${estado}`,
        mensaje: `Tu tutoría del ${new Date(c.fecha).toLocaleString('es-MX')} fue marcada como ${estado}.`,
        url: '/alumno/tutorias',
      });
    }
  }

  revalidatePath('/profesor/tutorias');
  revalidatePath('/alumno/tutorias');
  return { ok: true };
}
