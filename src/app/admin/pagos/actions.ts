'use server';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';


import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function validarPago(formData: FormData) {
  await requireAccess(["admin","staff","director","finanzas"], "admin/pagos/actions.ts:validarPago");
  await validateFormData(formData);

  const auth = (await createClient());
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return;

  const pagoId = String(formData.get('pago_id'));
  const cargoId = String(formData.get('cargo_id'));

  const { error } = await supabase.rpc('security_payment_review', {
    p_actor_id:user.id, p_pago_id:pagoId, p_cargo_id:cargoId, p_approve:true,
  });
  if (error) throw new Error('No se pudo validar el pago. Revisa su estado y el cargo asociado.');

  revalidatePath('/admin/pagos');
}

export async function rechazarPago(formData: FormData) {
  await requireAccess(["admin","staff","director","finanzas"], "admin/pagos/actions.ts:rechazarPago");
  await validateFormData(formData);

  const auth = (await createClient());
  const supabase = adminClient();
  const pagoId = String(formData.get('pago_id'));
  const cargoId = String(formData.get('cargo_id'));
  const motivo = String(formData.get('motivo'));

  const { data:{ user } } = await auth.auth.getUser();
  if (!user) throw new Error('Sesión expirada.');
  const { error } = await supabase.rpc('security_payment_review', {
    p_actor_id:user.id, p_pago_id:pagoId, p_cargo_id:cargoId, p_approve:false, p_reason:motivo,
  });
  if (error) throw new Error('No se pudo rechazar el pago. Revisa el motivo y el cargo asociado.');

  revalidatePath('/admin/pagos');
}
