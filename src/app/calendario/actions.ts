'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function crearEvento(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const titulo = String(fd.get('titulo') ?? '').trim();
  const descripcion = String(fd.get('descripcion') ?? '').trim() || null;
  const tipo = String(fd.get('tipo') ?? 'evento');
  const fecha_inicio = String(fd.get('fecha_inicio') ?? '');
  const fecha_fin = String(fd.get('fecha_fin') ?? '') || null;
  const todo_el_dia = fd.get('todo_el_dia') === 'on';
  const lugar = String(fd.get('lugar') ?? '').trim() || null;
  const alcance = String(fd.get('alcance') ?? 'todos');
  const gruposRaw = String(fd.get('grupo_ids') ?? '').trim();
  const grupo_ids = gruposRaw ? gruposRaw.split(',').filter(Boolean) : null;

  if (titulo.length < 3) return { error: 'Título muy corto' };
  if (!fecha_inicio) return { error: 'Fecha requerida' };

  const { error } = await supabase.from('eventos_calendario').insert({
    titulo, descripcion, tipo, fecha_inicio, fecha_fin, todo_el_dia, lugar,
    alcance, grupo_ids, creado_por: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/calendario');
  revalidatePath('/alumno/calendario');
  revalidatePath('/profesor/calendario');
  return { ok: true };
}

export async function eliminarEvento(fd: FormData): Promise<void> {
  const id = String(fd.get('id') ?? '');
  const supabase = createClient();
  await supabase.from('eventos_calendario').delete().eq('id', id);
  revalidatePath('/admin/calendario');
  revalidatePath('/alumno/calendario');
  revalidatePath('/profesor/calendario');
}
