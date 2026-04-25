'use server';
// Chat grupal por asignación (alumnos + docente).
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function enviarMensajeChat(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const asignacion_id = String(fd.get('asignacion_id') ?? '');
  const texto = String(fd.get('texto') ?? '').trim();
  const archivo = fd.get('archivo') as File | null;

  if (!asignacion_id) return { error: 'Asignación inválida' };
  if (!texto && (!archivo || archivo.size === 0)) return { error: 'Mensaje vacío' };

  // Determinar tipo de autor
  const { data: perfil } = await supabase.from('perfiles').select('rol, nombre').eq('id', user.id).maybeSingle();
  let autor_tipo: 'profesor' | 'alumno' | 'admin' = 'alumno';
  if (perfil?.rol === 'profesor') autor_tipo = 'profesor';
  else if (['admin', 'staff', 'director'].includes(perfil?.rol ?? '')) autor_tipo = 'admin';

  let archivo_url: string | null = null;
  let archivo_nombre: string | null = null;
  let archivo_tipo: string | null = null;

  if (archivo && archivo.size > 0) {
    if (archivo.size > 25 * 1024 * 1024) return { error: 'Archivo mayor a 25 MB' };
    const ext = archivo.name.split('.').pop() ?? 'bin';
    const key = `${asignacion_id}/${crypto.randomUUID()}.${ext}`;
    const admin = adminClient();
    const { error: upErr } = await admin.storage.from('chat-grupal').upload(key, archivo, {
      contentType: archivo.type,
    });
    if (upErr) return { error: upErr.message };
    archivo_url = key;
    archivo_nombre = archivo.name;
    archivo_tipo = archivo.type;
  }

  const { error } = await supabase.from('chat_grupal_mensajes').insert({
    asignacion_id, autor_id: user.id, autor_tipo,
    autor_nombre: perfil?.nombre ?? null,
    texto: texto || null, archivo_url, archivo_nombre, archivo_tipo,
  });
  if (error) return { error: error.message };

  revalidatePath(`/profesor/chat/${asignacion_id}`);
  revalidatePath(`/alumno/chat/${asignacion_id}`);
  return { ok: true };
}

export async function eliminarMensajeChat(id: string, asignacion_id: string) {
  const supabase = createClient();
  const { data: m } = await supabase.from('chat_grupal_mensajes').select('archivo_url').eq('id', id).maybeSingle();
  if (m?.archivo_url) {
    const admin = adminClient();
    await admin.storage.from('chat-grupal').remove([m.archivo_url]);
  }
  await supabase.from('chat_grupal_mensajes').delete().eq('id', id);
  revalidatePath(`/profesor/chat/${asignacion_id}`);
  revalidatePath(`/alumno/chat/${asignacion_id}`);
}
