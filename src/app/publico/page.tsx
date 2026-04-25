import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { HeroCanvas } from '@/components/publico/HeroCanvas';
import { Reveal, Stagger, staggerItem } from '@/components/publico/Reveal';
import { Counter } from '@/components/publico/Counter';
import { TiltCard } from '@/components/publico/TiltCard';
import { Marquee } from '@/components/publico/Marquee';
import { MotionItem } from '@/components/publico/MotionItem';
import { SectionHeader } from '@/components/publico/SectionHeader';
import { AuroraBg } from '@/components/publico/AuroraBg';
import { ValorCard } from '@/components/publico/ValorCard';
import { MagneticLink, MagneticButton } from '@/components/publico/MagneticButton';

export const revalidate = 60;

export default async function PublicoHome() {
  const supabase = createClient();

  const [{ data: noticias }, { data: cfg }, { data: albumes }, { count: materiasCount }] = await Promise.all([
    supabase.from('noticias')
      .select('id, slug, titulo, resumen, fecha_pub, imagen_url')
      .eq('publicada', true)
      .is('deleted_at', null)
      .order('fecha_pub', { ascending: false })
      .limit(4),
    supabase.from('sitio_config').select('*').maybeSingle(),
    supabase.from('albumes')
      .select('slug, titulo, portada_url, fecha_evento')
      .eq('publicado', true)
      .is('deleted_at', null)
      .order('fecha_evento', { ascending: false })
      .limit(6),
    supabase.from('materias').select('id', { count: 'exact', head: true })
      .eq('activo', true).is('deleted_at', null),
  ]);

  const heroTitulo = cfg?.hero_titulo || 'Bachillerato con identidad';
  const heroSubtitulo = cfg?.hero_subtitulo ||
    'Preparatoria Oficial 221 "Nicolás Bravo" · Formamos líderes del mañana con la fuerza del Estado de México.';

  const stats = [
    { n: cfg?.total_alumnos ?? 480,      label: 'Alumnos activos',  suffix: '+' },
    { n: cfg?.total_generaciones ?? 12,  label: 'Generaciones',     suffix: '' },
    { n: materiasCount ?? 50,             label: 'Asignaturas',      suffix: '' },
    { n: cfg?.porcentaje_aprobacion ?? 95, label: '% Aprobación',    suffix: '%' },
  ];

  const carreras = [
    { icon: '🎓', titulo: 'Bachillerato General', desc: 'Plan SEIEM con tronco común y campos disciplinares de matemáticas, ciencias, humanidades y comunicación.', color: 'from-verde to-verde-medio' },
    { icon: '🧪', titulo: 'Campos disciplinares', desc: 'Matemáticas · Ciencias experimentales · Ciencias sociales · Humanidades · Comunicación.', color: 'from-verde-medio to-verde-claro' },
    { icon: '🚀', titulo: 'Capacitación para el trabajo', desc: 'Formación propedéutica para continuar con licenciatura e ingresar al mercado laboral.', color: 'from-verde-oscuro to-verde' },
  ];

  const timeline = [
    {
      paso: '01',
      titulo: 'Convocatoria',
      desc: 'Regístrate en "Mi Derecho, Mi Lugar" del Gobierno del Estado de México.',
      href: 'https://www.miderechomilugar.gob.mx/',
      cta: 'Ir al portal oficial',
    },
    {
      paso: '02',
      titulo: 'Entrega de documentación',
      desc: 'Acude a ventanilla con todos los requisitos de inscripción o reinscripción.',
      href: '/publico/descargas',
      cta: 'Ver documentos a descargar',
    },
    {
      paso: '03',
      titulo: 'Bienvenida',
      desc: 'Semana de introducción: conoce tu grupo, tutores e instalaciones.',
    },
    {
      paso: '04',
      titulo: 'Inicio de clases',
      desc: 'Arranca tu ciclo escolar como alumno EPO 221.',
    },
  ];

  return (
    <>
      <HeroCanvas
        titulo={heroTitulo}
        subtitulo={heroSubtitulo}
        imagen={cfg?.hero_imagen_url as string | null}
        logoUrl={cfg?.logo_url as string | null}
        lema={cfg?.lema as string | null}
        cct={cfg?.cct as string | null}
      />

      {/* Marquee institucional */}
      <Marquee className="bg-verde text-white border-y border-white/25">
        {[
          '✦ Ciclo 2026-A abierto',
          '✦ Inscripciones en curso',
          '✦ Bachillerato General Estatal',
          '✦ CCT 15EBH0409B',
          '✦ Plan SEIEM',
          '✦ Formación integral',
          '✦ EPO 221 Nicolás Bravo',
          '✦ 14 años formando líderes',
        ].map((t, i) => (
          <span key={i} className="text-sm font-semibold tracking-widest whitespace-nowrap">{t}</span>
        ))}
      </Marquee>

      {/* Stats */}
      <AuroraBg className="py-16 md:py-28 px-5 md:px-6">
        <div className="relative max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Orgullo EPO 221"
            ghost="01"
            title="Una comunidad que crece"
            titleAccent="crece"
            subtitle="Cada número es una historia. Cada historia, un compromiso con el futuro del Estado de México."
          />

          <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-6" stagger={0.12}>
            {stats.map((s, i) => (
              <MotionItem key={i} variants={staggerItem}>
                <TiltCard className="gradient-border lift bg-white/90 backdrop-blur rounded-3xl p-6 md:p-8 text-center h-full">
                  <div className="font-serif text-5xl md:text-6xl font-black bg-gradient-to-br from-verde-oscuro via-verde to-verde-medio bg-clip-text text-transparent">
                    <Counter to={s.n} suffix={s.suffix} />
                  </div>
                  <div className="mt-3 text-[11px] text-gray-500 uppercase tracking-[0.3em]">{s.label}</div>
                  <div className="mt-4 mx-auto h-px w-10 bg-gradient-to-r from-transparent via-verde/40 to-transparent" />
                </TiltCard>
              </MotionItem>
            ))}
          </Stagger>
        </div>
      </AuroraBg>

      {/* Misión + Visión */}
      <section className="relative py-16 md:py-28 px-5 md:px-6 bg-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #0f766e 0, transparent 40%), radial-gradient(circle at 80% 70%, #c9a227 0, transparent 40%)' }}
             aria-hidden />
        <div className="relative max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Propósito institucional"
            ghost="02"
            title="Misión y Visión"
            titleAccent="Visión"
            subtitle="La brújula que orienta la labor cotidiana de la comunidad EPO 221."
          />

          <div className="grid md:grid-cols-2 gap-8">
            <Reveal>
              <div className="spotlight lift relative bg-gradient-to-br from-verde-oscuro via-verde to-verde-medio text-white rounded-3xl p-6 sm:p-8 md:p-10 overflow-hidden h-full shadow-2xl shadow-verde/25">
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-verde-claro/30 blob blur-2xl" aria-hidden />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-verde-claro mb-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-verde-claro animate-pulse" />
                    Misión
                  </div>
                  <p className="font-serif text-lg md:text-xl leading-relaxed text-white/95">{cfg?.mision}</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="spotlight lift gradient-border relative bg-white text-verde-oscuro rounded-3xl p-6 sm:p-8 md:p-10 overflow-hidden h-full">
                <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-verde-claro/40 blob blur-2xl" aria-hidden />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-verde mb-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-verde animate-pulse" />
                    Visión
                  </div>
                  <p className="font-serif text-lg md:text-xl leading-relaxed">{cfg?.vision}</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Valores */}
      {cfg?.valores && Array.isArray(cfg.valores) && cfg.valores.length > 0 && (
        <AuroraBg className="py-16 md:py-28 px-5 md:px-6">
          <div className="relative max-w-6xl mx-auto">
            <SectionHeader
              eyebrow="Identidad"
              ghost="03"
              title="Nuestros valores"
              titleAccent="valores"
              subtitle="Nueve principios que guían la vida diaria de la comunidad EPO 221."
            />

            <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" stagger={0.07}>
              {(cfg.valores as string[]).map((v, i) => (
                <MotionItem key={v} variants={staggerItem}>
                  <ValorCard index={i} label={v} />
                </MotionItem>
              ))}
            </Stagger>
          </div>
        </AuroraBg>
      )}

      {/* Carreras/capacitaciones */}
      <section className="relative py-16 md:py-28 px-5 md:px-6 bg-gradient-to-b from-white to-crema overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Formación"
            ghost="04"
            title="Nuestra propuesta educativa"
            titleAccent="educativa"
            subtitle="Un plan sólido con tronco común, campos disciplinares y capacitación para el trabajo."
          />

          <Stagger className="grid md:grid-cols-3 gap-6" stagger={0.15}>
            {carreras.map((c, i) => (
              <MotionItem key={i} variants={staggerItem}>
                <TiltCard className="h-full lift">
                  <div className={`spotlight relative bg-gradient-to-br ${c.color} text-white rounded-3xl p-6 md:p-8 h-full shadow-2xl shadow-verde/20 overflow-hidden group`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_55%)]" />
                    <div className="relative">
                      <div className="ring-conic inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 text-4xl mb-5">
                        {c.icon}
                      </div>
                      <h3 className="font-serif text-2xl mb-3 leading-tight">{c.titulo}</h3>
                      <p className="text-sm text-white/85 leading-relaxed">{c.desc}</p>
                      <Link href="/publico/oferta" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold opacity-90 hover:opacity-100 group-hover:gap-3 transition-all border-b border-white/30 pb-0.5">
                        Conocer más →
                      </Link>
                    </div>
                  </div>
                </TiltCard>
              </MotionItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Timeline admisión */}
      <section className="relative py-16 md:py-28 px-5 md:px-6 bg-gradient-to-br from-verde-oscuro via-verde to-verde-medio text-white overflow-hidden">
        <div className="grain absolute inset-0 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.18),transparent_50%)] pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(94,234,212,0.25),transparent_40%)] pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Admisión"
            ghost="05"
            title="4 pasos para ser EPO 221"
            titleAccent="EPO 221"
            subtitle="Tu camino de ingreso en cuatro movimientos claros, simples y oficiales."
            tone="light"
          />

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-14 left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-transparent via-white/60 to-transparent" aria-hidden />
            {timeline.map((t, i) => (
              <Reveal key={i} delay={i * 0.12} className="relative text-center lift">
                <div className="relative mx-auto glow-ring">
                  <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-full bg-white text-verde font-serif font-black text-3xl shadow-2xl shadow-black/40">
                    <span className="absolute inset-2 rounded-full border border-verde/20" aria-hidden />
                    <span className="relative">{t.paso}</span>
                  </div>
                </div>
                <h3 className="font-serif text-xl mt-6 text-white">{t.titulo}</h3>
                <p className="text-sm text-white/80 mt-2 max-w-xs mx-auto leading-relaxed">{t.desc}</p>
                {t.href && t.cta && (
                  <Link
                    href={t.href}
                    target={t.href.startsWith('http') ? '_blank' : undefined}
                    rel={t.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-verde-claro hover:text-white border-b border-verde-claro/40 hover:border-white transition"
                  >
                    {t.cta} →
                  </Link>
                )}
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.5} className="text-center mt-20 flex flex-wrap gap-4 justify-center">
            <MagneticButton href="https://www.miderechomilugar.gob.mx/" external variant="solid">
              🎯 Mi Derecho, Mi Lugar
            </MagneticButton>
            <MagneticLink href="/publico/descargas" variant="glass">
              📥 Descargar documentos
            </MagneticLink>
          </Reveal>
        </div>
      </section>

      {/* Galería bento */}
      {albumes && albumes.length > 0 && (
        <section className="py-14 md:py-24 px-5 md:px-6 bg-crema">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
              <div className="flex-1 min-w-[280px]">
                <SectionHeader
                  eyebrow="Momentos"
                  ghost="06"
                  title="Galería"
                  titleAccent="Galería"
                  align="left"
                />
              </div>
              <Link href="/publico/albumes" className="text-verde font-semibold hover:text-verde-medio group inline-flex items-center gap-2 pb-3">
                Ver todos los álbumes
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
            <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px]" stagger={0.08}>
              {albumes.map((a: any, i: number) => (
                <MotionItem key={a.slug} variants={staggerItem} className={i === 0 ? 'md:col-span-2 md:row-span-2' : ''}>
                  <Link
                    href={`/publico/albumes/${a.slug}`}
                    className="bento-card group block relative w-full h-full rounded-2xl overflow-hidden shadow-lg"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={a.portada_url ? { backgroundImage: `url(${a.portada_url})` } : { background: 'linear-gradient(135deg, #1a5c2e, #c9a227)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-verde/90 via-verde/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <div className="font-serif text-lg">{a.titulo}</div>
                      {a.fecha_evento && (
                        <div className="text-xs opacity-80 mt-1">
                          {new Date(a.fecha_evento).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </Link>
                </MotionItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* Noticias */}
      <section className="py-14 md:py-24 px-5 md:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Al día"
            ghost="07"
            title="Últimas noticias"
            titleAccent="noticias"
            subtitle="Lo que sucede en la vida académica, cultural y deportiva de la EPO 221."
          />
          {(noticias ?? []).length === 0 ? (
            <div className="text-center text-gray-400">Aún no hay publicaciones. Vuelve pronto.</div>
          ) : (
            <Stagger className="grid md:grid-cols-3 gap-6" stagger={0.12}>
              {(noticias ?? []).slice(0, 3).map((n: any) => (
                <MotionItem key={n.id} variants={staggerItem}>
                  <Link href={`/publico/noticias/${n.slug}`}
                        className="bento-card block h-full bg-crema rounded-2xl overflow-hidden shadow-md hover:shadow-2xl border border-verde/15">
                    <div className="aspect-[16/9] bg-verde/10 bg-cover bg-center"
                         style={n.imagen_url ? { backgroundImage: `url(${n.imagen_url})` } : { background: 'linear-gradient(135deg, #1a5c2e, #2d8047)' }} />
                    <div className="p-6">
                      <div className="text-xs text-verde uppercase tracking-widest">
                        {n.fecha_pub && new Date(n.fecha_pub).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                      <h3 className="font-serif text-xl text-verde mt-2 leading-tight">{n.titulo}</h3>
                      <p className="text-sm text-gray-700 mt-3 line-clamp-3">{n.resumen}</p>
                      <div className="mt-4 text-verde font-semibold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">Leer más →</div>
                    </div>
                  </Link>
                </MotionItem>
              ))}
            </Stagger>
          )}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative py-14 md:py-24 px-5 md:px-6 bg-gradient-to-br from-verde via-verde-medio to-verde text-white overflow-hidden noise">
        <div className="absolute -right-32 -top-20 w-[500px] h-[500px] rounded-full bg-white/10 blob blur-3xl" aria-hidden />
        <div className="absolute -left-32 -bottom-20 w-[400px] h-[400px] rounded-full bg-verde-claro/30 blob blur-3xl" aria-hidden />
        <div className="relative max-w-5xl mx-auto text-center">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.5em] text-verde-claro mb-4">Únete</div>
            <h2 className="font-serif text-4xl md:text-6xl leading-tight">
              Forma parte de la <span className="text-shimmer">comunidad EPO 221</span>
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-white/85">
              Conoce nuestra oferta educativa, revisa las convocatorias vigentes y arranca tu
              trayectoria académica en el bachillerato con más identidad del Estado de México.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticLink href="/publico/oferta" variant="solid">
                🎓 Ver oferta educativa
              </MagneticLink>
              <MagneticLink href="/publico/convocatorias" variant="glass">
                📣 Convocatoria vigente
              </MagneticLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
