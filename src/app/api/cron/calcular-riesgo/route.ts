import { cronAuthorized } from '@/lib/security/secrets';
import { NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { calcularRiesgoCiclo } from '@/lib/riesgo/score';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return new Response('Unauthorized', { status: 401 });
  try {
    const client = adminClient();
    const { data: ciclo, error } = await client.from('ciclos_escolares').select('id,codigo').eq('activo', true).maybeSingle();
    if (error) throw error;
    if (!ciclo) return Response.json({ ok: true, total: 0, mensaje: 'Sin ciclo activo' });
    const resultados = await calcularRiesgoCiclo(client, ciclo.id);
    const saved = await client.rpc('security_save_risk_run', { p_cycle: ciclo.id, p_rows: resultados, p_origin: 'cron_reglas' });
    if (saved.error) throw saved.error;
    return Response.json({ ok: true, ciclo: ciclo.codigo, total: resultados.length, ...saved.data,
      distribucion: Object.fromEntries(['critico','alto','medio','bajo'].map(n => [n, resultados.filter(r => r.nivel === n).length])) });
  } catch {
    return Response.json({ ok: false, error: 'No se pudo completar el cálculo. No se guardaron resultados parciales.' }, { status: 500 });
  }
}
