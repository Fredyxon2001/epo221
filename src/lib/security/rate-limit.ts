import 'server-only';
import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { adminClient } from '@/lib/supabase/admin';

// Ventanas atómicas en Postgres; no dependen de memoria por instancia de Vercel.
export async function rateLimit(scope: string, limit: number, windowSeconds: number, subject?: string) {
  const h = await headers();
  const address = process.env.VERCEL ? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown' : 'local';
  const key = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`${scope}:${subject ?? address}`).digest('hex');
  const { data, error } = await adminClient().rpc('consume_security_limit', {
    p_key: key, p_limit: limit, p_window_seconds: windowSeconds,
  });
  if (error) throw new Error('No se pudo comprobar el límite de seguridad. Intenta más tarde.');
  return data === true;
}
