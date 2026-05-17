// Endpoint admin/test para disparar un push manualmente.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushToUser, sendPushToUsers } from '@/lib/push';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no-auth' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.body) {
    return NextResponse.json({ error: 'title-body-requeridos' }, { status: 400 });
  }
  const payload = { title: body.title, body: body.body, url: body.url ?? '/' };

  // Si no se especifica destinatario, mandar a self
  if (Array.isArray(body.perfilIds) && body.perfilIds.length) {
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
    if (!['admin', 'staff', 'director'].includes(perfil?.rol ?? '')) {
      return NextResponse.json({ error: 'sin-permiso' }, { status: 403 });
    }
    const r = await sendPushToUsers(body.perfilIds, payload);
    return NextResponse.json(r);
  }
  const r = await sendPushToUser(user.id, payload);
  return NextResponse.json(r);
}
