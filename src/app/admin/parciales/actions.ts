'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  ciclo_id:       z.string().uuid(),
  numero:         z.coerce.number().int().min(1).max(3),
  nombre:         z.string().max(100).optional().nullable(),
  abre_captura:   z.string().optional().nullable(),
  cierra_captura: z.string().optional().nullable(),
  publicado:      z.coerce.boolean().optional(),
});

export async function guardarParcial(formData: FormData) {
  const parsed = schema.safeParse({
    ciclo_id:       formData.get('ciclo_id'),
    numero:         formData.get('numero'),
    nombre:         formData.get('nombre'),
    abre_captura:   formData.get('abre_captura')   || null,
    cierra_captura: formData.get('cierra_captura') || null,
    publicado:      formData.get('publicado') === 'on',
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('; '));

  const supabase = createClient();
  await supabase
    .from('parciales_config')
    .upsert(parsed.data, { onConflict: 'ciclo_id,numero' });
  revalidatePath('/admin/parciales');
}
