'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function crearCiclo(formData: FormData) {
  const auth = createClient();
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
  const auth = createClient();
  const supabase = adminClient();
  // Solo uno activo a la vez
  await supabase.from('ciclos_escolares').update({ activo: false }).neq('id', '');
  await supabase.from('ciclos_escolares')
    .update({ activo: true }).eq('id', String(formData.get('id')));
  revalidatePath('/admin/ciclos');
}
