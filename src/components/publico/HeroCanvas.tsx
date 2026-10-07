'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Particles } from './Particles';
import { LogoEPO } from './LogoEPO';
export function HeroCanvas({ titulo, subtitulo, imagen, logoUrl, lema, cct, }: {
    titulo: string;
    subtitulo: string;
    imagen?: string | null;
    logoUrl?: string | null;
    lema?: string | null;
    cct?: string | null;
}) {
    const ref = useRef<HTMLElement>(null);
    // Static SSR content; desktop parallax updates CSS without React renders.
    useEffect(() => {
        const media = matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)');
        let raf = 0;
        const update = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const el = ref.current;
                if (!el)
                    return;
                const rect = el.getBoundingClientRect();
                const progress = media.matches ? Math.max(0, Math.min(1, -rect.top / rect.height)) : 0;
                el.style.setProperty('--hero-bg-y', progress * 40 + '%');
                el.style.setProperty('--hero-bg-scale', String(1 + progress * .15));
                el.style.setProperty('--hero-text-y', progress * -18 + '%');
                el.style.setProperty('--hero-opacity', String(Math.max(0, 1 - progress / .8)));
            });
        };
        const onScroll=()=>{if(media.matches)update();};
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        media.addEventListener('change', update);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); media.removeEventListener('change', update); };
    }, []);
    // Title split para animación palabra por palabra
    const titleWords = titulo.split(' ');
    return (<section ref={ref} className="relative min-h-[max(640px,100svh)] md:min-h-[max(860px,100svh)] lg:min-h-[max(920px,100svh)] overflow-hidden bg-animated-verde text-white">
      {/* Aurora mesh backdrop */}
      <div className="aurora absolute inset-0 pointer-events-none opacity-90" aria-hidden/>
      <div className="grain absolute inset-0 pointer-events-none" aria-hidden/>

      {/* Imagen de fondo con parallax + blur y oscurecido */}
      {imagen && (<div style={{ transform: 'translateY(var(--hero-bg-y,0%)) scale(var(--hero-bg-scale,1))' }} className="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-luminosity" aria-hidden>
          <div style={{ backgroundImage: `url(${imagen})` }} className="w-full h-full bg-cover bg-center"/>
        </div>)}

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)' }} aria-hidden/>

      {/* Blobs decorativos */}
      <div className="absolute -left-40 -top-40 w-[540px] h-[540px] bg-white/15 blob blur-3xl" aria-hidden/>
      <div className="absolute -right-32 top-1/3 w-[420px] h-[420px] bg-verde-claro/40 blob blur-3xl" aria-hidden style={{ animationDelay: '-6s' }}/>

      <Particles count={24}/>

      {/* pt- debe superar la altura del navbar fijo (117px móvil / 153px escritorio)
            o el logo y el lema quedan recortados detrás de la barra. */}
      <div style={{ opacity: 'var(--hero-opacity,1)', transform: 'translateY(var(--hero-text-y,0%))' }} className="relative z-10 min-h-[inherit] flex flex-col items-center justify-center text-center pb-32 px-5 sm:px-6 pt-32 sm:pt-36 md:pt-44">
        <div 
    /* max-h en vh: en ventanas de poca altura el logo a tamaño fijo hacía
       que el contenido centrado desbordara y el lema quedara recortado
       detrás de la barra fija. Así se encoge en vez de empujar. */
    className={`mb-4 sm:mb-6 shrink ${logoUrl ? 'drop-shadow-[0_0_45px_rgba(255,255,255,0.5)]' : 'animate-golden-pulse rounded-full'}`}>
          <LogoEPO url={logoUrl} size={180} glow priority responsive/>
        </div>

        {lema && (<div className="font-serif italic text-verde-claro/90 text-sm md:text-base mt-2 mb-2">
            "{lema}"
          </div>)}

        <div className="text-[10px] sm:text-xs uppercase tracking-[0.35em] sm:tracking-[0.5em] text-verde-claro mb-3 sm:mb-4">
          Estado de México · BGE
        </div>

        <h1 className="font-serif text-[2.15rem] leading-[1.08] sm:text-5xl sm:leading-[1.05] md:text-7xl lg:text-8xl max-w-5xl px-2 sm:px-4 wrap-break-word">
          {titleWords.map((w, i) => {
            const isLast = i === titleWords.length - 1;
            return (<span key={`${w}-${i}`} className={`inline-block mr-2 sm:mr-3 ${isLast ? 'text-shimmer' : ''}`}>
                {w}
              </span>);
        })}
        </h1>

        <p className="font-serif text-xl sm:text-2xl md:text-3xl text-verde-claro mt-2">
          "Nicolás Bravo"
        </p>

        <div className="mt-3 inline-flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-[0.4em] text-white/80 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-verde-claro animate-pulse"/>
          CCT {cct ?? '15EBH0409B'}
        </div>

        <p className="mt-6 sm:mt-8 max-w-2xl text-white/85 text-sm sm:text-base md:text-lg leading-relaxed px-2 sm:px-0">
          {subtitulo}
        </p>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
          <Link href="/publico/oferta" className="btn-ripple bg-white text-verde font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-full hover:bg-verde-claro transition shadow-xl shadow-black/30 inline-flex items-center justify-center gap-2 group text-sm sm:text-base">
            Explora nuestra oferta
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link href="/login" className="glass text-white font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-full hover:bg-white/20 transition inline-flex items-center justify-center gap-2 text-sm sm:text-base">
            🔐 Portal alumnos
          </Link>
        </div>
      </div>

      {/* Indicador scroll */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 text-xs">
        <span className="uppercase tracking-widest">scroll</span>
        <div className="animate-bounce w-[2px] h-8 bg-linear-to-b from-dorado to-transparent"/>
      </div>
    </section>);
}
