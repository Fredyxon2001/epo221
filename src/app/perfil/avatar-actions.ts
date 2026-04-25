'use server';
// Subida de foto de perfil. El bucket 'avatares' es público y
// la política permite escribir solo en carpetas con nombre = auth.uid()::text.
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const MAX = 2 * 1024 * 1024; // 2 MB

export async function subirAvatar(fd: FormData): Promise<{ error?: string; ok?: boolean; url?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const file = fd.get('avatar') as File | null;
  if (!file || !(file as any).size) return { error: 'Selecciona una imagen' };
  if (file.size > MAX) return { error: 'La imagen excede 2 MB' };
  if (!file.type.startsWith('image/')) return { error: 'Solo se permiten imágenes' };

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const rand = (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}`;
  const path = `${user.id}/${rand}.${ext}`;

  const { error: upErr } = await supabase.storage.from('avatares').upload(path, file, {
    contentType: file.type, upsert: false,
  });
  if (upErr) return { error: upErr.message };

  const { data: pub } = supabase.storage.from('avatares').getPublicUrl(path);
  const url = pub.publicUrl;

  // Actualizar en alumnos o profesores según corresponda
  const { data: alu } = await supabase.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (alu?.id) {
    await supabase.from('alumnos').update({ foto_url: url }).eq('id', alu.id);
  } else {
    const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
    if (prof?.id) await supabase.from('profesores').update({ foto_url: url }).eq('id', prof.id);
  }

  revalidatePath('/alumno/ficha');
  revalidatePath('/profesor/perfil');
  revalidatePath('/alumno', 'layout');
  revalidatePath('/profesor', 'layout');
  return { ok: true, url };
}
