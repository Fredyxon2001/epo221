import { createClient } from '@/lib/supabase/server';
import { Stagger, staggerItem } from '@/components/publico/Reveal';
import { MotionItem } from '@/components/publico/MotionItem';
import { SectionHeader } from '@/components/publico/SectionHeader';
import { AuroraBg } from '@/components/publico/AuroraBg';
import { ArticuloMarkdown } from '@/components/publico/ArticuloMarkdown';
import { convocatoriaStatus, formatSchoolDate, schoolToday } from '@/lib/public-convocatorias';

export const revalidate = 60;

export default async function Convocatorias() {
  const supabase = (await createClient());
  const hoy = schoolToday();
  const { data, error } = await supabase
    .from('convocatorias').select('*')
    .or(`vigente_desde.is.null,vigente_desde.lte.${hoy}`)
    .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`)
    .order('vigente_desde', { ascending: false });
  // A second check excludes malformed legacy ranges as well as future dates.
  const convs = (data ?? []).filter(c => convocatoriaStatus(c.vigente_desde, c.vigente_hasta, hoy) === 'Vigente');

  return (
    <AuroraBg className="pt-32 pb-28 px-6">
      <div className="relative max-w-5xl mx-auto">
        <SectionHeader
          headingLevel={1}
          eyebrow="Admisión y trámites"
          ghost="C"
          title="Convocatorias vigentes"
          titleAccent="vigentes"
          subtitle="Procesos abiertos de ingreso, reinscripción y trámites oficiales de la EPO 221."
        />

        {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center text-red-800"><p>No pudimos cargar las convocatorias en este momento.</p><a href="/publico/convocatorias" className="mt-3 inline-block underline">Volver a intentar</a></div> : convs.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-verde/10 text-verde text-4xl mb-4">📭</div>
            <p className="text-gray-500">No hay convocatorias vigentes en este momento.</p>
          </div>
        ) : (
          <Stagger className="space-y-5" stagger={0.08}>
            {convs.map((c: any) => {
              const activa = convocatoriaStatus(c.vigente_desde, c.vigente_hasta, hoy) === 'Vigente';
              return (
                <MotionItem key={c.id} variants={staggerItem}>
                  <div className="lift spotlight relative bg-white rounded-3xl shadow-xl shadow-verde/10 border border-verde/10 overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b from-verde-oscuro via-verde to-verde-medio" aria-hidden />
                    <div className="relative p-8">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] px-3 py-1 rounded-full ${
                              activa
                                ? 'bg-verde-claro/40 text-verde-oscuro border border-verde/30'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${activa ? 'bg-verde animate-pulse' : 'bg-gray-400'}`} />
                              {activa ? 'Vigente' : 'Concluida'}
                            </span>
                          </div>
                          <h2 className="font-serif text-2xl md:text-3xl text-verde-oscuro leading-tight">{c.titulo}</h2>
                          {/* La descripción viene en markdown desde el CMS. */}
                          <div className="mt-3">
                            <ArticuloMarkdown md={c.descripcion ?? ''} />
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3 text-xs">
                            <span className="inline-flex items-center gap-1.5 bg-crema border border-verde/15 rounded-full px-3 py-1.5 text-gray-600">
                              <span className="text-verde">📅</span>
                              Desde: <span className="font-semibold text-verde-oscuro">{c.vigente_desde ? formatSchoolDate(c.vigente_desde) : 'Sin fecha inicial'}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-crema border border-verde/15 rounded-full px-3 py-1.5 text-gray-600">
                              <span className="text-verde">⏰</span>
                              Hasta: <span className="font-semibold text-verde-oscuro">{c.vigente_hasta ? `${formatSchoolDate(c.vigente_hasta)} (día completo)` : 'Sin fecha límite'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {c.archivo_url && (
                        <a
                          href={c.archivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-6 inline-flex items-center gap-2 bg-linear-to-r from-verde to-verde-medio text-white font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-verde/30 hover:shadow-xl hover:-translate-y-0.5 transition"
                        >
                          📎 Descargar documento oficial
                        </a>
                      )}
                    </div>
                  </div>
                </MotionItem>
              );
            })}
          </Stagger>
        )}
      </div>
    </AuroraBg>
  );
}
