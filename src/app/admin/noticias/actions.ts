'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export async function crearNoticia(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const titulo = String(formData.get('titulo'));
  await supabase.from('noticias').insert({
    titulo,
    slug: `${slugify(titulo)}-${Date.now().toString(36)}`,
    resumen: String(formData.get('resumen') ?? '') || null,
    contenido: String(formData.get('contenido') ?? '') || null,
    autor_id: user?.id,
  });
  revalidatePath('/admin/noticias');
  revalidatePath('/publico');
}

export async function togglePublicada(formData: FormData) {
  const supabase = createClient();
  const publicada = formData.get('publicada') === '1';
  await supabase.from('noticias')
    .update({ publicada, fecha_pub: publicada ? new Date().toISOString() : null })
    .eq('id', String(formData.get('id')));
  revalidatePath('/admin/noticias');
  revalidatePath('/publico');
}

export async function eliminarNoticia(formData: FormData) {
  const supabase = createClient();
  await supabase.from('noticias').delete().eq('id', String(formData.get('id')));
  revalidatePath('/admin/noticias');
}
