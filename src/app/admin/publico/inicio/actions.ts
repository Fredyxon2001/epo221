'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  hero_titulo:    z.string().max(200).or(z.literal('')).nullable(),
  hero_subtitulo: z.string().max(500).or(z.literal('')).nullable(),
});

async function uploadImage(file: File, prefix: string) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen');
  if (file.size > 5 * 1024 * 1024) throw new Error('Imagen mayor a 5 MB');
  const ext = file.name.split('.').pop() || 'png';
  const path = `${prefix}/${prefix}-${Date.now()}.${ext}`;
  const sb = adminClient();
  const { error } = await sb.storage.from('publico').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type,
  });
  if (error) throw new Error(`Error subiendo imagen: ${error.message}`);
  const { data } = sb.storage.from('publico').getPublicUrl(path);
  return data.publicUrl;
}

export async function guardarInicio(formData: FormData) {
  const parsed = schema.safeParse({
    hero_titulo:    formData.get('hero_titulo')    || null,
    hero_subtitulo: formData.get('hero_subtitulo') || null,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));

  const supabase = createClient();
  const update: Record<string, any> = { ...parsed.data, updated_at: new Date().toISOString() };

  // Hero
  const heroFile = formData.get('hero_imagen') as File | null;
  if (heroFile && heroFile.size > 0) {
    update.hero_imagen_url = await uploadImage(heroFile, 'hero');
  }

  // Logo (PNG transparente recomendado)
  const logoFile = formData.get('logo_imagen') as File | null;
  if (logoFile && logoFile.size > 0) {
    update.logo_url = await uploadImage(logoFile, 'logo');
  }

  await supabase.from('sitio_config').upsert({ id: 1, ...update }, { onConflict: 'id' });
  revalidatePath('/admin/publico/inicio');
  revalidatePath('/publico', 'layout');
  revalidatePath('/publico');
}

export async function quitarHeroImagen() {
  const supabase = createClient();
  await supabase.from('sitio_config').update({ hero_imagen_url: null }).eq('id', 1);
  revalidatePath('/admin/publico/inicio');
  revalidatePath('/publico');
}

export async function quitarLogo() {
  const supabase = createClient();
  await supabase.from('sitio_config').update({ logo_url: null }).eq('id', 1);
  revalidatePath('/admin/publico/inicio');
  revalidatePath('/publico', 'layout');
}
