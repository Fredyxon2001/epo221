'use server';
// Chat directo alumno ↔ alumno (mismo grupo).
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// Abre (o reutiliza) un hilo entre el alumno actual y otro compañero,
// devuelve el id del hilo. Valida que ambos compartan grupo activo.
async function obtenerOcrearHilo(otroAlumnoId: string): Promise<{ hiloId?: string; error?: string }> {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: yo } = await supabase.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!yo) return { error: 'No eres alumno' };
  if (yo.id === otroAlumnoId) return { error: 'No puedes escribirte a ti mismo' };

  // Validar que comparten al menos un grupo activo
  const { data: misGrupos } = await supabase.from('inscripciones')
    .select('grupo_id').eq('alumno_id', yo.id).eq('estatus', 'activa');
  const { data: susGrupos } = await supabase.from('inscripciones')
    .select('grupo_id').eq('alumno_id', otroAlumnoId).eq('estatus', 'activa');
  const setMios = new Set((misGrupos ?? []).map((g: any) => g.grupo_id));
  const comparten = (susGrupos ?? []).some((g: any) => setMios.has(g.grupo_id));
  if (!comparten) return { error: 'Solo puedes escribir a compañeros de tu grupo' };

  // par ordenado (a < b)
  const [a, b] = yo.id < otroAlumnoId ? [yo.id, otroAlumnoId] : [otroAlumnoId, yo.id];
  const { data: existente } = await supabase.from('hilos_alumno')
    .select('id').eq('alumno_a', a).eq('alumno_b', b).maybeSingle();
  if (existente) return { hiloId: existente.id };

  const { data: nuevo, error } = await supabase.from('hilos_alumno')
    .insert({ alumno_a: a, alumno_b: b }).select('id').single();
  if (error) return { error: error.message };
  return { hiloId: nuevo.id };
}

export async function abrirHiloConCompanero(otroAlumnoId: string): Promise<{ hiloId?: string; error?: string }> {
  return obtenerOcrearHilo(otroAlumnoId);
}

export async function enviarMensajeAlumno(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const hilo_id = String(fd.get('hilo_id') ?? '');
  const cuerpo = String(fd.get('cuerpo') ?? '').trim();
  if (!hilo_id || !cuerpo) return { error: 'Mensaje vacío' };

  const { data: yo } = await supabase.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!yo) return { error: 'No eres alumno' };

  // Verificar que participo en el hilo
  const { data: hilo } = await supabase.from('hilos_alumno')
    .select('id, alumno_a, alumno_b').eq('id', hilo_id).maybeSingle();
  if (!hilo || (hilo.alumno_a !== yo.id && hilo.alumno_b !== yo.id)) return { error: 'Sin permiso' };

  const { error } = await supabase.from('mensajes_alumno').insert({
    hilo_id, autor_id: yo.id, cuerpo,
  });
  if (error) return { error: error.message };

  await supabase.from('hilos_alumno').update({ ultimo_mensaje_at: new Date().toISOString() }).eq('id', hilo_id);
  revalidatePath(`/alumno/mensajes/companero/${hilo_id}`);
  return { ok: true };
}
