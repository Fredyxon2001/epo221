'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

async function obtenerOCrearHilo(supabase: any, profesorId: string, alumnoId: string, creadoPor: 'profesor' | 'alumno' = 'profesor') {
  const { data: existente } = await supabase
    .from('mensajes_hilos').select('id')
    .eq('profesor_id', profesorId).eq('alumno_id', alumnoId).maybeSingle();
  if (existente?.id) return existente.id;
  const { data: nuevo } = await supabase
    .from('mensajes_hilos')
    .insert({ profesor_id: profesorId, alumno_id: alumnoId, creado_por: creadoPor })
    .select('id').single();
  return nuevo?.id;
}

async function subirAdjunto(supabase: any, hiloId: string, file: File | null) {
  if (!file || !(file as any).size) return null;
  if (file.size > MAX_SIZE) throw new Error('Archivo excede 15 MB');
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const rand = (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${hiloId}/${rand}.${ext}`;
  const { error } = await supabase.storage.from('mensajes').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return {
    adjunto_url: path, // guardamos el path; generamos signed URL al renderizar
    adjunto_nombre: file.name,
    adjunto_tipo: file.type || 'application/octet-stream',
    adjunto_tamano: file.size,
  };
}

export async function enviarMensajeProfesor(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profesor } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).single();
  const alumnoId = String(formData.get('alumno_id'));
  const cuerpo = String(formData.get('cuerpo') ?? '').trim();
  const file = formData.get('adjunto') as File | null;

  if ((!cuerpo && !(file && (file as any).size)) || !profesor?.id) {
    redirect(`/profesor/mensajes/${alumnoId}?error=Mensaje+vacio`);
  }

  const hiloId = await obtenerOCrearHilo(supabase, profesor.id, alumnoId, 'profesor');
  let adj: any = null;
  try { adj = await subirAdjunto(supabase, hiloId, file); }
  catch (e: any) { redirect(`/profesor/mensajes/${alumnoId}?error=${encodeURIComponent(e.message)}`); }

  await supabase.from('mensajes').insert({
    hilo_id: hiloId, autor_id: user!.id, autor_tipo: 'profesor',
    cuerpo: cuerpo || (adj ? `📎 ${adj.adjunto_nombre}` : ''),
    ...adj,
  });
  await supabase.from('mensajes_hilos').update({ ultimo_mensaje_at: new Date().toISOString() }).eq('id', hiloId);

  const { data: alumno } = await supabase.from('alumnos').select('perfil_id').eq('id', alumnoId).single();
  if (alumno?.perfil_id) {
    await supabase.from('notificaciones').insert({
      user_id: alumno.perfil_id, tipo: 'mensaje',
      titulo: 'Nuevo mensaje de tu profesor',
      mensaje: (cuerpo || (adj ? `Archivo: ${adj.adjunto_nombre}` : '')).slice(0, 120),
      url: `/alumno/mensajes/${profesor.id}`,
    });
  }

  revalidatePath(`/profesor/mensajes/${alumnoId}`);
  redirect(`/profesor/mensajes/${alumnoId}`);
}

export async function enviarMensajeAlumno(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: alumno } = await supabase.from('alumnos').select('id').eq('perfil_id', user!.id).single();
  const profesorId = String(formData.get('profesor_id'));
  const cuerpo = String(formData.get('cuerpo') ?? '').trim();
  const file = formData.get('adjunto') as File | null;

  if ((!cuerpo && !(file && (file as any).size)) || !alumno?.id) {
    redirect(`/alumno/mensajes/${profesorId}?error=Mensaje+vacio`);
  }

  const hiloId = await obtenerOCrearHilo(supabase, profesorId, alumno.id, 'alumno');
  let adj: any = null;
  try { adj = await subirAdjunto(supabase, hiloId, file); }
  catch (e: any) { redirect(`/alumno/mensajes/${profesorId}?error=${encodeURIComponent(e.message)}`); }

  await supabase.from('mensajes').insert({
    hilo_id: hiloId, autor_id: user!.id, autor_tipo: 'alumno',
    cuerpo: cuerpo || (adj ? `📎 ${adj.adjunto_nombre}` : ''),
    ...adj,
  });
  await supabase.from('mensajes_hilos').update({ ultimo_mensaje_at: new Date().toISOString() }).eq('id', hiloId);

  const { data: prof } = await supabase.from('profesores').select('perfil_id').eq('id', profesorId).single();
  if (prof?.perfil_id) {
    await supabase.from('notificaciones').insert({
      user_id: prof.perfil_id, tipo: 'mensaje',
      titulo: 'Nuevo mensaje de un alumno',
      mensaje: (cuerpo || (adj ? `Archivo: ${adj.adjunto_nombre}` : '')).slice(0, 120),
      url: `/profesor/mensajes/${alumno.id}`,
    });
  }

  revalidatePath(`/alumno/mensajes/${profesorId}`);
  redirect(`/alumno/mensajes/${profesorId}`);
}

export async function marcarHiloLeido(hiloId: string, comoTipo: 'profesor' | 'alumno'): Promise<void> {
  const supabase = createClient();
  const autorOpuesto = comoTipo === 'profesor' ? 'alumno' : 'profesor';
  await supabase.from('mensajes')
    .update({ leido_at: new Date().toISOString() })
    .eq('hilo_id', hiloId).is('leido_at', null).eq('autor_tipo', autorOpuesto);
}
