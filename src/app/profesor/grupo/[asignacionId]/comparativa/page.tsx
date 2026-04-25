// Comparativa del grupo actual contra ciclos anteriores de la misma materia
// y mismo profesor (o misma materia, según tenga histórico).
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, StatCard, Badge } from '@/components/privado/ui';
import Link from 'next/link';

export default async function Comparativa({ params }: { params: { asignacionId: string } }) {
  const supabase = createClient();

  const { data: asigActual } = await supabase
    .from('asignaciones')
    .select('id, materia_id, profesor_id, ciclo_id, materia:materias(nombre), ciclo:ciclos_escolares(codigo, periodo, fecha_inicio)')
    .eq('id', params.asignacionId).single();
  if (!asigActual) return <EmptyState icon="🔍" title="Asignación no encontrada" />;

  // Buscar otras asignaciones del mismo profesor y misma materia (histórico personal)
  const { data: historicas } = await supabase
    .from('asignaciones')
    .select('id, ciclo:ciclos_escolares(id, codigo, periodo, fecha_inicio)')
    .eq('materia_id', (asigActual as any).materia_id)
    .eq('profesor_id', (asigActual as any).profesor_id);

  const todas = (historicas ?? []) as any[];
  todas.sort((a, b) => new Date(b.ciclo?.fecha_inicio ?? 0).getTime() - new Date(a.ciclo?.fecha_inicio ?? 0).getTime());

  // Cargar calificaciones de cada asignación y calcular estadísticas
  const stats = await Promise.all(
    todas.map(async (a) => {
      const { data: cs } = await supabase.from('calificaciones')
        .select('promedio_final, p1, p2, p3, faltas_p1, faltas_p2, faltas_p3')
        .eq('asignacion_id', a.id);
      const prom = (cs ?? []).map((c: any) => Number(c.promedio_final ?? 0)).filter((x) => x > 0);
      const avg = prom.length ? prom.reduce((x, y) => x + y, 0) / prom.length : 0;
      const aprob = prom.filter((p) => p >= 7).length;
      const rep = prom.filter((p) => p < 7 && p > 0).length;
      const faltas = (cs ?? []).reduce((s: number, c: any) => s + (c.faltas_p1 ?? 0) + (c.faltas_p2 ?? 0) + (c.faltas_p3 ?? 0), 0);
      return {
        asignacionId: a.id,
        ciclo: a.ciclo,
        total: cs?.length ?? 0,
        promedio: avg,
        aprobados: aprob,
        reprobados: rep,
        faltasTotales: faltas,
        tasaAprobacion: (aprob + rep) ? (aprob / (aprob + rep)) * 100 : 0,
        esActual: a.id === params.asignacionId,
      };
    }),
  );

  const actual = stats.find((s) => s.esActual);
  const anteriores = stats.filter((s) => !s.esActual);
  const promActual = actual?.promedio ?? 0;
  const promHistorico = anteriores.length
    ? anteriores.reduce((s, a) => s + a.promedio, 0) / anteriores.length
    : 0;
  const delta = promActual - promHistorico;

  const m = asigActual as any;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comparativa"
        title={m?.materia?.nombre}
        description={`Tu historial impartiendo esta materia — ${stats.length} ciclos registrados`}
        actions={<Link href={`/profesor/grupo/${params.asignacionId}`} className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Volver</Link>}
      />

      {stats.length <= 1 ? (
        <Card>
          <EmptyState icon="📈" title="Sin histórico" description="Necesitas al menos dos ciclos impartiendo esta materia para comparar." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Promedio actual" value={promActual.toFixed(2)} icon="🎯" tone="verde" />
            <StatCard
              label="Promedio histórico"
              value={promHistorico.toFixed(2)}
              icon="📊"
              tone="azul"
              hint={`${anteriores.length} ciclos previos`}
            />
            <StatCard
              label="Variación"
              value={`${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`}
              icon={delta >= 0 ? '📈' : '📉'}
              tone={delta >= 0 ? 'verde' : 'rosa'}
              delta={{ value: `${delta >= 0 ? '↑' : '↓'} vs. histórico`, positive: delta >= 0 }}
            />
            <StatCard
              label="Ciclos"
              value={stats.length}
              icon="🗓️"
              tone="dorado"
            />
          </div>

          <Card eyebrow="Tabla" title="Rendimiento por ciclo">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-500 border-b">
                  <tr>
                    <th className="text-left p-2">Ciclo</th>
                    <th className="text-center p-2">Alumnos</th>
                    <th className="text-right p-2">Promedio</th>
                    <th className="text-right p-2">% Aprobación</th>
                    <th className="text-right p-2">Faltas totales</th>
                    <th className="text-center p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.asignacionId} className={`border-b ${s.esActual ? 'bg-verde-claro/20 font-semibold' : ''}`}>
                      <td className="p-2">{s.ciclo?.codigo} <span className="text-xs text-gray-500">{s.ciclo?.periodo}</span></td>
                      <td className="p-2 text-center tabular-nums">{s.total}</td>
                      <td className="p-2 text-right">
                        <span className={`tabular-nums ${s.promedio >= 8 ? 'text-verde' : s.promedio >= 7 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {s.promedio > 0 ? s.promedio.toFixed(2) : '—'}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full">
                            <div className={`h-full rounded-full ${s.tasaAprobacion >= 80 ? 'bg-verde' : s.tasaAprobacion >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${s.tasaAprobacion}%` }} />
                          </div>
                          <span className="text-xs tabular-nums w-10 text-right">{s.tasaAprobacion.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="p-2 text-right tabular-nums text-gray-500">{s.faltasTotales}</td>
                      <td className="p-2 text-center">
                        {s.esActual && <Badge tone="verde">Actual</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card eyebrow="Lectura" title="Insights">
            <ul className="space-y-2 text-sm">
              {delta > 0.5 && <li>🎉 Este ciclo vas <strong>{delta.toFixed(2)}</strong> puntos arriba de tu histórico. Excelente trabajo.</li>}
              {delta < -0.5 && <li>⚠ Este ciclo vas <strong>{Math.abs(delta).toFixed(2)}</strong> puntos abajo. Considera revisar la estrategia.</li>}
              {actual && actual.tasaAprobacion < 70 && <li>📉 La tasa de aprobación ({actual.tasaAprobacion.toFixed(0)}%) está debajo del umbral recomendado.</li>}
              {actual && actual.tasaAprobacion > 90 && <li>✨ Tasa de aprobación sobresaliente: {actual.tasaAprobacion.toFixed(0)}%.</li>}
              {actual && actual.faltasTotales > 50 && <li>📅 Alto número de faltas acumuladas ({actual.faltasTotales}) — revisar asistencia.</li>}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
