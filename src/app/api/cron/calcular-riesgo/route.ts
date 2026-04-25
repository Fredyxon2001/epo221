import { NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { calcularRiesgoCiclo } from '@/lib/riesgo/score';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel cron — autoriza con CRON_SECRET (header Authorization: Bearer …)
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = adminClient();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id, codigo').eq('activo', true).maybeSingle();
  if (!ciclo) return Response.json({ ok: false, error: 'Sin ciclo activo' }, { status: 200 });

  const resultados = await calcularRiesgoCiclo(supabase as any, ciclo.id);

  // Persistir snapshot
  if (resultados.length) {
    const rows = resultados.map((r) => ({
      alumno_id: r.alumno_id,
      ciclo_id: ciclo.id,
      score: r.score,
      nivel: r.nivel,
      factores: r.factores,
      recomendacion: r.recomendacion,
      generado_por: 'cron_reglas',
    }));
    const { error } = await supabase.from('riesgo_snapshots').insert(rows);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Notificar a orientadores cuando hay críticos nuevos
  const criticos = resultados.filter((r) => r.nivel === 'critico');
  if (criticos.length) {
    const ids = criticos.map((c) => c.alumno_id);
    const { data: insc } = await supabase
      .from('inscripciones')
      .select('alumno_id, grupo:grupos(orientador_id, grado, grupo)')
      .in('alumno_id', ids)
      .eq('ciclo_id', ciclo.id)
      .eq('estatus', 'activa');
    const porOrientador = new Map<string, number>();
    for (const i of insc ?? []) {
      const oid = (i as any).grupo?.orientador_id;
      if (oid) porOrientador.set(oid, (porOrientador.get(oid) ?? 0) + 1);
    }
    for (const [profId, count] of porOrientador.entries()) {
      const { data: prof } = await supabase.from('profesores').select('perfil_id').eq('id', profId).maybeSingle();
      if (prof?.perfil_id) {
        await supabase.from('notificaciones').insert({
          perfil_id: prof.perfil_id,
          titulo: '🚨 Alumnos en riesgo crítico',
          mensaje: `${count} alumno(s) de tus grupos requieren intervención urgente.`,
          url: '/profesor/riesgo',
        });
      }
    }
  }

  return Response.json({
    ok: true,
    ciclo: ciclo.codigo,
    total: resultados.length,
    distribucion: {
      critico: resultados.filter((r) => r.nivel === 'critico').length,
      alto: resultados.filter((r) => r.nivel === 'alto').length,
      medio: resultados.filter((r) => r.nivel === 'medio').length,
      bajo: resultados.filter((r) => r.nivel === 'bajo').length,
    },
  });
}
