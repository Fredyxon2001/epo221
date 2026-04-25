'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function crearConvocatoria(formData: FormData) {
  const supabase = createClient();
  const vigenteDesde = String(formData.get('vigente_desde') ?? '').trim() || null;
  const vigenteHasta = String(formData.get('vigente_hasta') ?? '').trim() || null;

  const { error } = await supabase.from('convocatorias').insert({
    titulo: String(formData.get('titulo')),
    descripcion: String(formData.get('descripcion') ?? '') || null,
    archivo_url: String(formData.get('archivo_url') ?? '') || null,
    vigente_desde: vigenteDesde,
    vigente_hasta: vigenteHasta,
  });

  if (error) console.error('[crearConvocatoria]', error.message);
  revalidatePath('/admin/convocatorias');
}

export async function eliminarConvocatoria(formData: FormData) {
  const supabase = createClient();
  await supabase.from('convocatorias').delete().eq('id', String(formData.get('id')));
  revalidatePath('/admin/convocatorias');
}
