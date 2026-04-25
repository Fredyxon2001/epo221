import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PublicoAlbumDetalle({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: album } = await supabase
    .from('albumes')
    .select('*, album_fotos(id, foto_url, caption, orden)')
    .eq('slug', params.slug)
    .eq('publicado', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (!album) notFound();

  const fotos = (album.album_fotos ?? []).sort((a: any, b: any) => a.orden - b.orden);

  return (
    <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
      <Link href="/publico/albumes" className="text-sm text-verde hover:underline">← Todos los álbumes</Link>
      <h1 className="font-serif text-4xl text-verde mt-2">{album.titulo}</h1>
      {album.fecha_evento && (
        <p className="text-sm text-gray-500">
          {new Date(album.fecha_evento).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}
      {album.descripcion && <p className="mt-4 text-gray-700">{album.descripcion}</p>}

      {fotos.length === 0 ? (
        <p className="text-gray-400 mt-12 text-center">Este álbum aún no tiene fotos.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-8">
          {fotos.map((f: any) => (
            <a
              key={f.id}
              href={f.foto_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative overflow-hidden rounded bg-verde/10"
            >
              <img
                src={f.foto_url}
                alt={f.caption ?? album.titulo}
                className="w-full aspect-square object-cover group-hover:scale-105 transition"
                loading="lazy"
              />
              {f.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition">
                  {f.caption}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
