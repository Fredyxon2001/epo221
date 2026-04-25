// Calificaciones detalladas + solicitud de revisión por materia/parcial.
import { getAlumnoActual } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { SolicitudRevisionButton } from './SolicitudRevisionButton';

type CalRow = {
  id: string;
  asignacion_id: string;
  p1: number | null; p2: number | null; p3: number | null;
  faltas_p1: number | null; faltas_p2: number | null; faltas_p3: number | null;
  e1: number | null; e2: number | null; e3: number | null; e4: number | null;
  promedio_final: number | null;
  asignacion: {
    id: string;
    ciclo: { codigo: string; periodo: string } | null;
    materia: { nombre: string; semestre: number } | null;
    profesor: { perfil: { nombre: string } | null } | null;
  } | null;
};

export default async function Calificaciones() {
  const alumno = (await getAlumnoActual())!;
  const supabase = createClient();

  const { data } = await supabase
    .from('calificaciones')
    .select(`
      id, asignacion_id,
      p1, p2, p3, faltas_p1, faltas_p2, faltas_p3,
      e1, e2, e3, e4, promedio_final,
      asignacion:asignaciones(
        id,
        ciclo:ciclos_escolares(codigo, periodo),
        materia:materias(nombre, semestre),
        profesor:profesores(perfil:perfiles(nombre))
      )
    `)
    .eq('alumno_id', alumno.id);

  const rows = (data ?? []) as unknown as CalRow[];

  // Mis solicitudes activas (para marcar los botones)
  const { data: mias } = await supabase
    .from('solicitudes_revision')
    .select('asignacion_id, parcial, estado')
    .eq('alumno_id', alumno.id)
    .in('estado', ['abierta', 'respondida', 'aceptada']);

  const solicSet = new Set<string>((mias ?? []).map((s: any) => `${s.asignacion_id}::${s.parcial ?? ''}`));

  // Agrupar por ciclo
  const grupos: Record<string, CalRow[]> = {};
  for (const r of rows) {
    const key = r.asignacion?.ciclo
      ? `${r.asignacion.ciclo.codigo} · ${r.asignacion.ciclo.periodo}`
      : 'Sin ciclo';
    (grupos[key] ??= []).push(r);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Historial"
        title="Mis calificaciones"
        description="Revisa parciales y extraordinarios. Si algo no cuadra, solicita una revisión directamente al docente."
      />

      {rows.length === 0 && (
        <Card>
          <EmptyState
            icon="📚"
            title="Aún no hay calificaciones"
            description="Cuando tus profesores capturen tus calificaciones aparecerán aquí."
          />
        </Card>
      )}

      {Object.entries(grupos).map(([ciclo, materias]) => (
        <Card key={ciclo} eyebrow="Ciclo" title={ciclo}>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.22em] text-gray-500 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold">Materia</th>
                  <th className="text-center px-2 py-2 font-semibold">P1</th>
                  <th className="text-center px-2 py-2 font-semibold">P2</th>
                  <th className="text-center px-2 py-2 font-semibold">P3</th>
                  <th className="text-center px-2 py-2 font-semibold hidden md:table-cell">Extra</th>
                  <th className="text-center px-2 py-2 font-semibold hidden md:table-cell">Faltas</th>
                  <th className="text-right px-3 py-2 font-semibold">Final</th>
                  <th className="text-center px-3 py-2 font-semibold">Revisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materias.map((m) => {
                  const extras = [m.e1, m.e2, m.e3, m.e4].filter((x) => x != null && x > 0) as number[];
                  const faltas = (m.faltas_p1 ?? 0) + (m.faltas_p2 ?? 0) + (m.faltas_p3 ?? 0);
                  const final = m.promedio_final != null ? Number(m.promedio_final) : null;
                  const aprobado = final != null && final >= 6;
                  const mat = m.asignacion?.materia;
                  const prof = (m.asignacion?.profesor as any)?.perfil?.nombre ?? '—';
                  const parciales = [
                    { n: 1, v: m.p1 },
                    { n: 2, v: m.p2 },
                    { n: 3, v: m.p3 },
                  ];
                  return (
                    <tr key={m.id} className="hover:bg-crema/50 transition">
                      <td className="px-3 py-3">
                        <div className="font-medium text-verde-oscuro">{mat?.nombre ?? '—'}</div>
                        <div className="text-[11px] text-gray-500">{prof} · Sem {mat?.semestre}°</div>
                      </td>
                      {parciales.map((p) => (
                        <td key={p.n} className="px-2 py-3 text-center">
                          {p.v != null ? (
                            <span className={`inline-flex items-center justify-center min-w-[2.4rem] px-2 py-1 rounded-lg font-semibold tabular-nums ${
                              Number(p.v) >= 6 ? 'bg-verde-claro/30 text-verde-oscuro' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {Number(p.v).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-3 text-center hidden md:table-cell">
                        {extras.length ? Math.max(...extras).toFixed(1) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-2 py-3 text-center hidden md:table-cell text-gray-600">{faltas}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="font-serif text-lg text-verde-oscuro tabular-nums">
                          {final != null ? final.toFixed(2) : '—'}
                        </div>
                        {final != null && (
                          <Badge tone={aprobado ? 'verde' : 'rosa'} size="sm">
                            {aprobado ? 'Aprobado' : 'Reprobado'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.asignacion?.id ? (
                          <SolicitudRevisionButton
                            asignacionId={m.asignacion.id}
                            materiaNombre={mat?.nombre ?? ''}
                            docente={prof}
                            parciales={parciales.map((p) => ({
                              n: p.n,
                              valor: p.v != null ? Number(p.v) : null,
                              yaSolicitado: solicSet.has(`${m.asignacion!.id}::${p.n}`),
                            }))}
                          />
                        ) : (
                          <span className="text-[11px] text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
