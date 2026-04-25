import { createClient } from '@/lib/supabase/server';
import { crearAsignacion, actualizarProfesorAsignacion, eliminarAsignacion } from './actions';
import { codigoGrupoDesdeSemestre } from '@/lib/grupos';
import { ConfirmDeleteButton } from './ConfirmDelete';

const campoBadge: Record<number, string> = {
  8:  'bg-blue-100 text-blue-800',
  9:  'bg-emerald-100 text-emerald-800',
  10: 'bg-orange-100 text-orange-800',
  11: 'bg-purple-100 text-purple-800',
  12: 'bg-indigo-100 text-indigo-800',
  13: 'bg-cyan-100 text-cyan-800',
  14: 'bg-yellow-100 text-yellow-800',
  15: 'bg-pink-100 text-pink-800',
};

export default async function AdminAsignaciones({
  searchParams,
}: {
  searchParams: { ciclo_id?: string; semestre?: string };
}) {
  const supabase = createClient();

  // Datos base
  const [{ data: ciclos }, { data: profesores }, { data: materias }, { data: grupos }] =
    await Promise.all([
      supabase
        .from('ciclos_escolares')
        .select('*')
        .order('activo', { ascending: false })
        .order('codigo', { ascending: false }),
      supabase
        .from('profesores')
        .select('id, nombre, apellido_paterno')
        .eq('activo', true)
        .order('apellido_paterno'),
      supabase
        .from('materias')
        .select('id, nombre, semestre, campo_disciplinar_id, campo:campos_disciplinares(id, nombre)')
        .eq('activo', true)
        .order('semestre')
        .order('nombre'),
      supabase.from('grupos').select('*').order('semestre').order('grupo'),
    ]);

  const cicloActivo = ciclos?.find((c) => c.activo) ?? ciclos?.[0];
  const cicloId = searchParams.ciclo_id ?? cicloActivo?.id ?? '';
  const semestreFilter = searchParams.semestre ? Number(searchParams.semestre) : 0;

  // Asignaciones del ciclo seleccionado con joins
  let asigQuery = supabase
    .from('asignaciones')
    .select(`
      id,
      materia:materias(id, nombre, semestre, campo_disciplinar_id, campo:campos_disciplinares(nombre)),
      grupo:grupos(id, grado, semestre, grupo, turno),
      profesor:profesores(id, nombre, apellido_paterno),
      ciclo:ciclos_escolares(id, codigo, periodo)
    `)
    .order('created_at');

  if (cicloId) asigQuery = asigQuery.eq('ciclo_id', cicloId);

  const { data: asignaciones } = await asigQuery;

  // Filtrar por semestre si se pidió
  const filtradas =
    semestreFilter > 0
      ? (asignaciones ?? []).filter((a: any) => a.materia?.semestre === semestreFilter)
      : (asignaciones ?? []);

  const sinProfesor = filtradas.filter((a: any) => !a.profesor).length;

  // Grupos del ciclo activo para el formulario
  const gruposCiclo = (grupos ?? []).filter((g) => g.ciclo_id === cicloId);

  return (
    <div className="max-w-7xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-verde">Asignaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtradas.length} asignaciones
            {sinProfesor > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · ⚠️ {sinProfesor} sin profesor asignado
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg p-4 shadow-sm flex flex-wrap gap-4 items-end text-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ciclo escolar</label>
          <div className="flex gap-1 flex-wrap">
            {(ciclos ?? []).map((c) => (
              <a
                key={c.id}
                href={`/admin/asignaciones?ciclo_id=${c.id}${semestreFilter > 0 ? `&semestre=${semestreFilter}` : ''}`}
                className={`px-2 py-1 rounded text-xs border transition ${
                  cicloId === c.id
                    ? 'bg-verde text-white border-verde'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {c.codigo} {c.periodo}
                {c.activo ? ' ●' : ''}
              </a>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Semestre</label>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((s) => (
              <a
                key={s}
                href={`/admin/asignaciones?ciclo_id=${cicloId}${s > 0 ? `&semestre=${s}` : ''}`}
                className={`px-2 py-1 rounded-full text-xs border transition ${
                  semestreFilter === s
                    ? 'bg-verde text-white border-verde'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s === 0 ? 'Todos' : `${s}°`}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Formulario nueva asignación */}
      <section className="bg-white rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold text-verde mb-3">Nueva asignación</h2>
        <form action={crearAsignacion} className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <input type="hidden" name="ciclo_id" value={cicloId} />

          {/* Semestre → filtra materias en el cliente vía JS nativo no disponible; mostramos todas agrupadas */}
          <select name="materia_id" required className="border rounded px-2 py-1 col-span-1">
            <option value="">Materia…</option>
            {[1, 2, 3, 4, 5, 6].map((s) => {
              const mats = (materias ?? []).filter((m) => m.semestre === s);
              if (!mats.length) return null;
              return (
                <optgroup key={s} label={`${s}° Semestre`}>
                  {mats.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          <select name="grupo_id" required className="border rounded px-2 py-1">
            <option value="">Grupo…</option>
            {gruposCiclo.map((g) => (
              <option key={g.id} value={g.id}>
                {codigoGrupoDesdeSemestre(g.semestre, g.grupo)} · {g.semestre}° · {g.turno}
              </option>
            ))}
            {/* Si no hay grupos en el ciclo, mostrar todos */}
            {gruposCiclo.length === 0 &&
              (grupos ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {codigoGrupoDesdeSemestre(g.semestre, g.grupo)} · {g.semestre}° · {g.turno}
                </option>
              ))}
          </select>

          <select name="profesor_id" className="border rounded px-2 py-1">
            <option value="">Sin asignar</option>
            {(profesores ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.apellido_paterno} {p.nombre}
              </option>
            ))}
          </select>

          <button className="bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio col-span-1">
            Crear asignación
          </button>
        </form>
      </section>

      {/* Tabla de asignaciones */}
      <section className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left p-3">Sem.</th>
              <th className="text-left p-3">Materia</th>
              <th className="text-left p-3">Campo</th>
              <th className="text-left p-3">Grupo</th>
              <th className="text-left p-3">Profesor asignado</th>
              <th className="text-center p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  No hay asignaciones para este ciclo/semestre.
                </td>
              </tr>
            )}
            {filtradas.map((a: any) => {
              const sinProfe = !a.profesor;
              return (
                <tr
                  key={a.id}
                  className={`border-t ${sinProfe ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="p-3 text-center font-mono text-xs">
                    {a.materia?.semestre ?? '—'}
                  </td>
                  <td className="p-3 font-medium">
                    {sinProfe && (
                      <span className="mr-1 text-amber-500" title="Sin profesor">⚠️</span>
                    )}
                    {a.materia?.nombre ?? '—'}
                  </td>
                  <td className="p-3">
                    {a.materia?.campo ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          campoBadge[a.materia.campo_disciplinar_id] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {a.materia.campo.nombre}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    {a.grupo
                      ? `${codigoGrupoDesdeSemestre(a.grupo.semestre, a.grupo.grupo)} · ${a.grupo.turno}`
                      : '—'}
                  </td>
                  <td className="p-3">
                    {sinProfe ? (
                      <span className="text-amber-600 text-xs font-medium">Sin asignar</span>
                    ) : (
                      <span>
                        {a.profesor.apellido_paterno} {a.profesor.nombre}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      {/* Cambiar profesor inline */}
                      <details className="relative">
                        <summary className="text-xs text-verde hover:underline cursor-pointer list-none">
                          Cambiar
                        </summary>
                        <div className="absolute right-0 z-10 mt-1 w-56 bg-white border rounded-lg shadow-lg p-3">
                          <p className="text-xs font-semibold mb-2">Asignar profesor</p>
                          <form action={actualizarProfesorAsignacion} className="space-y-2">
                            <input type="hidden" name="id" value={a.id} />
                            <select
                              name="profesor_id"
                              defaultValue={a.profesor?.id ?? ''}
                              className="w-full border rounded px-2 py-1 text-xs"
                            >
                              <option value="">Sin asignar</option>
                              {(profesores ?? []).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.apellido_paterno} {p.nombre}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="w-full bg-verde text-white rounded px-2 py-1 text-xs hover:bg-verde-medio"
                            >
                              Guardar
                            </button>
                          </form>
                        </div>
                      </details>

                      <form action={eliminarAsignacion} className="inline">
                        <input type="hidden" name="id" value={a.id} />
                        <ConfirmDeleteButton />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
