'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  ciclo_id:       z.string().uuid(),
  numero:         z.coerce.number().int().min(1).max(6),
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

  const supabase = adminClient();
  await supabase
    .from('parciales_config')
    .upsert(parsed.data, { onConflict: 'ciclo_id,numero' });
  revalidatePath('/admin/parciales');
}

export async function agregarParcial(formData: FormData): Promise<void> {
  const ciclo_id = String(formData.get('ciclo_id') ?? '');
  if (!ciclo_id) return;

  const supabase = adminClient();
  // Determinar el siguiente número de parcial disponible
  const { data: existentes } = await supabase
    .from('parciales_config').select('numero').eq('ciclo_id', ciclo_id);
  const usados = new Set((existentes ?? []).map((p: any) => p.numero));
  let siguiente = 1;
  while (siguiente <= 6 && usados.has(siguiente)) siguiente++;
  if (siguiente > 6) return; // ya hay 6

  await supabase.from('parciales_config').insert({
    ciclo_id, numero: siguiente,
    nombre: `Parcial ${siguiente}`,
    publicado: false,
  });
  revalidatePath('/admin/parciales');
}

export async function eliminarParcial(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = adminClient();
  // Solo permitir borrar parciales sin calificaciones aplicadas
  await supabase.from('parciales_config').delete().eq('id', id);
  revalidatePath('/admin/parciales');
}
