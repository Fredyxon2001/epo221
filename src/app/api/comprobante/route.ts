// Devuelve URL firmada temporal para un comprobante de pago.
// Solo admin (verificado por RLS del bucket).
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path requerido' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('comprobantes')
    .createSignedUrl(path, 300);

  if (error || !data) return NextResponse.json({ error: 'no autorizado' }, { status: 403 });
  return NextResponse.redirect(data.signedUrl);
}
