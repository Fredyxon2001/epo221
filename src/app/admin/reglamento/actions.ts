'use server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function crearVersion(fd: FormData) {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new Error('no-auth');
  const version = String(fd.get('version') ?? '').trim();
  const titulo = String(fd.get('titulo') ?? '').trim();
  const contenido_md = String(fd.get('contenido_md') ?? '').trim();
  const vigente = fd.get('vigente') === 'on';
  if (!version || !titulo || !contenido_md) throw new Error('campos-requeridos');
  if (vigente) {
    await supabase.from('reglamento_versiones').update({ vigente: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  }
  const { error } = await supabase.from('reglamento_versiones').insert({
    version, titulo, contenido_md, vigente, creado_por: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/reglamento');
  revalidatePath('/alumno/reglamento');
  revalidatePath('/profesor/reglamento');
}

export async function marcarVigente(fd: FormData) {
  const auth = createClient();
  const supabase = adminClient();
  const id = String(fd.get('id') ?? '');
  if (!id) return;
  await supabase.from('reglamento_versiones').update({ vigente: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reglamento_versiones').update({ vigente: true }).eq('id', id);
  revalidatePath('/admin/reglamento');
}
