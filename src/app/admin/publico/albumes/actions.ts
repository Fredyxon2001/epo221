'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const slugRe = /^[a-z0-9][a-z0-9-]*$/;

const albumSchema = z.object({
  slug:         z.string().min(2).max(80).regex(slugRe),
  titulo:       z.string().min(2).max(200),
  descripcion:  z.string().max(2000).optional().nullable(),
  fecha_evento: z.string().optional().nullable(),
  publicado:    z.coerce.boolean().optional(),
});

export async function crearAlbum(formData: FormData) {
  const parsed = albumSchema.safeParse({
    slug:         formData.get('slug'),
    titulo:       formData.get('titulo'),
    descripcion:  formData.get('descripcion'),
    fecha_evento: formData.get('fecha_evento') || null,
    publicado:    formData.get('publicado') === 'on',
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  const supabase = createClient();
  const { data, error } = await supabase
    .from('albumes')
    .insert(parsed.data)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/admin/publico/albumes');
  redirect(`/admin/publico/albumes/${data.id}`);
}

export async function actualizarAlbum(formData: FormData) {
  const id = String(formData.get('id'));
  const parsed = albumSchema.safeParse({
    slug:         formData.get('slug'),
    titulo:       formData.get('titulo'),
    descripcion:  formData.get('descripcion'),
    fecha_evento: formData.get('fecha_evento') || null,
    publicado:    formData.get('publicado') === 'on',
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  const supabase = createClient();
  await supabase.from('albumes').update(parsed.data).eq('id', id);
  revalidatePath('/admin/publico/albumes');
  revalidatePath(`/admin/publico/albumes/${id}`);
  revalidatePath('/publico/albumes');
  revalidatePath(`/publico/albumes/${parsed.data.slug}`);
}

export async function eliminarAlbum(formData: FormData) {
  const id = String(formData.get('id'));
  const supabase = createClient();
  await supabase.from('albumes').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/publico/albumes');
  revalidatePath('/publico/albumes');
}

export async function subirFotos(formData: FormData) {
  const albumId = String(formData.get('album_id'));
  if (!albumId) throw new Error('album_id requerido');
  const files = formData.getAll('fotos') as File[];
  if (!files || files.length === 0) return;

  const sb = adminClient();
  const supabase = createClient();

  // Obtener orden actual
  const { data: last } = await supabase
    .from('album_fotos')
    .select('orden')
    .eq('album_id', albumId)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();
  let orden = (last?.orden ?? 0) + 1;

  const inserts: any[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (!file.type.startsWith('image/')) continue;
    if (file.size > 8 * 1024 * 1024) throw new Error(`"${file.name}" mayor a 8 MB`);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `albumes/${albumId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from('publico').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (error) throw new Error('Error subiendo: ' + error.message);
    const { data: pub } = sb.storage.from('publico').getPublicUrl(path);
    inserts.push({
      album_id: albumId,
      foto_url: pub.publicUrl,
      caption: null,
      orden: orden++,
    });
  }

  if (inserts.length > 0) {
    await supabase.from('album_fotos').insert(inserts);
    // Si no hay portada, usar la primera
    const { data: album } = await supabase.from('albumes').select('portada_url').eq('id', albumId).maybeSingle();
    if (!album?.portada_url) {
      await supabase.from('albumes').update({ portada_url: inserts[0].foto_url }).eq('id', albumId);
    }
  }

  revalidatePath(`/admin/publico/albumes/${albumId}`);
  revalidatePath('/publico/albumes');
}

export async function eliminarFoto(formData: FormData) {
  const id = String(formData.get('id'));
  const albumId = String(formData.get('album_id'));
  const supabase = createClient();
  await supabase.from('album_fotos').delete().eq('id', id);
  revalidatePath(`/admin/publico/albumes/${albumId}`);
  revalidatePath('/publico/albumes');
}

export async function definirPortada(formData: FormData) {
  const albumId = String(formData.get('album_id'));
  const fotoUrl = String(formData.get('foto_url'));
  const supabase = createClient();
  await supabase.from('albumes').update({ portada_url: fotoUrl }).eq('id', albumId);
  revalidatePath(`/admin/publico/albumes/${albumId}`);
  revalidatePath('/publico/albumes');
}
