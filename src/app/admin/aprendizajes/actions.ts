'use server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function crearAprendizaje(fd: FormData) {
  const auth = createClient();
  const supabase = adminClient();
  const payload: any = {
    codigo: String(fd.get('codigo') ?? '').trim() || null,
    materia_id: String(fd.get('materia_id') ?? '') || null,
    campo_disciplinar_id: fd.get('campo_disciplinar_id') ? Number(fd.get('campo_disciplinar_id')) : null,
    descripcion: String(fd.get('descripcion') ?? '').trim(),
    semestre: fd.get('semestre') ? Number(fd.get('semestre')) : null,
  };
  if (!payload.descripcion || !payload.materia_id) throw new Error('campos-requeridos');
  const { error } = await supabase.from('aprendizajes_esperados').insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/aprendizajes');
}

export async function eliminarAprendizaje(fd: FormData) {
  const auth = createClient();
  const supabase = adminClient();
  const id = String(fd.get('id') ?? '');
  if (!id) return;
  await supabase.from('aprendizajes_esperados').delete().eq('id', id);
  revalidatePath('/admin/aprendizajes');
}
