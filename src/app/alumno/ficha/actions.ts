'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const CAMPOS_EDITABLES = [
  'email', 'telefono', 'direccion', 'codigo_postal', 'municipio',
  'tutor_nombre', 'tutor_parentesco', 'tutor_telefono', 'tutor_email',
] as const;

export async function actualizarFicha(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const patch: Record<string, string | null> = {};
  for (const campo of CAMPOS_EDITABLES) {
    const v = String(formData.get(campo) ?? '').trim();
    patch[campo] = v || null;
  }

  await supabase.from('alumnos').update(patch).eq('perfil_id', user.id);
  revalidatePath('/alumno/ficha');
}
