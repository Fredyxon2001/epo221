import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no-auth' }, { status: 401 });
  const body = await req.json();
  if (!body?.endpoint || !body?.p256dh || !body?.auth)
    return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      perfil_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      user_agent: body.user_agent ?? null,
    }, { onConflict: 'endpoint' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
