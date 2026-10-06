'use server';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
export async function guardarGuia(formData:FormData) {
  const {client}=await requireAccess(['admin','staff','director'],'publico:guia');
  await validateFormData(formData);
  const values=z.object({ciclo_id:z.string().uuid(),titulo:z.string().trim().min(1).max(200),requisitos:z.string().max(10000),fechas:z.string().max(10000),preguntas:z.string().max(10000)}).safeParse(Object.fromEntries(formData));
  if(!values.success)redirect('/admin/publico/guias?error=datos');
  const ciclo=await client.from('ciclos_escolares').select('codigo').eq('id',values.data.ciclo_id).single();
  if(ciclo.error)redirect('/admin/publico/guias?error=ciclo');
  const publicada=formData.get('publicada')==='on';
  if(publicada && (!values.data.requisitos.trim() || !values.data.fechas.trim() || !values.data.preguntas.trim()))redirect('/admin/publico/guias?error=incompleta');
  const result=await client.from('guias_escolares').upsert({...values.data,ciclo_label:ciclo.data.codigo,publicada},{onConflict:'ciclo_id'});
  if(result.error)redirect('/admin/publico/guias?error=guardar');
  revalidatePath('/publico/guia');revalidatePath('/admin/publico/guias');revalidatePath('/sitemap.xml');
  redirect('/admin/publico/guias?ciclo='+values.data.ciclo_id+'&ok=1');
}
