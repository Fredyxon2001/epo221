import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/security/policy';
import { authCookieOptions } from '@/lib/supabase/cookie-options';
import { bestEffortRemoteLogout, localLogoutCookieNames } from '@/lib/supabase/local-logout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() { return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'private, no-store' } }); }
export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers.get('origin'), req.url) || (req.headers.get('sec-fetch-site') && req.headers.get('sec-fetch-site') !== 'same-origin')) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  const cookies = req.cookies.getAll();
  const response = NextResponse.redirect(new URL('/login', req.url), 303);
  response.headers.set('Cache-Control', 'private, no-store');
  for (const name of localLogoutCookieNames(cookies, process.env.NEXT_PUBLIC_SUPABASE_URL!)) response.cookies.set(name, '', { ...authCookieOptions, maxAge: 0 });
  await bestEffortRemoteLogout(cookies, process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { signal: req.signal });
  return response;
}
