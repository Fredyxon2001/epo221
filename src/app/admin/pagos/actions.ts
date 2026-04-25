'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function generarFolio() {
  const y = new Date().getFullYear();
  return `R-${y}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function validarPago(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const pagoId = String(formData.get('pago_id'));
  const cargoId = String(formData.get('cargo_id'));

  await supabase.from('pagos').update({
    validado_por: user.id,
    validado_en: new Date().toISOString(),
    folio_recibo: generarFolio(),
  }).eq('id', pagoId);

  await supabase.from('cargos').update({ estatus: 'pagado' }).eq('id', cargoId);

  revalidatePath('/admin/pagos');
}

export async function rechazarPago(formData: FormData) {
  const supabase = createClient();
  const pagoId = String(formData.get('pago_id'));
  const cargoId = String(formData.get('cargo_id'));
  const motivo = String(formData.get('motivo'));

  await supabase.from('pagos').update({ rechazado_motivo: motivo }).eq('id', pagoId);
  await supabase.from('cargos').update({ estatus: 'pendiente' }).eq('id', cargoId);

  revalidatePath('/admin/pagos');
}
