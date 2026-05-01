'use client';
import { useEffect, useRef, useState } from 'react';

// Hero con video de fondo (autoplay loop muted) — usa el video más cinematográfico
const HERO_VIDEO = '/videos/recorrido-escuela.mp4';
const HERO_POSTER = '/videos/recorrido-escuela.jpg';

export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(m.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  return (
    <section className="relative h-[78vh] min-h-[500px] overflow-hidden bg-verde-oscuro">
      {/* Video de fondo */}
      {!reduced && (
        <video
          ref={ref}
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          autoPlay muted loop playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover scale-105"
          aria-hidden
        />
      )}
      {reduced && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={HERO_POSTER} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Overlay degradado */}
      <div className="absolute inset-0 bg-gradient-to-b from-verde-oscuro/40 via-verde-oscuro/60 to-verde-oscuro/95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.5)_100%)]" />

      {/* Contenido del hero */}
      <div className="relative h-full flex flex-col items-center justify-center text-white text-center px-6 max-w-5xl mx-auto">
        <span className="text-xs uppercase tracking-[0.5em] text-dorado-claro mb-4 font-semibold">
          ✈️ Tomas aéreas con dron DJI
        </span>
        <h1 className="font-serif text-5xl md:text-7xl font-black leading-[1.05] mb-5 drop-shadow-2xl">
          Conoce nuestra <span className="text-dorado">EPO 221</span><br />
          desde el cielo
        </h1>
        <p className="text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed">
          Recorre cada espacio del plantel "Nicolás Bravo" con tomas profesionales de nuestras instalaciones, fachada, áreas de construcción y más.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <a href="#galeria" className="bg-dorado hover:bg-dorado-claro text-verde-oscuro font-bold px-7 py-3.5 rounded-xl transition shadow-2xl">
            ▶ Ver galería
          </a>
          <a href="/publico/oferta" className="bg-white/10 backdrop-blur border border-white/30 hover:bg-white/20 text-white font-bold px-7 py-3.5 rounded-xl transition">
            🎓 Inscríbete
          </a>
        </div>

        {/* Indicador de scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/60 text-xs">
          <span className="mb-1 uppercase tracking-widest">Desliza</span>
          <div className="w-5 h-8 border-2 border-white/40 rounded-full flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 bg-white/70 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
}
