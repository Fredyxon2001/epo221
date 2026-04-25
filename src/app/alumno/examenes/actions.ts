'use server';
// Alumno inicia intento, guarda respuestas y entrega.
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function iniciarIntento(examen_id: string): Promise<{ error?: string; id?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: al } = await supabase.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!al) return { error: 'No eres alumno' };

  const { data: examen } = await supabase.from('examenes').select('*').eq('id', examen_id).maybeSingle();
  if (!examen) return { error: 'Examen no existe' };
  const ahora = new Date();
  if (new Date(examen.fecha_apertura) > ahora) return { error: 'Aún no abre' };
  if (new Date(examen.fecha_cierre) < ahora) return { error: 'Ya cerró' };

  const { data: previos } = await supabase.from('examen_intentos')
    .select('id, estado, numero').eq('examen_id', examen_id).eq('alumno_id', al.id).order('numero', { ascending: false });
  const enCurso = (previos ?? []).find((p: any) => p.estado === 'en_curso');
  if (enCurso) return { id: enCurso.id };

  const usados = (previos ?? []).length;
  if (usados >= examen.intentos_max) return { error: 'Has agotado los intentos' };

  const { data, error } = await supabase.from('examen_intentos').insert({
    examen_id, alumno_id: al.id, numero: usados + 1, estado: 'en_curso',
  }).select('id').single();
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function guardarRespuesta(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const intento_id = String(fd.get('intento_id') ?? '');
  const pregunta_id = String(fd.get('pregunta_id') ?? '');
  const respuesta = String(fd.get('respuesta') ?? '').trim();

  const { data: preg } = await supabase.from('examen_preguntas').select('*').eq('id', pregunta_id).maybeSingle();
  if (!preg) return { error: 'Pregunta inválida' };

  let correcta: boolean | null = null;
  let puntos_obtenidos: number | null = null;
  if (preg.tipo === 'opcion_multiple' || preg.tipo === 'verdadero_falso') {
    correcta = respuesta === preg.respuesta_correcta;
    puntos_obtenidos = correcta ? Number(preg.puntos) : 0;
  }

  const { error } = await supabase.from('examen_respuestas').upsert({
    intento_id, pregunta_id, respuesta, correcta, puntos_obtenidos,
  }, { onConflict: 'intento_id,pregunta_id' });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function entregarIntento(intento_id: string): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  // Calcular calificación automática (auto-calificables)
  const { data: resp } = await supabase.from('examen_respuestas')
    .select('puntos_obtenidos, pregunta:examen_preguntas(puntos, tipo)').eq('intento_id', intento_id);
  const obtenidos = (resp ?? []).reduce((s: number, r: any) => s + (Number(r.puntos_obtenidos) || 0), 0);
  const totalPts = (resp ?? []).reduce((s: number, r: any) => s + (Number(r.pregunta?.puntos) || 0), 0);
  const tieneAbiertas = (resp ?? []).some((r: any) => r.pregunta?.tipo === 'abierta');
  const calif = totalPts > 0 ? Math.round((obtenidos / totalPts) * 100) / 10 : 0;

  const { error } = await supabase.from('examen_intentos').update({
    fin: new Date().toISOString(),
    estado: tieneAbiertas ? 'enviado' : 'calificado',
    calificacion: tieneAbiertas ? null : calif,
  }).eq('id', intento_id);
  if (error) return { error: error.message };

  // Notificar al docente si hay abiertas
  if (tieneAbiertas) {
    const { data: it } = await supabase.from('examen_intentos')
      .select('examen:examenes(titulo, asignacion:asignaciones(profesor:profesores(perfil_id)))')
      .eq('id', intento_id).maybeSingle();
    const pid = (it as any)?.examen?.asignacion?.profesor?.perfil_id;
    if (pid) {
      await supabase.from('notificaciones').insert({
        user_id: pid, tipo: 'examen',
        titulo: `Examen por calificar: ${(it as any).examen.titulo}`,
        mensaje: `Un alumno entregó respuestas abiertas.`,
        url: `/profesor/examenes`,
      });
    }
  }

  revalidatePath('/alumno/examenes');
  return { ok: true };
}
