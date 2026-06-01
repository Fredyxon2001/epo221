'use server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import crypto from 'crypto';

export async function firmarReglamento(fd: FormData) {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new Error('no-auth');
  const reglamento_id = String(fd.get('reglamento_id') ?? '');
  if (!reglamento_id) throw new Error('sin-id');

  const h = headers();
  const ip = (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '').split(',')[0].trim() || null;
  const user_agent = h.get('user-agent') ?? null;

  // Hash = sha256(reglamento_id|user.id|timestamp) — prueba de integridad
  const hash = crypto.createHash('sha256').update(`${reglamento_id}|${user.id}|${Date.now()}`).digest('hex');

  const { error } = await supabase.from('reglamento_firmas').insert({
    reglamento_id, firmante_id: user.id, hash_sha256: hash, ip, user_agent,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/alumno/reglamento');
}
