'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function crearRubrica(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const nombre = String(formData.get('nombre') ?? '').trim();
  const descripcion = String(formData.get('descripcion') ?? '').trim() || null;
  const materiaId = String(formData.get('materia_id') ?? '') || null;
  const escalaMax = Number(formData.get('escala_max') || 10);
  const publica = String(formData.get('publica') ?? '') === '1';

  if (!nombre) redirect('/profesor/rubricas?error=Nombre+requerido');

  const { data: nueva } = await supabase.from('rubricas')
    .insert({ nombre, descripcion, materia_id: materiaId, escala_max: escalaMax, publica, creado_por: user!.id })
    .select('id').single();

  revalidatePath('/profesor/rubricas');
  redirect(`/profesor/rubricas/${nueva!.id}`);
}

export async function agregarCriterio(formData: FormData): Promise<void> {
  const supabase = createClient();
  const rubricaId = String(formData.get('rubrica_id'));
  const nombre = String(formData.get('nombre') ?? '').trim();
  const peso = Number(formData.get('peso') || 1);
  const maxPuntos = Number(formData.get('max_puntos') || 10);
  const descripcion = String(formData.get('descripcion') ?? '').trim() || null;

  if (!nombre) redirect(`/profesor/rubricas/${rubricaId}?error=Nombre+requerido`);

  // Siguiente orden
  const { data: ultimo } = await supabase.from('rubrica_criterios')
    .select('orden').eq('rubrica_id', rubricaId).order('orden', { ascending: false }).limit(1);
  const orden = (ultimo?.[0]?.orden ?? -1) + 1;

  await supabase.from('rubrica_criterios').insert({
    rubrica_id: rubricaId, nombre, peso, max_puntos: maxPuntos, descripcion, orden,
  });

  revalidatePath(`/profesor/rubricas/${rubricaId}`);
  redirect(`/profesor/rubricas/${rubricaId}`);
}

export async function eliminarCriterio(formData: FormData): Promise<void> {
  const supabase = createClient();
  const id = String(formData.get('id'));
  const rubricaId = String(formData.get('rubrica_id'));
  await supabase.from('rubrica_criterios').delete().eq('id', id);
  revalidatePath(`/profesor/rubricas/${rubricaId}`);
  redirect(`/profesor/rubricas/${rubricaId}`);
}

export async function eliminarRubrica(formData: FormData): Promise<void> {
  const supabase = createClient();
  const id = String(formData.get('id'));
  await supabase.from('rubricas').delete().eq('id', id);
  revalidatePath('/profesor/rubricas');
  redirect('/profesor/rubricas?ok=Eliminada');
}

export async function duplicarRubrica(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const id = String(formData.get('id'));

  const { data: r } = await supabase.from('rubricas').select('*').eq('id', id).single();
  if (!r) redirect('/profesor/rubricas?error=No+encontrada');

  const { data: copia } = await supabase.from('rubricas').insert({
    nombre: `${r!.nombre} (copia)`,
    descripcion: r!.descripcion,
    materia_id: r!.materia_id,
    escala_max: r!.escala_max,
    publica: false,
    creado_por: user!.id,
  }).select('id').single();

  const { data: criterios } = await supabase.from('rubrica_criterios').select('*').eq('rubrica_id', id).order('orden');
  if (criterios?.length && copia) {
    await supabase.from('rubrica_criterios').insert(
      criterios.map((c) => ({
        rubrica_id: copia.id, nombre: c.nombre, descripcion: c.descripcion,
        peso: c.peso, max_puntos: c.max_puntos, orden: c.orden,
      })),
    );
  }

  revalidatePath('/profesor/rubricas');
  redirect(`/profesor/rubricas/${copia!.id}`);
}
