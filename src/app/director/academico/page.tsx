// Vista académica institucional: promedios por grupo y rendimiento docente.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState, StatCard } from '@/components/privado/ui';
import { DataTable } from '@/components/privado/DataTable';
import { codigoGrupo } from '@/lib/grupos';

export default async function DirAcademico() {
  const supabase = createClient();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('*').eq('activo', true).maybeSingle();

  // Resumen grupos con promedio real (vista_promedios_semestre es por alumno;
  // aquí agregamos manualmente a partir de calificaciones promedio_final).
  const { data: grupos } = ciclo
    ? await supabase.from('grupos').select('id, semestre, grupo, turno').eq('ciclo_id', ciclo.id).order('semestre').order('grupo')
    : { data: [] as any[] };

  const resumenGrupos: any[] = [];
  if (grupos && grupos.length) {
    for (const g of grupos) {
      // Asignaciones del grupo en el ciclo
      const { data: asigs } = await supabase.from('asignaciones').select('id').eq('grupo_id', g.id).eq('ciclo_id', ciclo!.id);
      const asigIds = (asigs ?? []).map((a: any) => a.id);
      if (!asigIds.length) { resumenGrupos.push({ ...g, promedio: null, inscritos: 0, aprobadas: 0, reprobadas: 0 }); continue; }

      const { data: cals } = await supabase
        .from('calificaciones').select('promedio_final').in('asignacion_id', asigIds).not('promedio_final', 'is', null);
      const finals = (cals ?? []).map((c: any) => Number(c.promedio_final));
      const prom = finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : null;
      const aprobadas = finals.filter((n) => n >= 6).length;
      const reprobadas = finals.filter((n) => n < 6).length;

      const { count: inscritos } = await supabase.from('inscripciones').select('*', { count: 'exact', head: true })
        .eq('grupo_id', g.id).eq('ciclo_id', ciclo!.id).eq('estatus', 'activa');

      resumenGrupos.push({ ...g, promedio: prom, inscritos: inscritos ?? 0, aprobadas, reprobadas });
    }
  }

  // KPIs institucionales
  const todosProm = resumenGrupos.map((g) => g.promedio).filter((x) => x != null) as number[];
  const promEscuela = todosProm.length ? (todosProm.reduce((a, b) => a + b, 0) / todosProm.length) : null;
  const totalAprob = resumenGrupos.reduce((a, g) => a + g.aprobadas, 0);
  const totalRep = resumenGrupos.reduce((a, g) => a + g.reprobadas, 0);
  const tasaAprob = (totalAprob + totalRep) > 0 ? Math.round(totalAprob / (totalAprob + totalRep) * 100) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Académico"
        title="Rendimiento institucional"
        description={ciclo ? `Ciclo ${ciclo.codigo} · ${ciclo.periodo}` : 'Sin ciclo activo'}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Promedio escuela" value={promEscuela != null ? promEscuela.toFixed(2) : '—'} icon="📐" tone="verde" hint="Entre todos los grupos" />
        <StatCard label="Tasa aprobación" value={tasaAprob != null ? `${tasaAprob}%` : '—'} icon="✅" tone="dorado" />
        <StatCard label="Calif. aprobadas" value={totalAprob} icon="🌟" tone="azul" />
        <StatCard label="Calif. reprobadas" value={totalRep} icon="⚠️" tone={totalRep > 0 ? 'rosa' : 'slate'} />
      </div>

      <Card eyebrow="Por grupo" title="Promedios del ciclo">
        {resumenGrupos.length === 0 ? (
          <EmptyState icon="📭" title="Sin datos" description="No hay grupos o calificaciones en el ciclo activo." />
        ) : (
          <DataTable
            rowKey={(r: any) => r.id}
            rows={resumenGrupos}
            columns={[
              { key: 'grupo', label: 'Grupo', render: (g: any) => <span className="font-semibold">{codigoGrupo(Math.ceil(g.semestre / 2), g.grupo)} <span className="text-[11px] text-gray-500 capitalize">· {g.semestre}° · {g.turno}</span></span> },
              { key: 'inscritos', label: 'Inscritos', align: 'center' },
              { key: 'aprobadas', label: 'Aprobadas', align: 'center', render: (g: any) => <span className="text-verde font-semibold">{g.aprobadas}</span> },
              { key: 'reprobadas', label: 'Reprob.', align: 'center', render: (g: any) => g.reprobadas > 0 ? <span className="text-rose-600 font-semibold">{g.reprobadas}</span> : '0' },
              {
                key: 'promedio', label: 'Promedio', align: 'right',
                render: (g: any) => {
                  if (g.promedio == null) return <span className="text-gray-400">—</span>;
                  const tone = g.promedio >= 8 ? 'verde' : g.promedio >= 6 ? 'dorado' : 'rosa';
                  return (
                    <div className="inline-flex items-center gap-2">
                      <span className="font-serif text-lg text-verde-oscuro tabular-nums">{Number(g.promedio).toFixed(2)}</span>
                      <Badge tone={tone as any} size="sm">{g.promedio >= 8 ? 'Excelente' : g.promedio >= 6 ? 'Bien' : 'Crítico'}</Badge>
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
