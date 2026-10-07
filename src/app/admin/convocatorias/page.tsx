import { requireIdentity } from "@/lib/security/access";
import { createClient } from '@/lib/supabase/server';
import { crearConvocatoria, eliminarConvocatoria } from './actions';
import { convocatoriaStatus, formatSchoolDate, schoolToday } from '@/lib/public-convocatorias';

export default async function AdminConvocatorias({ searchParams }: { searchParams: Promise<{ error?: string; resultado?: string }> }) {
  await requireIdentity(["admin","staff","director"]);

  const supabase = (await createClient());
  const { data: convocatorias, error: queryError } = await supabase
    .from('convocatorias')
    .select('*')
    .order('created_at', { ascending: false });

  const hoy = schoolToday();
  const params = await searchParams;
  const errors: Record<string, string> = {
    titulo: 'Escribe un título de 1 a 200 caracteres.',
    fechas: 'Las fechas deben ser válidas y la fecha final no puede ser anterior a la inicial.',
    archivo: 'El documento debe tener una URL HTTPS sin usuario ni contraseña.',
    guardar: 'No se pudo guardar la convocatoria. Intenta nuevamente.',
    eliminar: 'No se pudo eliminar la convocatoria. Recarga para comprobar su estado.',
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-verde">Convocatorias</h1>
        <p className="text-sm text-gray-500 mt-1">
          {queryError ? 'No se pudo consultar el registro.' : `${convocatorias?.length ?? 0} convocatorias registradas`}
        </p>
      </div>
      {params.error && errors[params.error] && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errors[params.error]}</p>}
      {params.resultado === 'creada' && <p role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-800">Convocatoria guardada. Será vigente dentro de las fechas indicadas.</p>}
      {params.resultado === 'eliminada' && <p role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-800">Convocatoria eliminada.</p>}

      <section className="bg-white rounded-lg p-5 shadow-xs">
        <h2 className="font-semibold text-verde mb-3">Nueva convocatoria</h2>
        <form action={crearConvocatoria} className="space-y-3 text-sm">
          <input
            name="titulo"
            aria-label="Título de la convocatoria"
            maxLength={200}
            placeholder="Título de la convocatoria"
            required
            className="w-full border rounded-sm px-3 py-2"
          />
          <textarea
            name="descripcion"
            aria-label="Descripción de la convocatoria"
            placeholder="Descripción (resumen del contenido, requisitos, etc.)"
            rows={4}
            className="w-full border rounded-sm px-3 py-2"
          />
          <input
            name="archivo_url"
            aria-label="URL HTTPS del documento"
            type="url"
            placeholder="URL del documento/archivo (opcional)"
            className="w-full border rounded-sm px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="convocatoria-desde" className="block text-xs text-gray-500 mb-1">Vigente desde</label>
              <input
                id="convocatoria-desde"
                name="vigente_desde"
                type="date"
                className="w-full border rounded-sm px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="convocatoria-hasta" className="block text-xs text-gray-500 mb-1">Vigente hasta</label>
              <input
                id="convocatoria-hasta"
                name="vigente_hasta"
                type="date"
                className="w-full border rounded-sm px-3 py-2"
              />
            </div>
          </div>
          <p className="text-xs text-gray-600">Horario de Ciudad de México. Incluye todo el último día; deja una fecha vacía para no establecer ese límite.</p>
          <button className="bg-verde text-white px-4 py-2 rounded-sm hover:bg-verde-medio">
            Publicar convocatoria
          </button>
        </form>
      </section>

      {queryError ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">No se pudieron cargar las convocatorias. Recarga esta página para intentarlo de nuevo.</p> : <section className="bg-white rounded-lg shadow-xs overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left p-3">Título</th>
              <th className="text-left p-3">Descripción</th>
              <th className="text-left p-3">Vigencia</th>
              <th className="text-center p-3">Estado</th>
              <th className="text-center p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(convocatorias ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  No hay convocatorias registradas.
                </td>
              </tr>
            )}
            {(convocatorias ?? []).map((c) => {
              const estado = convocatoriaStatus(c.vigente_desde, c.vigente_hasta, hoy);
              const vigente = estado === 'Vigente';
              return (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium max-w-xs">
                    {c.archivo_url ? (
                      <a
                        href={c.archivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-verde hover:underline"
                      >
                        {c.titulo}
                      </a>
                    ) : (
                      c.titulo
                    )}
                  </td>
                  <td className="p-3 text-gray-600 text-xs max-w-sm">
                    <span className="line-clamp-2">{c.descripcion ?? '—'}</span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {c.vigente_desde
                      ? formatSchoolDate(c.vigente_desde)
                      : '—'}
                    {' → '}
                    {c.vigente_hasta
                      ? formatSchoolDate(c.vigente_hasta)
                      : 'Sin fecha límite'}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        vigente
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {estado}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <form action={eliminarConvocatoria} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-xs text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>}
    </div>
  );
}
