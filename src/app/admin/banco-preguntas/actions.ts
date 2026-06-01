'use server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function agregarPregunta(fd: FormData) {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  const opcCsv = String(fd.get('opciones_csv') ?? '').trim();
  const opciones = opcCsv ? opcCsv.split(',').map((s) => s.trim()).filter(Boolean) : null;
  const payload: any = {
    es_banco: true,
    materia_id: String(fd.get('materia_id') ?? '') || null,
    tema: String(fd.get('tema') ?? '').trim() || null,
    dificultad: String(fd.get('dificultad') ?? '') || null,
    tipo: String(fd.get('tipo') ?? 'opcion_multiple'),
    enunciado: String(fd.get('enunciado') ?? '').trim(),
    opciones,
    respuesta_correcta: String(fd.get('respuesta_correcta') ?? '').trim() || null,
    puntos: Number(fd.get('puntos') ?? 1),
    autor_id: user?.id ?? null,
    orden: 0,
  };
  if (!payload.enunciado || !payload.materia_id) throw new Error('campos-requeridos');
  const { error } = await supabase.from('examen_preguntas').insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/banco-preguntas');
}

export async function eliminarPregunta(fd: FormData) {
  const auth = createClient();
  const supabase = adminClient();
  const id = String(fd.get('id') ?? '');
  if (!id) return;
  await supabase.from('examen_preguntas').delete().eq('id', id);
  revalidatePath('/admin/banco-preguntas');
}
