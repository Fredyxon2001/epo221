// Horario semanal del alumno, basado en su grupo activo.
import { Fragment } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/privado/ui';

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HORAS_MAT = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00'];
const HORAS_VES = ['14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

export default async function AlumnoHorario() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();

  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id, codigo').eq('activo', true).maybeSingle();

  const { data: ins } = await supabase
    .from('inscripciones')
    .select('grupo:grupos(id, grado, semestre, grupo, turno)')
    .eq('alumno_id', alumno.id).eq('ciclo_id', ciclo?.id ?? '').maybeSingle();

  const grupo: any = ins?.grupo;
  if (!grupo) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Académico" title="Mi horario" description="Vista semanal de tus clases." />
        <Card><EmptyState icon="📅" title="Sin grupo activo" description="No estás inscrito en un grupo del ciclo actual." /></Card>
      </div>
    );
  }

  const { data: asigs } = await supabase
    .from('asignaciones')
    .select('id, materia:materias(nombre), profesor:profesores(nombre, apellido_paterno)')
    .eq('grupo_id', grupo.id).eq('ciclo_id', ciclo!.id);

  const asigIds = (asigs ?? []).map((a: any) => a.id);
  const { data: horarios } = asigIds.length
    ? await supabase.from('horarios').select('*').in('asignacion_id', asigIds).order('dia').order('hora_inicio')
    : { data: [] as any[] };

  const matriz: Record<number, Record<string, any>> = {};
  for (const h of horarios ?? []) {
    const hi = String(h.hora_inicio).slice(0, 5);
    if (!matriz[h.dia]) matriz[h.dia] = {};
    const asig = (asigs ?? []).find((a: any) => a.id === h.asignacion_id);
    matriz[h.dia][hi] = { ...h, asig };
  }

  const esMat = grupo.turno !== 'vespertino';
  const HORAS = esMat ? HORAS_MAT : HORAS_VES;
  const recesoIni = esMat ? '10:20' : '16:40';
  const recesoFin = esMat ? '11:00' : '17:20';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Grupo ${grupo.semestre}° ${grupo.grupo} · ${grupo.turno}`}
        title="Mi horario"
        description={`Ciclo ${ciclo?.codigo ?? '—'} · receso ${recesoIni}–${recesoFin}`}
      />

      <Card eyebrow="Semana" title="Lunes a Viernes">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 border-b border-r border-gray-200 bg-gray-50 text-left">Hora</th>
                {[1,2,3,4,5].map((d) => (
                  <th key={d} className="p-2 border-b border-r border-gray-200 bg-gray-50 font-semibold">{DIAS[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORAS.map((h, idx) => {
                // Insertar fila de receso después de la 3ª hora
                const showReceso = idx === 3;
                return (
                  <Fragment key={h}>
                    {showReceso && (
                      <tr key={`receso-${h}`}>
                        <td className="p-2 border-b border-r border-gray-200 font-mono text-gray-500 bg-dorado/10">{recesoIni}</td>
                        <td colSpan={5} className="p-2 border-b border-r border-dorado/30 bg-gradient-to-r from-dorado/20 to-verde-claro/20 text-center font-semibold text-verde-oscuro">
                          🍎 RECESO · {recesoIni}–{recesoFin}
                        </td>
                      </tr>
                    )}
                    <tr key={h}>
                      <td className="p-2 border-b border-r border-gray-200 font-mono text-gray-500">{h}</td>
                      {[1,2,3,4,5].map((d) => {
                        const sesion = matriz[d]?.[h];
                        return (
                          <td key={d} className="p-1 border-b border-r border-gray-100 align-top min-w-[120px]">
                            {sesion ? (
                              <div className="bg-gradient-to-br from-verde-claro/40 to-dorado/20 border border-verde/30 rounded-lg p-2 text-[11px] leading-tight">
                                <div className="font-semibold text-verde-oscuro truncate">{sesion.asig?.materia?.nombre ?? '—'}</div>
                                {sesion.asig?.profesor && (
                                  <div className="text-[10px] text-gray-600 truncate">
                                    Prof. {sesion.asig.profesor.apellido_paterno} {sesion.asig.profesor.nombre?.[0]}.
                                  </div>
                                )}
                                <div className="text-[10px] text-gray-500 flex justify-between mt-1">
                                  <span>{String(sesion.hora_inicio).slice(0,5)}–{String(sesion.hora_fin).slice(0,5)}</span>
                                  {sesion.aula && <span className="font-mono">· {sesion.aula}</span>}
                                </div>
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
