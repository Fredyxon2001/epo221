'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function crearAnuncio(fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sin sesión' };

  const titulo = String(fd.get('titulo') ?? '').trim();
  const cuerpo = String(fd.get('cuerpo') ?? '').trim();
  const prioridad = String(fd.get('prioridad') ?? 'normal');
  const audiencia = String(fd.get('audiencia') ?? 'todos');
  const icono = String(fd.get('icono') ?? '').trim() || null;
  const fijado = fd.get('fijado') === 'on';
  const publicado = fd.get('publicado') === 'on';
  const grupoId = String(fd.get('grupo_id') ?? '') || null;
  const rolObjetivo = String(fd.get('rol_objetivo') ?? '') || null;

  if (titulo.length < 4) return { error: 'El título es muy corto.' };

  const { error } = await supabase.from('anuncios').insert({
    titulo, cuerpo: cuerpo || null, prioridad, audiencia, icono, fijado, publicado,
    grupo_id: grupoId, rol_objetivo: rolObjetivo,
    autor_id: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/anuncios');
  revalidatePath('/alumno');
  revalidatePath('/profesor');
  revalidatePath('/director');
  return { ok: true };
}

export async function eliminarAnuncio(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  const supabase = createClient();
  await supabase.from('anuncios').delete().eq('id', id);
  revalidatePath('/admin/anuncios');
  return { ok: true };
}

export async function togglePublicado(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  const v = fd.get('publicado') === 'true';
  const supabase = createClient();
  await supabase.from('anuncios').update({ publicado: !v }).eq('id', id);
  revalidatePath('/admin/anuncios');
  return { ok: true };
}
