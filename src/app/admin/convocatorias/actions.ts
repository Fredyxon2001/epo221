'use server';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';


import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { validCalendarDate } from '@/lib/public-convocatorias';

export async function crearConvocatoria(formData: FormData) {
  await requireAccess(["admin","staff","director"], "admin/convocatorias/actions.ts:crearConvocatoria");
  await validateFormData(formData);

  const vigenteDesde = String(formData.get('vigente_desde') ?? '').trim() || null;
  const vigenteHasta = String(formData.get('vigente_hasta') ?? '').trim() || null;
  const titulo = String(formData.get('titulo') ?? '').trim();
  const archivoUrl = String(formData.get('archivo_url') ?? '').trim() || null;
  if (!titulo || titulo.length > 200) redirect('/admin/convocatorias?error=titulo');
  if ((vigenteDesde && !validCalendarDate(vigenteDesde)) || (vigenteHasta && !validCalendarDate(vigenteHasta)) || (vigenteDesde && vigenteHasta && vigenteDesde > vigenteHasta)) {
    redirect('/admin/convocatorias?error=fechas');
  }
  if (archivoUrl) {
    let url: URL;
    try {
      url = new URL(archivoUrl);
    } catch { redirect('/admin/convocatorias?error=archivo'); }
    if (url.protocol !== 'https:' || url.username || url.password) redirect('/admin/convocatorias?error=archivo');
  }
  const supabase = adminClient();

  const { error } = await supabase.from('convocatorias').insert({
    titulo,
    descripcion: String(formData.get('descripcion') ?? '') || null,
    archivo_url: archivoUrl,
    vigente_desde: vigenteDesde,
    vigente_hasta: vigenteHasta,
  });

  if (error) redirect('/admin/convocatorias?error=guardar');
  revalidatePath('/admin/convocatorias');
  revalidatePath('/publico/convocatorias');
  redirect('/admin/convocatorias?resultado=creada');
}

export async function eliminarConvocatoria(formData: FormData) {
  await requireAccess(["admin","staff","director"], "admin/convocatorias/actions.ts:eliminarConvocatoria");
  await validateFormData(formData);

  const supabase = adminClient();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) redirect('/admin/convocatorias?error=eliminar');
  const { data, error } = await supabase.from('convocatorias').delete().eq('id', id).select('id');
  if (error || !data?.length) redirect('/admin/convocatorias?error=eliminar');
  revalidatePath('/admin/convocatorias');
  revalidatePath('/publico/convocatorias');
  redirect('/admin/convocatorias?resultado=eliminada');
}
