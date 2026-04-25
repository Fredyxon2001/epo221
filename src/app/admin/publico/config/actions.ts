'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const optUrl = z.string().url().or(z.literal('')).nullable();
const optStr = z.string().max(1000).or(z.literal('')).nullable();
const optInt = z.coerce.number().int().min(0).max(999999).or(z.nan()).nullable();

const schema = z.object({
  nombre_escuela: optStr,
  cct:            optStr,
  direccion:      optStr,
  telefono:       optStr,
  email:          z.string().email().or(z.literal('')).nullable(),
  horario:        optStr,
  mapa_embed_url: optUrl,
  whatsapp_url:   optUrl,
  youtube_url:    optUrl,
  mision:         optStr,
  vision:         optStr,
  historia:       optStr,
  total_alumnos:       optInt,
  total_generaciones:  optInt,
  aniversario:         optInt,
  porcentaje_aprobacion: optInt,
  banco:               optStr,
  titular_cuenta:      optStr,
  numero_cuenta:       optStr,
  clabe:               optStr,
  referencia_donacion: optStr,
});

export async function guardarConfig(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const input: any = {};
  for (const key of Object.keys(schema.shape)) {
    input[key] = raw[key] === '' || raw[key] === undefined ? null : raw[key];
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  // Limpia NaN de coerce
  const data: any = { ...parsed.data };
  for (const k of ['total_alumnos', 'total_generaciones', 'aniversario', 'porcentaje_aprobacion']) {
    if (Number.isNaN(data[k])) data[k] = null;
  }

  const supabase = createClient();
  await supabase
    .from('sitio_config')
    .upsert({ id: 1, ...data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  revalidatePath('/admin/publico/config');
  revalidatePath('/publico', 'layout');
  revalidatePath('/publico');
}
