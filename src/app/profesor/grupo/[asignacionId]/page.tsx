// Captura de calificaciones por grupo.
import { createClient } from '@/lib/supabase/server';
import { guardarCalificaciones, exportarCSV } from './actions';
import { codigoGrupo } from '@/lib/grupos';

export default async function CapturaGrupo({ params }: { params: { asignacionId: string } }) {
  const supabase = createClient();

  const { data: asig } = await supabase
    .from('asignaciones')
    .select(`
      id, grupo_id, ciclo_id,
      materia:materias(nombre, semestre),
      grupo:grupos(grado, semestre, grupo, turno),
      ciclo:ciclos_escolares(codigo, periodo)
    `)
    .eq('id', params.asignacionId).single();

  // Alumnos inscritos en ese grupo + ciclo
  const { data: alumnos } = await supabase
    .from('inscripciones')
    .select(`
      alumno:alumnos(id, curp, matricula, nombre, apellido_paterno, apellido_materno)
    `)
    .eq('grupo_id', (asig as any)?.grupo_id)
    .eq('ciclo_id', (asig as any)?.ciclo_id)
    .eq('estatus', 'activa');

  // Calificaciones existentes
  const ids = (alumnos ?? []).map((a: any) => a.alumno.id);
  const { data: califs } = await supabase
    .from('calificaciones').select('*')
    .eq('asignacion_id', params.asignacionId)
    .in('alumno_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);

  const mapa = new Map((califs ?? []).map((c: any) => [c.alumno_id, c]));
  const m = asig as any;

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-verde">{m?.materia?.nombre}</h1>
          <div className="text-sm text-gray-600">
            Grupo {codigoGrupo(m?.grupo?.grado ?? Math.ceil((m?.grupo?.semestre ?? 1) / 2), m?.grupo?.grupo ?? 0)} · {m?.grupo?.semestre}° sem · {m?.ciclo?.codigo} {m?.ciclo?.periodo}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/profesor/grupo/${params.asignacionId}/analisis`} className="text-sm bg-white border border-verde text-verde px-3 py-2 rounded hover:bg-verde-claro/20">📊 Análisis</a>
          <a href={`/profesor/grupo/${params.asignacionId}/asistencia`} className="text-sm bg-white border border-verde text-verde px-3 py-2 rounded hover:bg-verde-claro/20">✅ Asistencia</a>
          <a href={`/profesor/grupo/${params.asignacionId}/bitacora`} className="text-sm bg-white border border-verde text-verde px-3 py-2 rounded hover:bg-verde-claro/20">📖 Bitácora</a>
          <form action={exportarCSV}>
            <input type="hidden" name="asignacion_id" value={params.asignacionId} />
            <button className="text-sm bg-verde text-white px-4 py-2 rounded hover:bg-verde-medio">
              ⬇ Exportar CSV
            </button>
          </form>
        </div>
      </div>

      <form action={guardarCalificaciones} className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <input type="hidden" name="asignacion_id" value={params.asignacionId} />
        <table className="w-full text-sm">
          <thead className="bg-verde text-white text-xs">
            <tr>
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">Alumno</th>
              <th className="p-2">P1</th>
              <th className="p-2">F1</th>
              <th className="p-2">P2</th>
              <th className="p-2">F2</th>
              <th className="p-2">P3</th>
              <th className="p-2">F3</th>
              <th className="p-2">E1</th>
              <th className="p-2">Folio E1</th>
            </tr>
          </thead>
          <tbody>
            {(alumnos ?? []).map((row: any, i: number) => {
              const a = row.alumno;
              const c: any = mapa.get(a.id) ?? {};
              return (
                <tr key={a.id} className="border-t">
                  <td className="p-2 text-gray-500">{i + 1}</td>
                  <td className="p-2">
                    <div className="font-medium">{a.apellido_paterno} {a.apellido_materno} {a.nombre}</div>
                    <div className="text-xs text-gray-500 font-mono">{a.curp}</div>
                    <input type="hidden" name={`alumno_${i}`} value={a.id} />
                  </td>
                  <Num name={`p1_${i}`} v={c.p1} />
                  <Num name={`f1_${i}`} v={c.faltas_p1} int />
                  <Num name={`p2_${i}`} v={c.p2} />
                  <Num name={`f2_${i}`} v={c.faltas_p2} int />
                  <Num name={`p3_${i}`} v={c.p3} />
                  <Num name={`f3_${i}`} v={c.faltas_p3} int />
                  <Num name={`e1_${i}`} v={c.e1} />
                  <td className="p-1">
                    <input name={`folio_${i}`} defaultValue={c.folio_e1 ?? ''} className="w-24 border rounded px-2 py-1 text-xs" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <input type="hidden" name="n" value={alumnos?.length ?? 0} />
        <div className="p-3 border-t flex justify-end">
          <button className="bg-verde text-white px-5 py-2 rounded hover:bg-verde-medio text-sm font-semibold">
            Guardar calificaciones
          </button>
        </div>
      </form>
    </div>
  );
}

function Num({ name, v, int = false }: { name: string; v?: number; int?: boolean }) {
  return (
    <td className="p-1">
      <input
        name={name}
        type="number"
        step={int ? 1 : 0.01}
        min={0}
        max={int ? undefined : 10}
        defaultValue={v ?? ''}
        className="w-16 border rounded px-2 py-1 text-center"
      />
    </td>
  );
}
