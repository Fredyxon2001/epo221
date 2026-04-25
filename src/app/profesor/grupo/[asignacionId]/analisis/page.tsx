// Análisis estadístico del grupo: distribución, top/low, riesgo, evolución por parcial.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, StatCard, Badge, EmptyState } from '@/components/privado/ui';
import Link from 'next/link';

export default async function AnalisisGrupo({ params }: { params: { asignacionId: string } }) {
  const supabase = createClient();

  const { data: asig } = await supabase
    .from('asignaciones')
    .select(`
      id, grupo_id, ciclo_id,
      materia:materias(nombre, semestre),
      grupo:grupos(semestre, grupo, turno)
    `).eq('id', params.asignacionId).single();

  if (!asig) return <EmptyState icon="🔍" title="Asignación no encontrada" />;

  const { data: inscritos } = await supabase
    .from('inscripciones')
    .select('alumno:alumnos(id, nombre, apellido_paterno, apellido_materno)')
    .eq('grupo_id', (asig as any).grupo_id)
    .eq('ciclo_id', (asig as any).ciclo_id)
    .eq('estatus', 'activa');

  const ids = ((inscritos ?? []) as any[]).map((i) => i.alumno?.id).filter(Boolean);
  const mapaAlumno = new Map(((inscritos ?? []) as any[]).map((i) => [i.alumno?.id, i.alumno]));

  const { data: califs } = ids.length
    ? await supabase.from('calificaciones').select('*')
        .eq('asignacion_id', params.asignacionId).in('alumno_id', ids)
    : { data: [] as any[] };

  const filas = (califs ?? []);
  const prom = filas.map((c: any) => Number(c.promedio_final ?? 0)).filter((x) => x > 0);
  const promedio = prom.length ? prom.reduce((a, b) => a + b, 0) / prom.length : 0;
  const aprobados = filas.filter((c: any) => Number(c.promedio_final ?? 0) >= 7).length;
  const reprobados = filas.filter((c: any) => Number(c.promedio_final ?? 0) > 0 && Number(c.promedio_final ?? 0) < 7).length;
  const sinCapturar = ids.length - filas.filter((c: any) => Number(c.promedio_final ?? 0) > 0).length;

  // Distribución por rango
  const rangos = { '10': 0, '9': 0, '8': 0, '7': 0, 'reprobado': 0 };
  for (const c of filas) {
    const p = Number(c.promedio_final ?? 0);
    if (p >= 9.5) rangos['10']++;
    else if (p >= 8.5) rangos['9']++;
    else if (p >= 7.5) rangos['8']++;
    else if (p >= 7) rangos['7']++;
    else if (p > 0) rangos['reprobado']++;
  }

  // Top 5 y bottom 5
  const rank = filas
    .filter((c: any) => Number(c.promedio_final ?? 0) > 0)
    .map((c: any) => ({
      ...c,
      prom: Number(c.promedio_final ?? 0),
      alumno: mapaAlumno.get(c.alumno_id),
    }))
    .sort((a: any, b: any) => b.prom - a.prom);

  const top5 = rank.slice(0, 5);
  const bottom5 = rank.slice(-5).reverse();

  // Evolución por parcial (promedios)
  const parcial = (k: 'p1' | 'p2' | 'p3') => {
    const vals = filas.map((c: any) => Number(c[k] ?? 0)).filter((x) => x > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const evol = [
    { label: 'P1', valor: parcial('p1') },
    { label: 'P2', valor: parcial('p2') },
    { label: 'P3', valor: parcial('p3') },
  ];

  const maxRango = Math.max(...Object.values(rangos), 1);
  const m = asig as any;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Análisis del grupo"
        title={m?.materia?.nombre}
        description={`${m?.grupo?.semestre}° semestre · ${m?.grupo?.turno}`}
        actions={<Link href={`/profesor/grupo/${params.asignacionId}`} className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Captura de calificaciones</Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Inscritos" value={ids.length} icon="🎓" tone="verde" />
        <StatCard label="Promedio" value={promedio.toFixed(2)} icon="📊" tone="dorado" />
        <StatCard label="Aprobados" value={aprobados} icon="✅" tone="azul" hint={`${ids.length ? ((aprobados / ids.length) * 100).toFixed(0) : 0}%`} />
        <StatCard label="En riesgo" value={reprobados} icon="⚠️" tone="rosa" hint={sinCapturar > 0 ? `${sinCapturar} sin capturar` : undefined} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card eyebrow="Distribución" title="Calificaciones por rango">
          <div className="space-y-2">
            {[
              { k: '10', label: '9.5 – 10', tone: 'bg-verde' },
              { k: '9', label: '8.5 – 9.4', tone: 'bg-verde-medio' },
              { k: '8', label: '7.5 – 8.4', tone: 'bg-amber-400' },
              { k: '7', label: '7.0 – 7.4', tone: 'bg-amber-500' },
              { k: 'reprobado', label: '< 7', tone: 'bg-rose-500' },
            ].map((r) => (
              <div key={r.k} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-500 shrink-0">{r.label}</div>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${r.tone} flex items-center justify-end px-2`} style={{ width: `${((rangos as any)[r.k] / maxRango) * 100}%` }}>
                    {(rangos as any)[r.k] > 0 && <span className="text-[10px] font-bold text-white">{(rangos as any)[r.k]}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card eyebrow="Evolución" title="Promedio por parcial">
          <div className="flex items-end gap-6 justify-around h-40">
            {evol.map((p) => (
              <div key={p.label} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-sm font-bold text-verde-oscuro tabular-nums">{p.valor > 0 ? p.valor.toFixed(2) : '—'}</div>
                <div className="w-full bg-gradient-to-t from-verde to-verde-claro rounded-t-xl flex items-start justify-center shadow-lg shadow-verde/20" style={{ height: `${p.valor * 10}%` }} />
                <div className="text-xs font-semibold text-gray-600">{p.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card eyebrow="Top" title="🏆 Mejor rendimiento">
          {top5.length === 0 ? (
            <EmptyState icon="📭" title="Sin datos" description="Aún no hay calificaciones capturadas." />
          ) : (
            <ol className="space-y-2">
              {top5.map((r: any, i: number) => (
                <li key={r.alumno_id} className="flex items-center gap-3 p-2 rounded-lg bg-verde-claro/10 border border-verde/20">
                  <span className="w-8 h-8 rounded-full bg-verde text-white flex items-center justify-center font-bold text-sm">{i + 1}</span>
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-medium truncate">{r.alumno?.apellido_paterno} {r.alumno?.apellido_materno ?? ''} {r.alumno?.nombre}</div>
                  </div>
                  <Badge tone="verde">{r.prom.toFixed(1)}</Badge>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card eyebrow="Atención" title="⚠️ Requieren apoyo">
          {bottom5.length === 0 || bottom5.every((r: any) => r.prom >= 7) ? (
            <EmptyState icon="✨" title="¡Todo bien!" description="Ningún alumno en riesgo por el momento." />
          ) : (
            <ol className="space-y-2">
              {bottom5.filter((r: any) => r.prom < 7).map((r: any) => (
                <li key={r.alumno_id} className="flex items-center gap-3 p-2 rounded-lg bg-rose-50 border border-rose-200">
                  <span className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center">⚠</span>
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-medium truncate">{r.alumno?.apellido_paterno} {r.alumno?.apellido_materno ?? ''} {r.alumno?.nombre}</div>
                  </div>
                  <Badge tone="rosa">{r.prom.toFixed(1)}</Badge>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
