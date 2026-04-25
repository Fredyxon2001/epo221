'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const materiaSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(120),
  semestre: z.coerce.number().int().min(1).max(6),
  horas_semestrales: z
    .union([z.coerce.number().int().min(0).max(200), z.literal('').transform(() => null)])
    .nullable()
    .optional(),
  tipo: z.enum(['obligatoria', 'paraescolar', 'capacitacion', 'optativa']),
  campo_disciplinar_id: z
    .union([z.coerce.number().int().positive(), z.literal('').transform(() => null)])
    .nullable()
    .optional(),
});

function readForm(fd: FormData) {
  return {
    nombre: fd.get('nombre'),
    semestre: fd.get('semestre'),
    horas_semestrales: fd.get('horas_semestrales') ?? '',
    tipo: fd.get('tipo'),
    campo_disciplinar_id: fd.get('campo_disciplinar_id') ?? '',
  };
}

export async function actualizarMateria(formData: FormData) {
  const id = String(formData.get('id'));
  const parsed = materiaSchema.partial({ semestre: true }).safeParse(readForm(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const supabase = createClient();
  await supabase
    .from('materias')
    .update({
      nombre: parsed.data.nombre,
      horas_semestrales: parsed.data.horas_semestrales ?? null,
      tipo: parsed.data.tipo,
      campo_disciplinar_id: parsed.data.campo_disciplinar_id ?? null,
    })
    .eq('id', id);
  revalidatePath('/admin/materias');
}

export async function crearMateria(formData: FormData) {
  const parsed = materiaSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const supabase = createClient();
  await supabase.from('materias').insert({
    nombre: parsed.data.nombre,
    semestre: parsed.data.semestre,
    horas_semestrales: parsed.data.horas_semestrales ?? null,
    tipo: parsed.data.tipo,
    campo_disciplinar_id: parsed.data.campo_disciplinar_id ?? null,
  });
  revalidatePath('/admin/materias');
}

export async function eliminarMateria(formData: FormData) {
  const id = String(formData.get('id'));
  if (!id) throw new Error('ID requerido');
  const supabase = createClient();
  // Borrado lógico: marca deleted_at. Si la columna no existe aún, cae a delete físico.
  const { error } = await supabase
    .from('materias')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    await supabase.from('materias').delete().eq('id', id);
  }
  revalidatePath('/admin/materias');
}
