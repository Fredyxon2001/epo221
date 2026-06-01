// Helper server-side para leer notificaciones del usuario autenticado.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export async function getNotificaciones(userId: string, limit = 10) {
  const auth = createClient();
  const supabase = adminClient();
  const { data } = await supabase
    .from('notificaciones')
    .select('id, titulo, mensaje, url, leida, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  const items = data ?? [];
  const noLeidas = items.filter((n) => !n.leida).length;
  return { items, noLeidas };
}

export async function marcarNotificacionesLeidas(userId: string, ids?: string[]) {
  const auth = createClient();
  const supabase = adminClient();
  let q = supabase.from('notificaciones').update({ leida: true }).eq('user_id', userId);
  if (ids && ids.length) q = q.in('id', ids);
  await q;
}
