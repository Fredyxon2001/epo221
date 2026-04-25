import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { crearPagina, eliminarPagina } from './actions';
import { ConfirmButton } from '@/components/ConfirmButton';

export default async function AdminPaginas() {
  const supabase = createClient();
  const { data: paginas } = await supabase
    .from('paginas_publicas')
    .select('*')
    .is('deleted_at', null)
    .order('orden')
    .order('titulo');

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/publico" className="text-xs text-gray-500 hover:underline">← Sitio público</Link>
          <h1 className="font-serif text-3xl text-verde mt-1">Páginas personalizadas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Páginas estáticas accesibles en <code className="text-xs bg-gray-100 px-1 rounded">/publico/p/[slug]</code>
          </p>
        </div>
        <details className="relative">
          <summary className="bg-verde text-white text-sm font-medium px-4 py-2 rounded cursor-pointer hover:bg-verde-medio list-none">
            + Nueva página
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-96 bg-white border rounded-lg shadow-lg p-4">
            <p className="font-semibold text-sm mb-3">Crear página</p>
            <form action={crearPagina} className="space-y-2 text-sm">
              <input name="titulo" required placeholder="Título (ej. Historia)" className="w-full border rounded px-2 py-1" />
              <input name="slug" required pattern="[a-z0-9][a-z0-9\-]*" placeholder="slug (ej. historia)" className="w-full border rounded px-2 py-1 font-mono text-xs" />
              <input name="orden" type="number" defaultValue="0" placeholder="Orden" className="w-full border rounded px-2 py-1" />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="publicada" defaultChecked /> Publicada
              </label>
              <button type="submit" className="w-full bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio text-xs">
                Crear y editar
              </button>
            </form>
          </div>
        </details>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600 border-b">
            <tr>
              <th className="text-left p-3">Título</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-center p-3">Orden</th>
              <th className="text-center p-3">Estado</th>
              <th className="text-center p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(paginas ?? []).map((p: any) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{p.titulo}</td>
                <td className="p-3 font-mono text-xs text-gray-500">{p.slug}</td>
                <td className="p-3 text-center text-xs">{p.orden}</td>
                <td className="p-3 text-center">
                  {p.publicada ? (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Publicada</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">Borrador</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <div className="inline-flex gap-3">
                    <Link href={`/admin/publico/paginas/${p.id}`} className="text-xs text-verde hover:underline">Editar</Link>
                    <Link href={`/publico/p/${p.slug}`} target="_blank" className="text-xs text-gray-500 hover:underline">Ver</Link>
                    <form action={eliminarPagina}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton message={`¿Eliminar la página "${p.titulo}"?`} className="text-xs text-red-600 hover:underline">
                        Eliminar
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(!paginas || paginas.length === 0) && (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400 text-sm">No hay páginas todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
