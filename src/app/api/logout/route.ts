// Endpoint universal de logout (GET y POST aceptados)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function logout(_req: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', _req.url));
}

export async function GET(req: NextRequest) { return logout(req); }
export async function POST(req: NextRequest) { return logout(req); }
