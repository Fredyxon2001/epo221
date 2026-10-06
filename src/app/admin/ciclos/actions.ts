'use server';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
export async function crearCiclo(formData: FormData) {
  const { client } = await requireAccess(['admin','staff','director'], 'ciclos:crear');
  await validateFormData(formData);
  const row = z.object({ codigo: z.string().trim().min(1).max(100), periodo: z.string().trim().min(1).max(100), fecha_inicio: z.string().date(), fecha_fin: z.string().date() }).safeParse(Object.fromEntries(formData));
  if (!row.success || row.data.fecha_inicio > row.data.fecha_fin) redirect('/admin/ciclos?error=datos');
  const { error } = await client.from('ciclos_escolares').insert(row.data);
  if (error) redirect('/admin/ciclos?error=guardar');
  revalidatePath('/admin/ciclos');
}
export async function transicionCiclo(formData: FormData) {
  const { client } = await requireAccess(['admin','staff','director'], 'ciclos:transicion');
  await validateFormData(formData);
  const row = z.object({ id: z.string().uuid(), accion: z.enum(['activar','cerrar','reabrir']), motivo: z.string().trim().min(10).max(1000), confirmar: z.literal('on') }).safeParse(Object.fromEntries(formData));
  if (!row.success) redirect('/admin/ciclos?error=confirmacion');
  const { error } = await client.rpc('security_cycle_transition', { p_cycle: row.data.id, p_action: row.data.accion, p_reason: row.data.motivo });
  revalidatePath('/admin/ciclos');
  if (error) redirect('/admin/ciclos?ciclo=' + row.data.id + '&error=transicion');
  redirect('/admin/ciclos?ciclo=' + row.data.id + '&ok=1');
}
