import { createClient } from '@/lib/supabase/server';
import { actualizarMateria, eliminarMateria, crearMateria } from './actions';
import { ConfirmButton } from '@/components/ConfirmButton';

// Colores por campo disciplinar (id → clases Tailwind)
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

const tipoLabel: Record<string, string> = {
  obligatoria:  'Obligatoria',
  paraescolar:  'Paraescolar',
  capacitacion: 'Capacitación',
  optativa:     'Optativa',
};

export default async function AdminMaterias({
  searchParams,
}: {
  searchParams: { semestre?: string; campo?: string; q?: string };
}) {
  const supabase = createClient();

  const [{ data: materias }, { data: campos }] = await Promise.all([
    supabase
      .from('materias')
      .select('*, campo:campos_disciplinares(id, nombre)')
      .is('deleted_at', null)
      .order('semestre')
      .order('nombre'),
    supabase.from('campos_disciplinares').select('*').order('id'),
  ]);

  const semestreFilter = searchParams.semestre ? Number(searchParams.semestre) : 0;
  const campoFilter = searchParams.campo ? Number(searchParams.campo) : 0;
  const q = (searchParams.q ?? '').trim().toLowerCase();

  let filtradas = materias ?? [];
  if (semestreFilter > 0) filtradas = filtradas.filter((m) => m.semestre === semestreFilter);
  if (campoFilter > 0) filtradas = filtradas.filter((m) => m.campo_disciplinar_id === campoFilter);
  if (q) filtradas = filtradas.filter((m) => String(m.nombre).toLowerCase().includes(q));

  // Agrupar por semestre
  const porSemestre: Record<number, typeof filtradas> = {};
  for (const m of filtradas) {
    if (!porSemestre[m.semestre]) porSemestre[m.semestre] = [];
    porSemestre[m.semestre].push(m);
  }

  const totalCampos = new Set(
    (materias ?? []).map((m) => m.campo_disciplinar_id).filter(Boolean)
  ).size;

  // Helper para construir querystring conservando otros filtros
  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, any> = {
      semestre: semestreFilter > 0 ? semestreFilter : undefined,
      campo: campoFilter > 0 ? campoFilter : undefined,
      q: q || undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== '' && v !== 0) params.set(k, String(v));
    }
    const qs = params.toString();
    return `/admin/materias${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-verde">Materias</h1>
          <p className="text-sm text-gray-500 mt-1">
            {materias?.length ?? 0} materias · {totalCampos} campos disciplinares · Plan BGE 2025
          </p>
        </div>

        {/* Crear nueva */}
        <details className="relative">
          <summary className="bg-verde text-white text-sm font-medium px-4 py-2 rounded cursor-pointer hover:bg-verde-medio list-none">
            + Nueva materia
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-80 bg-white border rounded-lg shadow-lg p-4">
            <p className="font-semibold text-sm mb-3">Crear materia</p>
            <form action={crearMateria} className="space-y-2 text-sm">
              <input
                name="nombre"
                required
                className="w-full border rounded px-2 py-1"
                placeholder="Nombre de la materia"
              />
              <select name="semestre" required defaultValue="1" className="w-full border rounded px-2 py-1">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <option key={s} value={s}>{s}° Semestre</option>
                ))}
              </select>
              <select name="campo_disciplinar_id" className="w-full border rounded px-2 py-1">
                <option value="">Sin campo</option>
                {(campos ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <select name="tipo" defaultValue="obligatoria" className="w-full border rounded px-2 py-1">
                <option value="obligatoria">Obligatoria</option>
                <option value="paraescolar">Paraescolar</option>
                <option value="capacitacion">Capacitación</option>
                <option value="optativa">Optativa</option>
              </select>
              <input
                name="horas_semestrales"
                type="number"
                placeholder="Horas semestrales"
                className="w-full border rounded px-2 py-1"
              />
              <button
                type="submit"
                className="w-full bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio text-xs"
              >
                Crear materia
              </button>
            </form>
          </div>
        </details>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        {/* Búsqueda */}
        <form method="get" className="flex gap-2">
          {semestreFilter > 0 && <input type="hidden" name="semestre" value={semestreFilter} />}
          {campoFilter > 0 && <input type="hidden" name="campo" value={campoFilter} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre…"
            className="flex-1 border rounded px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="bg-verde text-white text-sm px-4 py-1.5 rounded hover:bg-verde-medio"
          >
            Buscar
          </button>
          {(q || semestreFilter > 0 || campoFilter > 0) && (
            <a
              href="/admin/materias"
              className="text-sm px-4 py-1.5 rounded border hover:bg-gray-50"
            >
              Limpiar
            </a>
          )}
        </form>

        {/* Tabs de semestre */}
        <div className="flex gap-1 flex-wrap">
          {[0, 1, 2, 3, 4, 5, 6].map((s) => (
            <a
              key={s}
              href={buildHref({ semestre: s > 0 ? s : undefined })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                semestreFilter === s
                  ? 'bg-verde text-white'
                  : 'bg-gray-50 text-gray-700 border hover:bg-gray-100'
              }`}
            >
              {s === 0 ? 'Todos los semestres' : `${s}°`}
            </a>
          ))}
        </div>

        {/* Tabs de campo disciplinar */}
        <div className="flex gap-1 flex-wrap">
          <a
            href={buildHref({ campo: undefined })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              campoFilter === 0
                ? 'bg-verde text-white'
                : 'bg-gray-50 text-gray-700 border hover:bg-gray-100'
            }`}
          >
            Todos los campos
          </a>
          {(campos ?? []).map((c) => (
            <a
              key={c.id}
              href={buildHref({ campo: c.id })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                campoFilter === c.id
                  ? 'bg-verde text-white'
                  : `${campoBadge[c.id] ?? 'bg-gray-100 text-gray-700'} hover:opacity-80`
              }`}
            >
              {c.nombre}
            </a>
          ))}
        </div>
      </div>

      {/* Resumen resultados */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Mostrando {filtradas.length} de {materias?.length ?? 0} materias
        </p>
        <a
          href={(() => {
            const p = new URLSearchParams();
            if (semestreFilter > 0) p.set('semestre', String(semestreFilter));
            if (campoFilter > 0) p.set('campo', String(campoFilter));
            if (q) p.set('q', q);
            const s = p.toString();
            return `/api/export/materias${s ? `?${s}` : ''}`;
          })()}
          className="text-xs text-verde hover:underline flex items-center gap-1"
        >
          📥 Exportar CSV
        </a>
      </div>

      {/* Tablas por semestre */}
      {Object.keys(porSemestre)
        .map(Number)
        .sort((a, b) => a - b)
        .map((sem) => (
          <section key={sem} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <header className="bg-verde px-4 py-2 text-white font-semibold text-sm">
              {sem}° Semestre — {porSemestre[sem].length} materias
            </header>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600 border-b">
                <tr>
                  <th className="text-left p-3">Materia</th>
                  <th className="text-left p-3">Campo disciplinar</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-center p-3">Horas sem.</th>
                  <th className="text-center p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {porSemestre[sem].map((m: any) => (
                  <tr key={m.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{m.nombre}</td>
                    <td className="p-3">
                      {m.campo ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            campoBadge[m.campo_disciplinar_id] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {m.campo.nombre}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      {tipoLabel[m.tipo] ?? m.tipo}
                    </td>
                    <td className="p-3 text-center font-mono text-xs">
                      {m.horas_semestrales ?? '—'}
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex gap-3">
                        <details className="relative inline-block">
                          <summary className="text-xs text-verde hover:underline cursor-pointer list-none">
                            Editar
                          </summary>
                          <div className="absolute right-0 z-10 mt-1 w-80 bg-white border rounded-lg shadow-lg p-4">
                            <p className="font-semibold text-sm mb-3">Editar materia</p>
                            <form action={actualizarMateria} className="space-y-2 text-sm">
                              <input type="hidden" name="id" value={m.id} />
                              <input
                                name="nombre"
                                defaultValue={m.nombre}
                                required
                                className="w-full border rounded px-2 py-1"
                                placeholder="Nombre de la materia"
                              />
                              <select
                                name="campo_disciplinar_id"
                                defaultValue={m.campo_disciplinar_id ?? ''}
                                className="w-full border rounded px-2 py-1"
                              >
                                <option value="">Sin campo</option>
                                {(campos ?? []).map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nombre}
                                  </option>
                                ))}
                              </select>
                              <select
                                name="tipo"
                                defaultValue={m.tipo}
                                className="w-full border rounded px-2 py-1"
                              >
                                <option value="obligatoria">Obligatoria</option>
                                <option value="paraescolar">Paraescolar</option>
                                <option value="capacitacion">Capacitación</option>
                                <option value="optativa">Optativa</option>
                              </select>
                              <input
                                name="horas_semestrales"
                                type="number"
                                defaultValue={m.horas_semestrales ?? ''}
                                placeholder="Horas semestrales"
                                className="w-full border rounded px-2 py-1"
                              />
                              <button
                                type="submit"
                                className="w-full bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio text-xs"
                              >
                                Guardar cambios
                              </button>
                            </form>
                          </div>
                        </details>

                        <form action={eliminarMateria}>
                          <input type="hidden" name="id" value={m.id} />
                          <ConfirmButton
                            message={`¿Eliminar la materia "${m.nombre}"? Esta acción se registra y puede revertirse desde la base de datos.`}
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Eliminar
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

      {filtradas.length === 0 && (
        <div className="bg-white rounded-lg p-10 text-center text-gray-400 shadow-sm">
          No hay materias para este filtro.
        </div>
      )}
    </div>
  );
}
