'use server';
// Portafolio del alumno: subir evidencia, eliminar propia.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function subirEvidencia(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: al } = await supabase.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!al) return { error: 'No eres alumno' };

  const titulo = String(fd.get('titulo') ?? '').trim();
  const descripcion = String(fd.get('descripcion') ?? '').trim() || null;
  const asignacion_id = String(fd.get('asignacion_id') ?? '') || null;
  const destacada = fd.get('destacada') === 'on';
  const archivo = fd.get('archivo') as File | null;

  if (titulo.length < 3) return { error: 'Título demasiado corto' };
  if (!archivo || archivo.size === 0) return { error: 'Archivo requerido' };
  if (archivo.size > 25 * 1024 * 1024) return { error: 'Archivo mayor a 25 MB' };

  const ext = archivo.name.split('.').pop() ?? 'bin';
  const key = `${al.id}/${crypto.randomUUID()}.${ext}`;
  const admin = adminClient();
  const { error: upErr } = await admin.storage.from('portafolio').upload(key, archivo, {
    contentType: archivo.type, upsert: false,
  });
  if (upErr) return { error: upErr.message };

  const { error } = await supabase.from('portafolio_evidencias').insert({
    alumno_id: al.id,
    asignacion_id,
    titulo, descripcion,
    archivo_url: key, archivo_nombre: archivo.name,
    archivo_tipo: archivo.type, archivo_tamano: archivo.size,
    destacada,
  });
  if (error) return { error: error.message };

  revalidatePath('/alumno/portafolio');
  return { ok: true };
}

export async function eliminarEvidencia(id: string): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: al } = await supabase.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!al) return { error: 'No eres alumno' };

  const { data: ev } = await supabase.from('portafolio_evidencias')
    .select('archivo_url, alumno_id').eq('id', id).maybeSingle();
  if (!ev || ev.alumno_id !== al.id) return { error: 'Sin permiso' };

  const admin = adminClient();
  if (ev.archivo_url) await admin.storage.from('portafolio').remove([ev.archivo_url]);
  await supabase.from('portafolio_evidencias').delete().eq('id', id);

  revalidatePath('/alumno/portafolio');
  return { ok: true };
}

export async function comentarEvidencia(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!prof) return { error: 'Solo docentes pueden comentar' };

  const id = String(fd.get('id') ?? '');
  const comentario = String(fd.get('comentario') ?? '').trim();
  if (!id || !comentario) return { error: 'Datos incompletos' };

  const { error } = await supabase.from('portafolio_evidencias')
    .update({ comentario_docente: comentario }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/profesor/portafolio');
  return { ok: true };
}
