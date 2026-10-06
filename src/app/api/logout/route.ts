// Endpoint universal de logout (GET y POST aceptados)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sameOrigin } from '@/lib/security/policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function logout(_req: NextRequest) {
  const supabase = (await createClient());
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', _req.url));
}

export async function GET() { return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } }); }
export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers.get('origin'), req.url)) return new Response('Forbidden', { status: 403 });
  return logout(req);
}
