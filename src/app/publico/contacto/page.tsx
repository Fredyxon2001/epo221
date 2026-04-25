import { createClient } from '@/lib/supabase/server';
import { Reveal } from '@/components/publico/Reveal';
import { Reloj } from '@/components/publico/Reloj';
import { SectionHeader } from '@/components/publico/SectionHeader';
import { AuroraBg } from '@/components/publico/AuroraBg';

export const revalidate = 120;

export default async function Contacto() {
  const supabase = createClient();
  const { data: cfg } = await supabase.from('sitio_config').select('*').maybeSingle();

  return (
    <AuroraBg className="pt-32 pb-28 px-6">
      <div className="relative max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Estamos para ti"
          ghost="@"
          title="Contáctanos"
          titleAccent="Contáctanos"
          subtitle="Visítanos, llámanos o escríbenos. La comunidad EPO 221 te recibe con las puertas abiertas."
        />

        <Reveal delay={0.1} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-verde/20 rounded-full px-5 py-2.5 shadow-sm text-sm text-verde-oscuro">
            <span className="text-verde">📍</span>
            {cfg?.direccion ?? 'Valle del Guadalquivir Manzana 019, CTM 14, 55280 Ecatepec de Morelos, Méx.'}
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <Reveal>
            <div className="spotlight lift gradient-border relative bg-white rounded-3xl p-8 h-full overflow-hidden">
              <div className="relative">
                <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-verde mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-verde animate-pulse" />
                  Escuela
                </div>
                <div className="font-serif text-2xl text-verde-oscuro mb-6 leading-tight">
                  {cfg?.nombre_escuela ?? 'EPO 221 Nicolás Bravo'}
                </div>
                <div className="space-y-3 text-sm">
                  <Item icon="🏫" label="CCT" value={cfg?.cct ?? '15EBH0409B'} />
                  <Item icon="🎓" label="Subsistema" value="Bachillerato General Estatal (SEIEM)" />
                  {cfg?.direccion && <Item icon="📍" label="Dirección" value={cfg.direccion} />}
                  {cfg?.telefono  && <Item icon="📞" label="Teléfono"  value={cfg.telefono}  link={`tel:${cfg.telefono.replace(/\s/g,'')}`} />}
                  {cfg?.email     && <Item icon="✉️" label="Correo principal" value={cfg.email}  link={`mailto:${cfg.email}`} />}
                  {cfg?.email2    && <Item icon="📧" label="Correo alterno"   value={cfg.email2} link={`mailto:${cfg.email2}`} />}
                  {cfg?.horario   && <Item icon="🕐" label="Horario"   value={cfg.horario} />}
                </div>

                <div className="mt-8 pt-6 border-t border-verde/10">
                  <Reloj variant="light" />
                </div>
                {(cfg?.whatsapp_url || cfg?.youtube_url) && (
                  <div className="mt-6 pt-5 border-t border-verde/10 flex gap-2 flex-wrap">
                    {cfg?.whatsapp_url && (
                      <a href={cfg.whatsapp_url} target="_blank" rel="noopener"
                         className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-green-700 transition shadow-lg shadow-green-600/30">
                        💬 WhatsApp
                      </a>
                    )}
                    {cfg?.youtube_url && (
                      <a href={cfg.youtube_url} target="_blank" rel="noopener"
                         className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-700 transition shadow-lg shadow-red-600/30">
                        ▶ YouTube
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            {cfg?.mapa_embed_url ? (
              <div className="lift sticky top-32 relative bg-white rounded-3xl shadow-2xl shadow-verde/15 overflow-hidden border border-verde/10">
                <iframe
                  src={cfg.mapa_embed_url}
                  className="w-full aspect-[4/3] block border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación"
                />
              </div>
            ) : (
              <div className="spotlight lift bg-gradient-to-br from-verde-oscuro via-verde to-verde-medio rounded-3xl shadow-2xl shadow-verde/30 p-10 text-white flex flex-col items-center justify-center text-center aspect-[4/3] relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 blob blur-3xl" aria-hidden />
                <div className="relative">
                  <div className="text-6xl mb-4">🗺️</div>
                  <div className="font-serif text-2xl">Mapa próximamente</div>
                  <div className="text-sm text-white/70 mt-2">El administrador puede configurarlo desde el panel.</div>
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </AuroraBg>
  );
}

function Item({ icon, label, value, link }: { icon: string; label: string; value: string; link?: string }) {
  const content = (
    <div className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-crema/60 transition">
      <div className="text-xl flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400">{label}</div>
        <div className="font-semibold text-verde break-words">{value}</div>
      </div>
    </div>
  );
  return link ? <a href={link} className="block transition">{content}</a> : content;
}
