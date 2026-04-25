'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  facebook_url:  z.string().url().or(z.literal('')).nullable(),
  instagram_url: z.string().url().or(z.literal('')).nullable(),
  tiktok_url:    z.string().url().or(z.literal('')).nullable(),
  spotify_url:   z.string().url().or(z.literal('')).nullable(),
  youtube_url:   z.string().url().or(z.literal('')).nullable(),
  whatsapp_url:  z.string().url().or(z.literal('')).nullable(),
});

export async function guardarRedes(formData: FormData) {
  const parsed = schema.safeParse({
    facebook_url:  formData.get('facebook_url')  || null,
    instagram_url: formData.get('instagram_url') || null,
    tiktok_url:    formData.get('tiktok_url')    || null,
    spotify_url:   formData.get('spotify_url')   || null,
    youtube_url:   formData.get('youtube_url')   || null,
    whatsapp_url:  formData.get('whatsapp_url')  || null,
  });

  if (!parsed.success) {
    throw new Error('URLs inválidas: ' + parsed.error.issues.map((i) => i.message).join(', '));
  }

  const supabase = createClient();

  // upsert en fila única id=1
  await supabase
    .from('sitio_config')
    .upsert({ id: 1, ...parsed.data }, { onConflict: 'id' });

  revalidatePath('/admin/publico/redes');
  revalidatePath('/publico', 'layout');
}
