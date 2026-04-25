'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function crearConcepto(formData: FormData) {
  const supabase = createClient();
  const { data: ciclo } = await supabase
    .from('ciclos_escolares').select('id').eq('activo', true).single();

  await supabase.from('conceptos_pago').insert({
    clave: String(formData.get('clave')).trim().toUpperCase(),
    nombre: String(formData.get('nombre')),
    tipo: String(formData.get('tipo')),
    monto: Number(formData.get('monto')),
    ciclo_id: ciclo?.id,
  });
  revalidatePath('/admin/conceptos');
}

export async function actualizarConcepto(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('id'));
  const clave = String(formData.get('clave') ?? '').trim().toUpperCase();
  const nombre = String(formData.get('nombre') ?? '').trim();
  const tipo = String(formData.get('tipo') ?? '').trim();
  const monto = Number(formData.get('monto'));

  const patch: Record<string, any> = {};
  if (clave) patch.clave = clave;
  if (nombre) patch.nombre = nombre;
  if (tipo) patch.tipo = tipo;
  if (!Number.isNaN(monto)) patch.monto = monto;

  if (Object.keys(patch).length) {
    await supabase.from('conceptos_pago').update(patch).eq('id', id);
  }
  revalidatePath('/admin/conceptos');
}

export async function eliminarConcepto(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('id'));
  // Si ya hay cargos asociados, mejor desactivar que borrar.
  const { count } = await supabase.from('cargos')
    .select('id', { count: 'exact', head: true }).eq('concepto_id', id);
  if ((count ?? 0) > 0) {
    await supabase.from('conceptos_pago').update({ activo: false }).eq('id', id);
  } else {
    await supabase.from('conceptos_pago').delete().eq('id', id);
  }
  revalidatePath('/admin/conceptos');
}

export async function toggleConcepto(formData: FormData) {
  const supabase = createClient();
  await supabase.from('conceptos_pago')
    .update({ activo: formData.get('activo') === '1' })
    .eq('id', String(formData.get('id')));
  revalidatePath('/admin/conceptos');
}

// Genera un cargo por cada alumno activo con este concepto.
export async function asignarMasivo(formData: FormData) {
  const supabase = createClient();
  const conceptoId = String(formData.get('concepto_id'));

  const { data: concepto } = await supabase
    .from('conceptos_pago').select('monto').eq('id', conceptoId).single();
  if (!concepto) return;

  const { data: alumnos } = await supabase
    .from('alumnos').select('id').eq('estatus', 'activo');

  const cargos = (alumnos ?? []).map((a) => ({
    alumno_id: a.id, concepto_id: conceptoId, monto: concepto.monto,
  }));
  if (cargos.length) await supabase.from('cargos').insert(cargos);

  revalidatePath('/admin/conceptos');
}
