// Endpoint llamado por el trigger DB cada vez que se inserta en `notificaciones`.
// Autenticado via header x-webhook-secret (configurado en push_webhook_config).
import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { sendPushToUser } from '@/lib/push';
import { secretMatches } from '@/lib/security/secrets';
import { safeRedirect } from '@/lib/security/policy';

export async function POST(req: Request) {
  const admin = adminClient();
  const { data: cfg } = await admin
    .from('push_webhook_config')
    .select('webhook_secret, enabled')
    .eq('id', 1)
    .maybeSingle();

  if (!cfg?.enabled) return NextResponse.json({ ok: true, skipped: 'disabled' });

  const provided = req.headers.get('x-webhook-secret') ?? '';
  if (!secretMatches(provided, cfg.webhook_secret)) {
    return NextResponse.json({ error: 'invalid-secret' }, { status: 401 });
  }

  if (Number(req.headers.get('content-length') ?? 0)>65536) return NextResponse.json({error:'body-too-large'},{status:413});
  const body = await req.json().catch(() => null);
  if (!body || typeof body.perfil_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.perfil_id) || typeof body.title !== 'string' || !body.title || body.title.length>200 || String(body.body ?? '').length>4000) {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const r = await sendPushToUser(body.perfil_id, {
    title: String(body.title),
    body: String(body.body ?? ''),
    url: body.url ? safeRedirect(String(body.url), '/') : '/',
  });
  return NextResponse.json(r);
}
