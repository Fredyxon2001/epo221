import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { actualizarAlbum, subirFotos, eliminarFoto, definirPortada } from '../actions';
import { ConfirmButton } from '@/components/ConfirmButton';

export default async function EditarAlbum({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: a }, { data: fotos }] = await Promise.all([
    supabase.from('albumes').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('album_fotos').select('*').eq('album_id', params.id).order('orden'),
  ]);

  if (!a) notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/admin/publico/albumes" className="text-xs text-gray-500 hover:underline">← Álbumes</Link>
        <h1 className="font-serif text-3xl text-verde mt-1">{a.titulo}</h1>
        <p className="text-xs text-gray-500 mt-1">
          URL pública: <code className="bg-gray-100 px-1 rounded">/publico/albumes/{a.slug}</code>
        </p>
      </div>

      {/* Datos del álbum */}
      <form action={actualizarAlbum} className="bg-white rounded-lg shadow-sm p-5 space-y-4">
        <input type="hidden" name="id" value={a.id} />
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Título</label>
            <input name="titulo" defaultValue={a.titulo} required className="mt-1 w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Slug (URL)</label>
            <input name="slug" defaultValue={a.slug} required pattern="[a-z0-9][a-z0-9\-]*" className="mt-1 w-full border rounded px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Fecha del evento</label>
            <input name="fecha_evento" type="date" defaultValue={a.fecha_evento ?? ''} className="mt-1 w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="publicado" defaultChecked={a.publicado} /> Publicado
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-600">Descripción</label>
            <textarea name="descripcion" rows={3} defaultValue={a.descripcion ?? ''} className="mt-1 w-full border rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t">
          <button type="submit" className="bg-verde text-white px-6 py-2 rounded hover:bg-verde-medio text-sm font-medium">
            Guardar datos
          </button>
        </div>
      </form>

      {/* Subir fotos */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <h2 className="font-serif text-lg text-verde mb-3">Subir fotos</h2>
        <form action={subirFotos} encType="multipart/form-data" className="space-y-3">
          <input type="hidden" name="album_id" value={a.id} />
          <input
            type="file"
            name="fotos"
            accept="image/*"
            multiple
            required
            className="w-full text-sm"
          />
          <p className="text-xs text-gray-400">Máx 8 MB por imagen. Puedes seleccionar varias a la vez.</p>
          <button type="submit" className="bg-verde text-white px-6 py-2 rounded hover:bg-verde-medio text-sm font-medium">
            Subir fotos
          </button>
        </form>
      </div>

      {/* Grid de fotos */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <h2 className="font-serif text-lg text-verde mb-3">Fotos ({fotos?.length ?? 0})</h2>
        {(!fotos || fotos.length === 0) ? (
          <p className="text-center text-gray-400 text-sm py-10">Aún no hay fotos.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fotos.map((f: any) => (
              <div key={f.id} className="relative group border rounded overflow-hidden">
                <img src={f.foto_url} alt={f.caption ?? ''} className="w-full aspect-square object-cover" />
                {a.portada_url === f.foto_url && (
                  <span className="absolute top-1 left-1 bg-dorado text-verde text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Portada
                  </span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 text-xs">
                  {a.portada_url !== f.foto_url && (
                    <form action={definirPortada}>
                      <input type="hidden" name="album_id" value={a.id} />
                      <input type="hidden" name="foto_url" value={f.foto_url} />
                      <button type="submit" className="text-white hover:text-dorado-claro">Definir como portada</button>
                    </form>
                  )}
                  <form action={eliminarFoto}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="album_id" value={a.id} />
                    <ConfirmButton message="¿Eliminar esta foto?" className="text-red-300 hover:text-red-100">
                      Eliminar
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
