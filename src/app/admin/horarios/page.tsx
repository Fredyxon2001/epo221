// Carga horaria visual: grid semanal por grupo con las sesiones programadas.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/privado/ui';
import { codigoGrupoDesdeSemestre, labelGrupo } from '@/lib/grupos';
import { crearHorario, eliminarHorario, generarHorariosAutomaticos } from './actions';

const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HORAS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: { grupo_id?: string; ok?: string; error?: string };
}) {
  const supabase = createClient();

  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id, codigo').eq('activo', true).maybeSingle();
  const cicloId = ciclo?.id ?? '';

  const { data: grupos } = await supabase
    .from('grupos').select('id, semestre, grupo, grado, turno')
    .eq('ciclo_id', cicloId).order('semestre').order('grupo');

  const grupoSel = searchParams.grupo_id ?? grupos?.[0]?.id ?? '';

  const { data: asignaciones } = await supabase
    .from('asignaciones')
    .select('id, materia:materias(nombre, clave), profesor:profesores(nombre, apellido_paterno)')
    .eq('grupo_id', grupoSel);

  const asigIds = (asignaciones ?? []).map((a: any) => a.id);
  const { data: horarios } = asigIds.length
    ? await supabase.from('horarios').select('*').in('asignacion_id', asigIds).order('dia').order('hora_inicio')
    : { data: [] as any[] };

  // Matriz [dia][hora] = sesión
  const matriz: Record<number, Record<string, any>> = {};
  for (const h of horarios ?? []) {
    const dia = h.dia;
    const hi = String(h.hora_inicio).slice(0, 5);
    if (!matriz[dia]) matriz[dia] = {};
    const asig = (asignaciones ?? []).find((a: any) => a.id === h.asignacion_id);
    matriz[dia][hi] = { ...h, asig };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Académico"
        title="Carga horaria"
        description="Vista semanal por grupo con las sesiones programadas."
      />

      {searchParams.ok && <div className="rounded-lg bg-verde-claro/30 border border-verde/30 px-4 py-2 text-sm text-verde-oscuro">✓ {decodeURIComponent(searchParams.ok)}</div>}
      {searchParams.error && <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700">⚠ {decodeURIComponent(searchParams.error)}</div>}

      <Card eyebrow="Automatización" title="Generador de horarios">
        <p className="text-sm text-gray-600 mb-3">
          Genera el horario semanal de todos los grupos respetando las <strong>horas semestrales</strong> de cada materia
          (≈ horas_semestrales ÷ 18 por semana). Turno matutino: 07:00–14:00 con receso <strong>10:20–11:00</strong>.
          Turno vespertino: 14:00–20:20 con receso 16:40–17:20. Esto <u>reemplaza</u> los horarios actuales del ciclo.
        </p>
        <form action={generarHorariosAutomaticos}>
          <button className="bg-gradient-to-r from-verde to-verde-medio text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-lg">
            ⚙️ Generar horarios automáticamente
          </button>
        </form>
      </Card>

      <Card eyebrow="Filtros" title={`Ciclo ${ciclo?.codigo ?? '—'}`}>
        <form className="flex flex-wrap gap-3 items-center">
          <label className="text-sm text-gray-600">Grupo:</label>
          <select name="grupo_id" defaultValue={grupoSel} className="border rounded px-2 py-1 text-sm">
            {(grupos ?? []).map((g: any) => (
              <option key={g.id} value={g.id}>{labelGrupo(g)}</option>
            ))}
          </select>
          <button className="bg-verde text-white rounded px-3 py-1 text-sm hover:bg-verde-medio">Ver</button>
        </form>
      </Card>

      {!grupoSel ? (
        <Card><EmptyState icon="🏫" title="No hay grupos" description="Crea grupos en el ciclo activo primero." /></Card>
      ) : (
        <Card eyebrow="Semana" title="Cuadrícula horaria">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border-b border-r border-gray-200 bg-gray-50 text-left">Hora</th>
                  {[1,2,3,4,5,6].map((d) => (
                    <th key={d} className="p-2 border-b border-r border-gray-200 bg-gray-50 font-semibold">{DIAS[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HORAS.map((h) => (
                  <tr key={h}>
                    <td className="p-2 border-b border-r border-gray-200 font-mono text-gray-500">{h}</td>
                    {[1,2,3,4,5,6].map((d) => {
                      const sesion = matriz[d]?.[h];
                      return (
                        <td key={d} className="p-1 border-b border-r border-gray-100 align-top min-w-[120px]">
                          {sesion && (
                            <form action={eliminarHorario} className="group relative">
                              <input type="hidden" name="id" value={sesion.id} />
                              <div className="bg-gradient-to-br from-verde-claro/40 to-dorado/20 border border-verde/30 rounded-lg p-2 text-[11px] leading-tight">
                                <div className="font-semibold text-verde-oscuro truncate">{sesion.asig?.materia?.nombre ?? '—'}</div>
                                {sesion.asig?.profesor && (
                                  <div className="text-[10px] text-gray-600 truncate">{sesion.asig.profesor.apellido_paterno} {sesion.asig.profesor.nombre?.[0]}.</div>
                                )}
                                <div className="text-[10px] text-gray-500 flex justify-between mt-1">
                                  <span>{String(sesion.hora_inicio).slice(0,5)}–{String(sesion.hora_fin).slice(0,5)}</span>
                                  {sesion.aula && <span className="font-mono">· {sesion.aula}</span>}
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 absolute top-0.5 right-0.5 text-rose-500 text-xs">✕</button>
                              </div>
                            </form>
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

      <Card eyebrow="Agregar sesión" title="Programar clase">
        <form action={crearHorario} className="grid md:grid-cols-6 gap-2 text-sm">
          <input type="hidden" name="grupo_id" value={grupoSel} />
          <select name="asignacion_id" required className="border rounded px-2 py-1 md:col-span-2">
            <option value="">Materia…</option>
            {(asignaciones ?? []).map((a: any) => (
              <option key={a.id} value={a.id}>{a.materia?.nombre}</option>
            ))}
          </select>
          <select name="dia" required className="border rounded px-2 py-1">
            <option value="">Día…</option>
            {[1,2,3,4,5,6].map((d) => <option key={d} value={d}>{DIAS[d]}</option>)}
          </select>
          <input name="hora_inicio" type="time" required className="border rounded px-2 py-1" defaultValue="07:00" />
          <input name="hora_fin" type="time" required className="border rounded px-2 py-1" defaultValue="08:00" />
          <input name="aula" placeholder="Aula (opcional)" className="border rounded px-2 py-1" />
          <button className="bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio md:col-span-6">
            + Agregar sesión
          </button>
        </form>
      </Card>
    </div>
  );
}
