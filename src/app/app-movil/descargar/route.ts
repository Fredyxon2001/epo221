import { NextResponse } from 'next/server';
import { APP_MOVIL } from '@/lib/app-movil';

export function GET() {
  const response = NextResponse.redirect(APP_MOVIL.artifactUrl, 307);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
