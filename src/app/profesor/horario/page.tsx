// Horario semanal del profesor con todas sus sesiones en grupos distintos.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/privado/ui';
import { codigoGrupoDesdeSemestre } from '@/lib/grupos';
import { redirect } from 'next/navigation';

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HORAS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

export default async function ProfesorHorario() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profesor } = await supabase
    .from('profesores').select('id, nombre, apellido_paterno').eq('perfil_id', user.id).maybeSingle();
  if (!profesor) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Docencia" title="Mi horario" />
        <Card><EmptyState icon="👨‍🏫" title="Sin ficha docente" description="Tu cuenta no tiene perfil de profesor vinculado." /></Card>
      </div>
    );
  }

  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id, codigo').eq('activo', true).maybeSingle();

  const { data: asigs } = await supabase
    .from('asignaciones')
    .select('id, materia:materias(nombre), grupo:grupos(id, grado, semestre, grupo, turno)')
    .eq('profesor_id', profesor.id)
    .eq('ciclo_id', ciclo?.id ?? '');

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

  const totalHoras = (horarios ?? []).length;
  const gruposUnicos = new Set((asigs ?? []).map((a: any) => a.grupo?.id)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Docencia"
        title="Mi horario semanal"
        description={`Ciclo ${ciclo?.codigo ?? '—'} · ${totalHoras} horas · ${gruposUnicos} grupos`}
      />

      {totalHoras === 0 ? (
        <Card><EmptyState icon="📅" title="Aún no tienes horario" description="El administrador aún no genera o asigna tus sesiones." /></Card>
      ) : (
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
                {HORAS.map((h) => (
                  <tr key={h}>
                    <td className="p-2 border-b border-r border-gray-200 font-mono text-gray-500">{h}</td>
                    {[1,2,3,4,5].map((d) => {
                      const sesion = matriz[d]?.[h];
                      return (
                        <td key={d} className="p-1 border-b border-r border-gray-100 align-top min-w-[130px]">
                          {sesion && (
                            <div className="bg-gradient-to-br from-verde-claro/40 to-dorado/20 border border-verde/30 rounded-lg p-2 text-[11px] leading-tight">
                              <div className="font-semibold text-verde-oscuro truncate">{sesion.asig?.materia?.nombre ?? '—'}</div>
                              {sesion.asig?.grupo && (
                                <div className="text-[10px] text-gray-600 truncate">
                                  {codigoGrupoDesdeSemestre(sesion.asig.grupo.semestre, sesion.asig.grupo.grupo)} · {sesion.asig.grupo.turno}
                                </div>
                              )}
                              <div className="text-[10px] text-gray-500 flex justify-between mt-1">
                                <span>{String(sesion.hora_inicio).slice(0,5)}–{String(sesion.hora_fin).slice(0,5)}</span>
                                {sesion.aula && <span className="font-mono">· {sesion.aula}</span>}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
