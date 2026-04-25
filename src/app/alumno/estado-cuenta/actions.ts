'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function subirComprobante(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: alumno } = await supabase
    .from('alumnos').select('id').eq('perfil_id', user.id).single();
  if (!alumno) return;

  const cargoId = String(formData.get('cargo_id'));
  const metodo = String(formData.get('metodo'));
  const referencia = String(formData.get('referencia') ?? '');
  const archivo = formData.get('comprobante') as File;

  // Validar cargo pertenece al alumno + obtener monto
  const { data: cargo } = await supabase
    .from('cargos').select('id, monto').eq('id', cargoId).eq('alumno_id', alumno.id).single();
  if (!cargo) return;

  // Subir archivo a Storage (bucket "comprobantes", privado)
  let comprobanteUrl: string | null = null;
  if (archivo && archivo.size > 0) {
    const ext = archivo.name.split('.').pop();
    const path = `${alumno.id}/${cargoId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('comprobantes')
      .upload(path, archivo, { contentType: archivo.type });
    if (!upErr) comprobanteUrl = path;
  }

  // Registrar intento de pago
  await supabase.from('pagos').insert({
    cargo_id: cargoId,
    alumno_id: alumno.id,
    monto_pagado: cargo.monto,
    metodo,
    referencia: referencia || null,
    fecha_pago: new Date().toISOString().slice(0, 10),
    comprobante_url: comprobanteUrl,
    subido_por: user.id,
  });

  // Cargo pasa a "en_revision" hasta que admin valide
  await supabase.from('cargos').update({ estatus: 'en_revision' }).eq('id', cargoId);

  revalidatePath('/alumno/estado-cuenta');
}
