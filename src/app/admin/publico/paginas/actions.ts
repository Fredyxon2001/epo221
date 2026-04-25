'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const slugRe = /^[a-z0-9][a-z0-9-]*$/;

const schema = z.object({
  slug:      z.string().min(2).max(60).regex(slugRe, 'slug inválido (sólo a-z 0-9 y guiones)'),
  titulo:    z.string().min(2).max(200),
  contenido: z.string().max(50000).optional().nullable(),
  publicada: z.coerce.boolean().optional(),
  orden:     z.coerce.number().int().optional(),
});

export async function crearPagina(formData: FormData) {
  const parsed = schema.safeParse({
    slug:      formData.get('slug'),
    titulo:    formData.get('titulo'),
    contenido: formData.get('contenido'),
    publicada: formData.get('publicada') === 'on',
    orden:     formData.get('orden'),
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  const supabase = createClient();
  const { data, error } = await supabase
    .from('paginas_publicas')
    .insert(parsed.data)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/admin/publico/paginas');
  redirect(`/admin/publico/paginas/${data.id}`);
}

export async function actualizarPagina(formData: FormData) {
  const id = String(formData.get('id'));
  const parsed = schema.safeParse({
    slug:      formData.get('slug'),
    titulo:    formData.get('titulo'),
    contenido: formData.get('contenido'),
    publicada: formData.get('publicada') === 'on',
    orden:     formData.get('orden'),
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  const supabase = createClient();
  await supabase
    .from('paginas_publicas')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath('/admin/publico/paginas');
  revalidatePath(`/publico/p/${parsed.data.slug}`);
}

export async function eliminarPagina(formData: FormData) {
  const id = String(formData.get('id'));
  const supabase = createClient();
  await supabase.from('paginas_publicas').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/publico/paginas');
}
