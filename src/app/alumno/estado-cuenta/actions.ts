'use server';
import { requireResource, requireAttempt, requireProfessor, requireReportOrientation } from '@/lib/security/resources';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';


import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function subirComprobante(formData: FormData) {
  await requireAccess(["alumno","admin","staff","director"], "alumno/estado-cuenta/actions.ts:subirComprobante");
  await validateFormData(formData);
  await requireResource("cargos", formData.get("cargo_id"), false);


  const auth = (await createClient());
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return;

  const { data: alumno } = await supabase
    .from('alumnos').select('id').eq('perfil_id', user.id).single();
  if (!alumno) return;

  const cargoId = String(formData.get('cargo_id'));
  const metodo = String(formData.get('metodo'));
  const referencia = String(formData.get('referencia') ?? '');
  const archivo = formData.get('comprobante') as File;
  if (!archivo || typeof archivo === 'string' || archivo.size < 1 || archivo.size > 10 * 1024 * 1024 ||
    !['application/pdf','image/png','image/jpeg','image/webp'].includes(archivo.type)) throw new Error('Selecciona una imagen o PDF de hasta 10 MB.');
  if (!['transferencia','ventanilla','efectivo'].includes(metodo) || referencia.length > 200) throw new Error('Datos del pago inválidos.');

  // Validar cargo pertenece al alumno + obtener monto
  const { data: cargo } = await supabase
    .from('cargos').select('id, monto').eq('id', cargoId).eq('alumno_id', alumno.id).single();
  if (!cargo) throw new Error('Cargo no disponible.');

  // Subir archivo a Storage (bucket "comprobantes", privado)
  let comprobanteUrl: string | null = null;
  if (archivo && archivo.size > 0) {
    const ext = archivo.name.split('.').pop();
    const path = `${alumno.id}/${cargoId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('comprobantes')
      .upload(path, archivo, { contentType: archivo.type });
    if (upErr) throw new Error('No se pudo cargar el comprobante. Intenta nuevamente.');
    comprobanteUrl = path;
  }

  // Registrar intento de pago
  const { error } = await supabase.rpc('security_payment_submit', {
    p_actor_id: user.id, p_cargo_id: cargoId, p_method: metodo,
    p_reference: referencia, p_path: comprobanteUrl,
  });
  if (error) {
    if (comprobanteUrl) await supabase.storage.from('comprobantes').remove([comprobanteUrl]);
    throw new Error('No se pudo registrar el comprobante. Comprueba el estado del cargo e intenta nuevamente.');
  }

  revalidatePath('/alumno/estado-cuenta');
}
