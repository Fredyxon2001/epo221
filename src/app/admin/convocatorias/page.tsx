import { createClient } from '@/lib/supabase/server';
import { crearConvocatoria, eliminarConvocatoria } from './actions';

export default async function AdminConvocatorias() {
  const supabase = createClient();
  const { data: convocatorias } = await supabase
    .from('convocatorias')
    .select('*')
    .order('created_at', { ascending: false });

  const hoy = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-verde">Convocatorias</h1>
        <p className="text-sm text-gray-500 mt-1">
          {convocatorias?.length ?? 0} convocatorias registradas
        </p>
      </div>

      <section className="bg-white rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold text-verde mb-3">Nueva convocatoria</h2>
        <form action={crearConvocatoria} className="space-y-3 text-sm">
          <input
            name="titulo"
            placeholder="Título de la convocatoria"
            required
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            name="descripcion"
            placeholder="Descripción (resumen del contenido, requisitos, etc.)"
            rows={4}
            className="w-full border rounded px-3 py-2"
          />
          <input
            name="archivo_url"
            type="url"
            placeholder="URL del documento/archivo (opcional)"
            className="w-full border rounded px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vigente desde</label>
              <input
                name="vigente_desde"
                type="date"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vigente hasta</label>
              <input
                name="vigente_hasta"
                type="date"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <button className="bg-verde text-white px-4 py-2 rounded hover:bg-verde-medio">
            Publicar convocatoria
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-sm overflow-hidden">
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
              const vigente =
                (!c.vigente_desde || c.vigente_desde <= hoy) &&
                (!c.vigente_hasta || c.vigente_hasta >= hoy);
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
                      ? new Date(c.vigente_desde).toLocaleDateString('es-MX')
                      : '—'}
                    {' → '}
                    {c.vigente_hasta
                      ? new Date(c.vigente_hasta).toLocaleDateString('es-MX')
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
                      {vigente ? 'Vigente' : 'Vencida'}
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
      </section>
    </div>
  );
}
