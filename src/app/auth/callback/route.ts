import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirect } from '@/lib/security/policy';
import { baseUrl } from '@/lib/base-url';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (code && code.length < 2000) {
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeRedirect(req.nextUrl.searchParams.get('next') ?? '', '/cambiar-password'), baseUrl()));
  }
  return NextResponse.redirect(new URL('/recuperar?error=enlace', baseUrl()));
}
