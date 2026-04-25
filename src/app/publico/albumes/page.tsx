import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Stagger, staggerItem } from '@/components/publico/Reveal';
import { MotionItem } from '@/components/publico/MotionItem';
import { SectionHeader } from '@/components/publico/SectionHeader';
import { AuroraBg } from '@/components/publico/AuroraBg';

export const revalidate = 60;

export default async function PublicoAlbumes() {
  const supabase = createClient();
  const { data: albumes } = await supabase
    .from('albumes')
    .select('slug, titulo, descripcion, portada_url, fecha_evento, album_fotos(count)')
    .eq('publicado', true)
    .is('deleted_at', null)
    .order('fecha_evento', { ascending: false, nullsFirst: false });

  return (
    <AuroraBg className="pt-32 pb-28 px-6">
      <div className="relative max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Momentos"
          ghost="◐"
          title="Galería institucional"
          titleAccent="institucional"
          subtitle="Momentos de la vida escolar en EPO 221 — eventos, ceremonias, jornadas culturales y deportivas."
        />

        {(!albumes || albumes.length === 0) ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-verde/10 text-verde text-4xl mb-4">📷</div>
            <p className="text-gray-500">Aún no se han publicado álbumes.</p>
          </div>
        ) : (
          <Stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" stagger={0.08}>
            {albumes.map((a: any) => (
              <MotionItem key={a.slug} variants={staggerItem}>
                <Link
                  href={`/publico/albumes/${a.slug}`}
                  className="lift group block relative bg-white rounded-3xl overflow-hidden shadow-xl shadow-verde/10 border border-verde/10 h-full"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={
                        a.portada_url
                          ? { backgroundImage: `url(${a.portada_url})` }
                          : { background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }
                      }
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-verde-oscuro/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition" />
                    {a.album_fotos?.[0]?.count != null && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-black/40 backdrop-blur text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-white/20">
                        📷 {a.album_fotos[0].count} fotos
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-verde-claro/90">
                        {a.fecha_evento
                          ? new Date(a.fecha_evento).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
                          : 'Álbum'}
                      </div>
                      <div className="font-serif text-xl mt-1 leading-tight">{a.titulo}</div>
                    </div>
                  </div>
                  {a.descripcion && (
                    <div className="p-5">
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{a.descripcion}</p>
                      <div className="mt-3 text-verde font-semibold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        Ver álbum →
                      </div>
                    </div>
                  )}
                </Link>
              </MotionItem>
            ))}
          </Stagger>
        )}
      </div>
    </AuroraBg>
  );
}
