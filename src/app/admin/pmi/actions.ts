'use server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function crearPMI(fd: FormData) {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new Error('no-auth');
  const alumno_id = String(fd.get('alumno_id') ?? '');
  const motivo = String(fd.get('motivo') ?? '').trim();
  const objetivos = String(fd.get('objetivos') ?? '').trim();
  const acciones = String(fd.get('acciones') ?? '').trim();
  const fecha_revision = String(fd.get('fecha_revision') ?? '') || null;
  if (!alumno_id || !motivo || !objetivos || !acciones) throw new Error('campos-requeridos');
  const { error } = await supabase.from('pmi').insert({
    alumno_id, motivo, objetivos, acciones, fecha_revision,
    creado_por: user.id, responsable_id: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/pmi');
}

export async function actualizarPMI(fd: FormData) {
  const auth = createClient();
  const supabase = adminClient();
  const id = String(fd.get('id') ?? '');
  const estado = String(fd.get('estado') ?? '');
  const resultado = String(fd.get('resultado') ?? '').trim() || null;
  if (!id) throw new Error('sin-id');
  const { error } = await supabase.from('pmi').update({
    estado, resultado, updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/pmi');
}
