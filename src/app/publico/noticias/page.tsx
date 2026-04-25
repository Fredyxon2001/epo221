import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Reveal, Stagger, staggerItem } from '@/components/publico/Reveal';
import { MotionItem } from '@/components/publico/MotionItem';
import { SectionHeader } from '@/components/publico/SectionHeader';
import { AuroraBg } from '@/components/publico/AuroraBg';

export const revalidate = 60;

export default async function Noticias() {
  const supabase = createClient();
  const { data: noticias } = await supabase
    .from('noticias').select('*').eq('publicada', true).order('fecha_pub', { ascending: false });

  const [primera, ...resto] = noticias ?? [];

  return (
    <AuroraBg className="pt-32 pb-28 px-6">
      <div className="relative max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Al día"
          ghost="N"
          title="Últimas noticias"
          titleAccent="noticias"
          subtitle="Lo que sucede día con día en la vida académica, cultural y deportiva de la EPO 221."
        />

        {!noticias || noticias.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-20">Aún no hay noticias publicadas.</p>
        ) : (
          <>
            {/* Destacada */}
            {primera && (
              <Reveal className="mb-10">
                <Link
                  href={`/publico/noticias/${primera.slug}`}
                  className="lift spotlight group block relative rounded-3xl overflow-hidden shadow-2xl shadow-verde/15 border border-verde/10 bg-white"
                >
                  <div className="grid md:grid-cols-2">
                    <div
                      className="aspect-[16/10] md:aspect-auto md:min-h-[340px] bg-cover bg-center"
                      style={
                        primera.imagen_url
                          ? { backgroundImage: `url(${primera.imagen_url})` }
                          : { background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }
                      }
                    />
                    <div className="p-8 md:p-10 flex flex-col justify-center">
                      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-verde">
                        <span className="w-1.5 h-1.5 rounded-full bg-verde animate-pulse" />
                        Destacada
                      </div>
                      <h2 className="font-serif text-3xl md:text-4xl text-verde-oscuro mt-3 leading-tight">{primera.titulo}</h2>
                      <div className="text-xs text-gray-500 mt-3 uppercase tracking-widest">
                        {primera.fecha_pub && new Date(primera.fecha_pub).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                      <p className="text-gray-700 mt-4 leading-relaxed">{primera.resumen}</p>
                      <div className="mt-6 inline-flex items-center gap-2 text-verde font-semibold group-hover:gap-3 transition-all">
                        Leer nota completa →
                      </div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            )}

            {/* Grid */}
            <Stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" stagger={0.08}>
              {resto.map((n: any) => (
                <MotionItem key={n.id} variants={staggerItem}>
                  <Link
                    href={`/publico/noticias/${n.slug}`}
                    className="lift gradient-border group block h-full bg-white rounded-2xl overflow-hidden"
                  >
                    <div
                      className="aspect-[16/9] bg-verde/10 bg-cover bg-center"
                      style={
                        n.imagen_url
                          ? { backgroundImage: `url(${n.imagen_url})` }
                          : { background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }
                      }
                    />
                    <div className="p-5">
                      <div className="text-[10px] text-verde uppercase tracking-[0.3em]">
                        {n.fecha_pub && new Date(n.fecha_pub).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                      <h3 className="font-serif text-xl text-verde-oscuro mt-2 leading-tight">{n.titulo}</h3>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-3 leading-relaxed">{n.resumen}</p>
                      <div className="mt-4 text-verde font-semibold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        Leer más →
                      </div>
                    </div>
                  </Link>
                </MotionItem>
              ))}
            </Stagger>
          </>
        )}
      </div>
    </AuroraBg>
  );
}
