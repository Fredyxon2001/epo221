'use server';
// Acciones docente para exámenes en línea.
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function crearExamen(fd: FormData): Promise<{ error?: string; ok?: boolean; id?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!prof) return { error: 'No eres docente' };

  const asignacion_id = String(fd.get('asignacion_id') ?? '');
  const titulo = String(fd.get('titulo') ?? '').trim();
  const instrucciones = String(fd.get('instrucciones') ?? '').trim() || null;
  const parcial = Number(fd.get('parcial') ?? 1) || null;
  const fecha_apertura = String(fd.get('fecha_apertura') ?? '');
  const fecha_cierre = String(fd.get('fecha_cierre') ?? '');
  const duracion_min = Number(fd.get('duracion_min') ?? 60);
  const intentos_max = Number(fd.get('intentos_max') ?? 1);
  const aleatorizar = fd.get('aleatorizar') === 'on';
  const mostrar_resultados = fd.get('mostrar_resultados') === 'on';

  if (!asignacion_id) return { error: 'Selecciona una asignación' };
  if (titulo.length < 3) return { error: 'Título demasiado corto' };
  if (!fecha_cierre) return { error: 'Define fecha de cierre' };

  const { data: asig } = await supabase.from('asignaciones').select('id').eq('id', asignacion_id).eq('profesor_id', prof.id).maybeSingle();
  if (!asig) return { error: 'Asignación inválida' };

  const { data, error } = await supabase.from('examenes').insert({
    asignacion_id, titulo, instrucciones, parcial,
    fecha_apertura: fecha_apertura ? new Date(fecha_apertura).toISOString() : new Date().toISOString(),
    fecha_cierre: new Date(fecha_cierre).toISOString(),
    duracion_min, intentos_max, aleatorizar, mostrar_resultados,
    creado_por: user.id,
  }).select('id').single();
  if (error) return { error: error.message };

  revalidatePath('/profesor/examenes');
  return { ok: true, id: data.id };
}

export async function agregarPregunta(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const examen_id = String(fd.get('examen_id') ?? '');
  const tipo = String(fd.get('tipo') ?? '') as 'opcion_multiple' | 'verdadero_falso' | 'abierta';
  const enunciado = String(fd.get('enunciado') ?? '').trim();
  const puntos = Number(fd.get('puntos') ?? 1);
  const orden = Number(fd.get('orden') ?? 0);

  if (!examen_id || !enunciado) return { error: 'Datos incompletos' };

  let opciones: any = null;
  let respuesta_correcta: string | null = null;

  if (tipo === 'opcion_multiple') {
    const textos = ['a', 'b', 'c', 'd'].map((k) => String(fd.get(`opcion_${k}`) ?? '').trim());
    opciones = textos.map((t, i) => ({ clave: ['a','b','c','d'][i], texto: t })).filter((o) => o.texto);
    respuesta_correcta = String(fd.get('respuesta_correcta') ?? '') || null;
  } else if (tipo === 'verdadero_falso') {
    opciones = [{ clave: 'verdadero', texto: 'Verdadero' }, { clave: 'falso', texto: 'Falso' }];
    respuesta_correcta = String(fd.get('respuesta_correcta') ?? '') || null;
  }

  const { error } = await supabase.from('examen_preguntas').insert({
    examen_id, tipo, enunciado, puntos, orden, opciones, respuesta_correcta,
  });
  if (error) return { error: error.message };
  revalidatePath(`/profesor/examenes/${examen_id}`);
  return { ok: true };
}

export async function eliminarPregunta(id: string, examen_id: string) {
  const supabase = createClient();
  await supabase.from('examen_preguntas').delete().eq('id', id);
  revalidatePath(`/profesor/examenes/${examen_id}`);
}

export async function calificarRespuestaAbierta(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const id = String(fd.get('id') ?? '');
  const puntos = Number(fd.get('puntos_obtenidos') ?? 0);
  const correcta = fd.get('correcta') === 'on';
  const { error } = await supabase.from('examen_respuestas').update({
    puntos_obtenidos: puntos, correcta,
  }).eq('id', id);
  if (error) return { error: error.message };

  // Recalcular calificación total del intento
  const { data: resp } = await supabase.from('examen_respuestas').select('intento_id').eq('id', id).maybeSingle();
  if (resp) await recalcularCalificacion(resp.intento_id);
  return { ok: true };
}

async function recalcularCalificacion(intento_id: string) {
  const supabase = createClient();
  const { data: resp } = await supabase.from('examen_respuestas')
    .select('puntos_obtenidos, pregunta:examen_preguntas(puntos)').eq('intento_id', intento_id);
  const obtenidos = (resp ?? []).reduce((s: number, r: any) => s + (Number(r.puntos_obtenidos) || 0), 0);
  const total = (resp ?? []).reduce((s: number, r: any) => s + (Number(r.pregunta?.puntos) || 0), 0);
  const calif = total > 0 ? Math.round((obtenidos / total) * 100) / 10 : 0;
  await supabase.from('examen_intentos').update({ calificacion: calif, estado: 'calificado' }).eq('id', intento_id);
}
