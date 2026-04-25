// Dashboard por generación: tasa de aprobación, deserción, promedios históricos,
// alumnos en riesgo y faltas acumuladas — agrupado por "2025-2028", "2024-2027", etc.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, StatCard, Badge, EmptyState } from '@/components/privado/ui';
import { DataTable } from '@/components/privado/DataTable';
import Link from 'next/link';

export default async function GeneracionesDashboard() {
  const supabase = createClient();

  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, nombre, apellido_paterno, apellido_materno, generacion, estatus')
    .is('deleted_at', null)
    .limit(5000);

  const { data: califs } = await supabase
    .from('calificaciones')
    .select('alumno_id, promedio_final, faltas_p1, faltas_p2, faltas_p3');

  // Agrupar por generación
  type Acum = {
    generacion: string;
    total: number;
    activos: number;
    bajas: number;
    egresados: number;
    promedios: number[];
    reprobadas: number;
    aprobadas: number;
    faltasTotales: number;
    alumnosRiesgo: Set<string>;
  };

  const porGen = new Map<string, Acum>();
  for (const a of alumnos ?? []) {
    const gen = a.generacion || 'Sin generación';
    if (!porGen.has(gen)) {
      porGen.set(gen, {
        generacion: gen, total: 0, activos: 0, bajas: 0, egresados: 0,
        promedios: [], reprobadas: 0, aprobadas: 0, faltasTotales: 0,
        alumnosRiesgo: new Set(),
      });
    }
    const acc = porGen.get(gen)!;
    acc.total++;
    if (a.estatus === 'activo') acc.activos++;
    else if (a.estatus === 'baja' || a.estatus === 'baja_temporal') acc.bajas++;
    else if (a.estatus === 'egresado' || a.estatus === 'titulado') acc.egresados++;
  }

  // Asociar calificaciones con generación del alumno
  const alumnoGen = new Map((alumnos ?? []).map((a: any) => [a.id, a.generacion || 'Sin generación']));
  for (const c of califs ?? []) {
    const gen = alumnoGen.get(c.alumno_id);
    if (!gen || !porGen.has(gen)) continue;
    const acc = porGen.get(gen)!;
    const pf = Number(c.promedio_final ?? 0);
    if (pf > 0) {
      acc.promedios.push(pf);
      if (pf >= 7) acc.aprobadas++;
      else acc.reprobadas++;
      if (pf < 7) acc.alumnosRiesgo.add(c.alumno_id);
    }
    acc.faltasTotales += (c.faltas_p1 ?? 0) + (c.faltas_p2 ?? 0) + (c.faltas_p3 ?? 0);
  }

  const filas = Array.from(porGen.values())
    .map((a) => ({
      ...a,
      promedio: a.promedios.length ? a.promedios.reduce((x, y) => x + y, 0) / a.promedios.length : 0,
      tasaAprobacion: (a.aprobadas + a.reprobadas) ? (a.aprobadas / (a.aprobadas + a.reprobadas)) * 100 : 0,
      tasaDesercion: a.total ? (a.bajas / a.total) * 100 : 0,
      enRiesgo: a.alumnosRiesgo.size,
    }))
    .sort((a, b) => b.generacion.localeCompare(a.generacion));

  const totalAlumnos = filas.reduce((s, f) => s + f.total, 0);
  const totalActivos = filas.reduce((s, f) => s + f.activos, 0);
  const totalRiesgo = filas.reduce((s, f) => s + f.enRiesgo, 0);
  const promGlobal = filas.length
    ? filas.filter((f) => f.promedios.length).reduce((s, f) => s + f.promedio, 0) /
      Math.max(1, filas.filter((f) => f.promedios.length).length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analítica institucional"
        title="Dashboard por generación"
        description="Tasa de aprobación, deserción y promedios históricos agrupados por generación."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Alumnos totales" value={totalAlumnos} icon="🎓" tone="verde" />
        <StatCard label="Activos" value={totalActivos} icon="✅" tone="azul" />
        <StatCard label="En riesgo" value={totalRiesgo} icon="⚠️" tone="rosa" hint="Con al menos una materia < 7" />
        <StatCard label="Prom. global" value={promGlobal.toFixed(2)} icon="📊" tone="dorado" />
      </div>

      <Card eyebrow="Por generación" title="Indicadores históricos">
        {filas.length === 0 ? (
          <EmptyState icon="📭" title="Sin datos" description="Aún no hay alumnos con generación asignada." />
        ) : (
          <DataTable
            rowKey={(r: any) => r.generacion}
            rows={filas}
            columns={[
              { key: 'generacion', label: 'Generación', render: (r: any) => <span className="font-mono font-semibold">{r.generacion}</span> },
              { key: 'total', label: 'Total', align: 'center' },
              { key: 'activos', label: 'Activos', align: 'center', render: (r: any) => <span className="text-verde font-semibold">{r.activos}</span> },
              { key: 'bajas', label: 'Bajas', align: 'center', render: (r: any) => r.bajas > 0 ? <span className="text-rose-600">{r.bajas}</span> : '0' },
              { key: 'egresados', label: 'Egresados', align: 'center' },
              {
                key: 'promedio', label: 'Promedio', align: 'right',
                render: (r: any) => r.promedio > 0 ? (
                  <span className={`font-semibold ${r.promedio >= 8 ? 'text-verde' : r.promedio >= 7 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {r.promedio.toFixed(2)}
                  </span>
                ) : '—',
              },
              {
                key: 'tasaAprobacion', label: '% aprobación', align: 'right',
                render: (r: any) => (
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${r.tasaAprobacion >= 80 ? 'bg-verde' : r.tasaAprobacion >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, r.tasaAprobacion)}%` }} />
                    </div>
                    <span className="text-xs tabular-nums w-12 text-right">{r.tasaAprobacion.toFixed(0)}%</span>
                  </div>
                ),
              },
              {
                key: 'tasaDesercion', label: '% deserción', align: 'right',
                render: (r: any) => <span className={r.tasaDesercion > 10 ? 'text-rose-600 font-semibold' : 'text-gray-600'}>{r.tasaDesercion.toFixed(1)}%</span>,
              },
              {
                key: 'enRiesgo', label: 'En riesgo', align: 'center',
                render: (r: any) => r.enRiesgo > 0
                  ? <Badge tone="rosa" size="sm">{r.enRiesgo}</Badge>
                  : <span className="text-gray-400">0</span>,
              },
              {
                key: 'faltas', label: 'Faltas', align: 'right',
                render: (r: any) => <span className="text-xs text-gray-500 tabular-nums">{r.faltasTotales}</span>,
              },
            ]}
          />
        )}
      </Card>

      <Card eyebrow="Acciones" title="Seguimiento">
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <Link href="/admin/alertas" className="block p-4 rounded-xl border border-gray-200 hover:border-verde hover:shadow-md transition bg-white/70">
            <div className="text-2xl mb-1">🚨</div>
            <div className="font-semibold">Ver alertas activas</div>
            <div className="text-xs text-gray-500">Anomalías que requieren atención.</div>
          </Link>
          <Link href="/admin/alumnos" className="block p-4 rounded-xl border border-gray-200 hover:border-verde hover:shadow-md transition bg-white/70">
            <div className="text-2xl mb-1">🎓</div>
            <div className="font-semibold">Directorio de alumnos</div>
            <div className="text-xs text-gray-500">Editar generación y estatus individual.</div>
          </Link>
          <Link href="/admin/grupos" className="block p-4 rounded-xl border border-gray-200 hover:border-verde hover:shadow-md transition bg-white/70">
            <div className="text-2xl mb-1">🏫</div>
            <div className="font-semibold">Grupos y promoción</div>
            <div className="text-xs text-gray-500">Promover o crear grupos masivamente.</div>
          </Link>
        </div>
      </Card>
    </div>
  );
}
