'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function crearAsignacion(formData: FormData) {
  const supabase = createClient();
  const grupoId = String(formData.get('grupo_id'));

  // Si no se seleccionó ciclo explícitamente, tomarlo del grupo
  let cicloId = String(formData.get('ciclo_id') ?? '');
  if (!cicloId) {
    const { data: grupo } = await supabase
      .from('grupos').select('ciclo_id').eq('id', grupoId).single();
    cicloId = grupo?.ciclo_id ?? '';
  }

  const profesorId = String(formData.get('profesor_id') ?? '').trim() || null;

  const { error } = await supabase.from('asignaciones').insert({
    materia_id: String(formData.get('materia_id')),
    grupo_id: grupoId,
    profesor_id: profesorId,
    ciclo_id: cicloId,
  });

  if (error) console.error('[crearAsignacion]', error.message);
  revalidatePath('/admin/asignaciones');
  revalidatePath('/admin/grupos');
}

export async function actualizarProfesorAsignacion(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('id'));
  const profesorId = String(formData.get('profesor_id') ?? '').trim() || null;

  await supabase.from('asignaciones').update({ profesor_id: profesorId }).eq('id', id);
  revalidatePath('/admin/asignaciones');
}

export async function eliminarAsignacion(formData: FormData) {
  const supabase = createClient();
  await supabase.from('asignaciones').delete().eq('id', String(formData.get('id')));
  revalidatePath('/admin/asignaciones');
  revalidatePath('/admin/grupos');
}
