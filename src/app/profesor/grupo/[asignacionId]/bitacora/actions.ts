'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function registrarClase(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const asignacionId = String(formData.get('asignacion_id'));
  const fecha = String(formData.get('fecha') || new Date().toISOString().slice(0, 10));
  const tema = String(formData.get('tema') ?? '').trim();
  const actividades = String(formData.get('actividades') ?? '').trim() || null;
  const observaciones = String(formData.get('observaciones') ?? '').trim() || null;
  const tarea = String(formData.get('tarea') ?? '').trim() || null;

  if (!tema) redirect(`/profesor/grupo/${asignacionId}/bitacora?error=El+tema+es+requerido`);

  const { error } = await supabase.from('bitacora_clase').insert({
    asignacion_id: asignacionId, fecha, tema, actividades, observaciones, tarea,
    created_by: user?.id ?? null,
  });

  if (error) redirect(`/profesor/grupo/${asignacionId}/bitacora?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/profesor/grupo/${asignacionId}/bitacora`);
  redirect(`/profesor/grupo/${asignacionId}/bitacora?ok=Registro+guardado`);
}

export async function eliminarRegistro(formData: FormData): Promise<void> {
  const supabase = createClient();
  const id = String(formData.get('id'));
  const asignacionId = String(formData.get('asignacion_id'));
  await supabase.from('bitacora_clase').delete().eq('id', id);
  revalidatePath(`/profesor/grupo/${asignacionId}/bitacora`);
  redirect(`/profesor/grupo/${asignacionId}/bitacora?ok=Registro+eliminado`);
}
