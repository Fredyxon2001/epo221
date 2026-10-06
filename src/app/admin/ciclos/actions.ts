'use server';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';


import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function crearCiclo(formData: FormData) {
  await requireAccess(["admin","staff","director"], "admin/ciclos/actions.ts:crearCiclo");
  await validateFormData(formData);

  const auth = (await createClient());
  const supabase = adminClient();
  await supabase.from('ciclos_escolares').insert({
    codigo: String(formData.get('codigo')),
    periodo: String(formData.get('periodo')),
    fecha_inicio: String(formData.get('fecha_inicio') ?? '') || null,
    fecha_fin: String(formData.get('fecha_fin') ?? '') || null,
  });
  revalidatePath('/admin/ciclos');
}

export async function activarCiclo(formData: FormData) {
  await requireAccess(["admin","staff","director"], "admin/ciclos/actions.ts:activarCiclo");
  await validateFormData(formData);

  const auth = (await createClient());
  const supabase = adminClient();
  // Solo uno activo a la vez
  await supabase.from('ciclos_escolares').update({ activo: false }).neq('id', '');
  await supabase.from('ciclos_escolares')
    .update({ activo: true }).eq('id', String(formData.get('id')));
  revalidatePath('/admin/ciclos');
}
