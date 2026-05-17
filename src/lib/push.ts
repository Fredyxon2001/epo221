// Helper para enviar Web Push notifications a un usuario o lista de usuarios.
// Usa VAPID keys de variables de entorno. Limpia subscriptions inválidas (410/404).
import webpush from 'web-push';
import { adminClient } from '@/lib/supabase/admin';

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT ?? 'mailto:admin@epo221.local';
  if (!pub || !priv) {
    console.warn('[push] VAPID keys ausentes — no se enviarán notificaciones');
    return false;
  }
  webpush.setVapidDetails(sub, pub, priv);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/** Envía push a TODOS los devices suscritos de un perfil. */
export async function sendPushToUser(perfilId: string, payload: PushPayload) {
  if (!configure()) return { sent: 0, failed: 0 };
  const admin = adminClient();
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('perfil_id', perfilId);

  if (!subs?.length) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;
  const stale: string[] = [];
  await Promise.all(
    subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err: any) {
        failed++;
        const code = err?.statusCode;
        if (code === 404 || code === 410) stale.push(s.id);
      }
    }),
  );
  if (stale.length) {
    await admin.from('push_subscriptions').delete().in('id', stale);
  }
  return { sent, failed };
}

export async function sendPushToUsers(perfilIds: string[], payload: PushPayload) {
  const results = await Promise.all(perfilIds.map((id) => sendPushToUser(id, payload)));
  return {
    sent: results.reduce((a, r) => a + r.sent, 0),
    failed: results.reduce((a, r) => a + r.failed, 0),
  };
}
