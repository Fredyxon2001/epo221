// Endpoint llamado por el trigger DB cada vez que se inserta en `notificaciones`.
// Autenticado via header x-webhook-secret (configurado en push_webhook_config).
import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { sendPushToUser } from '@/lib/push';

export async function POST(req: Request) {
  const admin = adminClient();
  const { data: cfg } = await admin
    .from('push_webhook_config')
    .select('webhook_secret, enabled')
    .eq('id', 1)
    .maybeSingle();

  if (!cfg?.enabled) return NextResponse.json({ ok: true, skipped: 'disabled' });

  const provided = req.headers.get('x-webhook-secret') ?? '';
  if (!cfg.webhook_secret || provided !== cfg.webhook_secret) {
    return NextResponse.json({ error: 'invalid-secret' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.perfil_id || !body?.title) {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const r = await sendPushToUser(body.perfil_id, {
    title: String(body.title),
    body: String(body.body ?? ''),
    url: body.url ? String(body.url) : '/',
  });
  return NextResponse.json(r);
}
