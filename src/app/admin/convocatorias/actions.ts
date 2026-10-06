'use server';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';


import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function crearConvocatoria(formData: FormData) {
  await requireAccess(["admin","staff","director"], "admin/convocatorias/actions.ts:crearConvocatoria");
  await validateFormData(formData);

  const auth = (await createClient());
  const supabase = adminClient();
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
  await requireAccess(["admin","staff","director"], "admin/convocatorias/actions.ts:eliminarConvocatoria");
  await validateFormData(formData);

  const auth = (await createClient());
  const supabase = adminClient();
  await supabase.from('convocatorias').delete().eq('id', String(formData.get('id')));
  revalidatePath('/admin/convocatorias');
}
