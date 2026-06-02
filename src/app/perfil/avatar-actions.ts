'use server';
// Subida de foto de perfil. Usa adminClient para bypass RLS y evitar
// problemas de cookies/edge.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const MAX = 5 * 1024 * 1024; // 5 MB

export async function subirAvatar(fd: FormData): Promise<{ error?: string; ok?: boolean; url?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada. Vuelve a iniciar sesión.' };

  const file = fd.get('avatar') as File | null;
  if (!file || !(file as any).size) return { error: 'Selecciona una imagen' };
  if (file.size > MAX) return { error: `La imagen excede 5 MB (tiene ${(file.size/1024/1024).toFixed(1)} MB)` };
  if (!file.type.startsWith('image/')) return { error: 'Solo se permiten imágenes (JPG/PNG/WebP)' };

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const rand = (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}`;
  const path = `${user.id}/${rand}.${ext}`;

  // Usa adminClient para evitar fallos de RLS sobre el bucket
  const admin = adminClient();
  const { error: upErr } = await admin.storage.from('avatares').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return { error: `Error al subir: ${upErr.message}` };

  const { data: pub } = admin.storage.from('avatares').getPublicUrl(path);
  const url = pub.publicUrl;

  // Sincroniza en perfiles + alumnos/profesores
  await admin.from('perfiles').update({ avatar_url: url }).eq('id', user.id);

  const { data: alu } = await admin.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (alu?.id) {
    await admin.from('alumnos').update({ foto_url: url }).eq('id', alu.id);
  } else {
    const { data: prof } = await admin.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
    if (prof?.id) await admin.from('profesores').update({ foto_url: url }).eq('id', prof.id);
  }

  revalidatePath('/alumno/ficha');
  revalidatePath('/profesor/perfil');
  revalidatePath('/admin/perfil');
  revalidatePath('/alumno', 'layout');
  revalidatePath('/profesor', 'layout');
  revalidatePath('/admin', 'layout');
  revalidatePath('/director', 'layout');
  return { ok: true, url };
}
