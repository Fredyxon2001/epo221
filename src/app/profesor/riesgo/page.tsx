// Panel de alumnos en riesgo académico para el profesor: promedio bajo + faltas altas.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge, StatCard } from '@/components/privado/ui';
import { codigoGrupoDesdeSemestre } from '@/lib/grupos';
import Link from 'next/link';

export default async function AlumnosEnRiesgo() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profesor } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();

  const { data: asigs } = await supabase
    .from('asignaciones')
    .select(`
      id, materia:materias(nombre),
      grupo:grupos(id, semestre, grupo, turno),
      ciclo:ciclos_escolares(id, activo)
    `)
    .eq('profesor_id', profesor?.id ?? '');

  const activas = ((asigs ?? []) as any[]).filter((a) => a.ciclo?.activo);

  const filas: any[] = [];
  for (const a of activas) {
    const { data: califs } = await supabase
      .from('calificaciones')
      .select('alumno_id, promedio_final, p1, p2, p3, faltas_p1, faltas_p2, faltas_p3, alumno:alumnos(nombre, apellido_paterno, apellido_materno, matricula)')
      .eq('asignacion_id', a.id);

    for (const c of califs ?? []) {
      const prom = Number(c.promedio_final ?? 0);
      const faltas = (c.faltas_p1 ?? 0) + (c.faltas_p2 ?? 0) + (c.faltas_p3 ?? 0);
      const p1 = Number(c.p1 ?? 0), p2 = Number(c.p2 ?? 0), p3 = Number(c.p3 ?? 0);
      const bajoActual = [p1, p2, p3].some((p) => p > 0 && p < 6);
      if ((prom > 0 && prom < 7) || faltas > 15 || bajoActual) {
        const razones: string[] = [];
        if (prom > 0 && prom < 7) razones.push(`Promedio ${prom.toFixed(1)}`);
        if (faltas > 15) razones.push(`${faltas} faltas`);
        else if (faltas > 10) razones.push(`${faltas} faltas ⚠`);
        if (bajoActual) razones.push('Parcial < 6');
        filas.push({
          alumno: (c as any).alumno,
          alumno_id: c.alumno_id,
          materia: a.materia?.nombre,
          grupo: a.grupo,
          asignacion_id: a.id,
          prom,
          faltas,
          razones,
          nivel: (prom > 0 && prom < 6) || faltas > 15 ? 'danger' : 'warning',
        });
      }
    }
  }

  filas.sort((a, b) => a.prom - b.prom);

  const criticos = filas.filter((f) => f.nivel === 'danger').length;
  const advertencia = filas.filter((f) => f.nivel === 'warning').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seguimiento"
        title="Alumnos en riesgo"
        description="Detección automática por bajo promedio o faltas acumuladas en tus materias del ciclo activo."
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total en riesgo" value={filas.length} icon="⚠️" tone="rosa" />
        <StatCard label="Críticos" value={criticos} icon="🚨" tone="rosa" hint="Promedio < 6 o > 15 faltas" />
        <StatCard label="Advertencia" value={advertencia} icon="⚡" tone="dorado" />
      </div>

      <Card eyebrow="Detalle" title={filas.length ? `${filas.length} casos` : 'Todo en orden'}>
        {filas.length === 0 ? (
          <EmptyState icon="✨" title="Sin alumnos en riesgo" description="Todos tus alumnos van bien." />
        ) : (
          <div className="space-y-2">
            {filas.map((f, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${f.nivel === 'danger' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${f.nivel === 'danger' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                  {f.nivel === 'danger' ? '🚨' : '⚠'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{f.alumno?.apellido_paterno} {f.alumno?.apellido_materno ?? ''} {f.alumno?.nombre}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {f.materia} · Grupo {codigoGrupoDesdeSemestre(f.grupo?.semestre ?? 1, f.grupo?.grupo ?? 0)}
                  </div>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {f.razones.map((r: string, j: number) => (
                      <Badge key={j} tone={f.nivel === 'danger' ? 'rosa' : 'ambar'} size="sm">{r}</Badge>
                    ))}
                  </div>
                </div>
                <Link href={`/profesor/grupo/${f.asignacion_id}`} className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 shrink-0">
                  Abrir →
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
