import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { crearAlbum, eliminarAlbum } from './actions';
import { ConfirmButton } from '@/components/ConfirmButton';

export default async function AdminAlbumes() {
  const supabase = createClient();
  const { data: albumes } = await supabase
    .from('albumes')
    .select('*, fotos:album_fotos(count)')
    .is('deleted_at', null)
    .order('fecha_evento', { ascending: false, nullsFirst: false });

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/publico" className="text-xs text-gray-500 hover:underline">← Sitio público</Link>
          <h1 className="font-serif text-3xl text-verde mt-1">Álbumes de fotos</h1>
          <p className="text-sm text-gray-500 mt-1">Galería pública en <code className="text-xs bg-gray-100 px-1 rounded">/publico/albumes</code></p>
        </div>
        <details className="relative">
          <summary className="bg-verde text-white text-sm font-medium px-4 py-2 rounded cursor-pointer hover:bg-verde-medio list-none">
            + Nuevo álbum
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-96 bg-white border rounded-lg shadow-lg p-4">
            <p className="font-semibold text-sm mb-3">Crear álbum</p>
            <form action={crearAlbum} className="space-y-2 text-sm">
              <input name="titulo" required placeholder="Título (ej. Graduación 2026)" className="w-full border rounded px-2 py-1" />
              <input name="slug" required pattern="[a-z0-9][a-z0-9\-]*" placeholder="slug (ej. graduacion-2026)" className="w-full border rounded px-2 py-1 font-mono text-xs" />
              <input name="fecha_evento" type="date" className="w-full border rounded px-2 py-1" />
              <textarea name="descripcion" rows={2} placeholder="Descripción breve" className="w-full border rounded px-2 py-1" />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="publicado" defaultChecked /> Publicado
              </label>
              <button type="submit" className="w-full bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio text-xs">
                Crear y subir fotos
              </button>
            </form>
          </div>
        </details>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(albumes ?? []).map((a: any) => (
          <div key={a.id} className="bg-white rounded-lg shadow-sm overflow-hidden border hover:shadow-md transition">
            <Link href={`/admin/publico/albumes/${a.id}`}>
              <div
                className="aspect-[4/3] bg-verde/10 bg-cover bg-center"
                style={a.portada_url ? { backgroundImage: `url(${a.portada_url})` } : undefined}
              />
            </Link>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/admin/publico/albumes/${a.id}`} className="font-serif text-lg text-verde hover:text-verde-medio">
                  {a.titulo}
                </Link>
                {a.publicado ? (
                  <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">Pub</span>
                ) : (
                  <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-medium">Borr</span>
                )}
              </div>
              {a.fecha_evento && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {new Date(a.fecha_evento).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2">{a.fotos?.[0]?.count ?? 0} fotos</div>
              <div className="flex gap-3 mt-3 pt-3 border-t">
                <Link href={`/admin/publico/albumes/${a.id}`} className="text-xs text-verde hover:underline">Administrar</Link>
                <Link href={`/publico/albumes/${a.slug}`} target="_blank" className="text-xs text-gray-500 hover:underline">Ver público</Link>
                <form action={eliminarAlbum} className="ml-auto">
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton message={`¿Eliminar el álbum "${a.titulo}"?`} className="text-xs text-red-600 hover:underline">
                    Eliminar
                  </ConfirmButton>
                </form>
              </div>
            </div>
          </div>
        ))}
        {(!albumes || albumes.length === 0) && (
          <div className="col-span-3 bg-white rounded-lg p-10 text-center text-gray-400 shadow-sm">
            No hay álbumes todavía. Crea el primero con el botón "+ Nuevo álbum".
          </div>
        )}
      </div>
    </div>
  );
}
