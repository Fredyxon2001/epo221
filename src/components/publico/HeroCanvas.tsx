'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { Particles } from './Particles';
import { LogoEPO } from './LogoEPO';

export function HeroCanvas({
  titulo,
  subtitulo,
  imagen,
  logoUrl,
  lema,
  cct,
}: {
  titulo: string;
  subtitulo: string;
  imagen?: string | null;
  logoUrl?: string | null;
  lema?: string | null;
  cct?: string | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y    = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const op   = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scal = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  // Title split para animación palabra por palabra
  const titleWords = titulo.split(' ');

  return (
    <section ref={ref} className="relative min-h-[640px] md:min-h-[860px] lg:min-h-[920px] h-[100svh] overflow-hidden bg-animated-verde text-white">
      {/* Aurora mesh backdrop */}
      <div className="aurora absolute inset-0 pointer-events-none opacity-90" aria-hidden />
      <div className="grain absolute inset-0 pointer-events-none" aria-hidden />

      {/* Imagen de fondo con parallax + blur y oscurecido */}
      {imagen && (
        <motion.div
          style={{ y, scale: scal }}
          className="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-luminosity"
          aria-hidden
        >
          <div
            style={{ backgroundImage: `url(${imagen})` }}
            className="w-full h-full bg-cover bg-center"
          />
        </motion.div>
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)' }}
        aria-hidden
      />

      {/* Blobs decorativos */}
      <div className="absolute -left-40 -top-40 w-[540px] h-[540px] bg-white/15 blob blur-3xl" aria-hidden />
      <div className="absolute -right-32 top-1/3 w-[420px] h-[420px] bg-verde-claro/40 blob blur-3xl" aria-hidden style={{ animationDelay: '-6s' }} />

      <Particles count={24} />

      <motion.div style={{ opacity: op, y }} className="relative z-10 h-full flex flex-col items-center justify-center text-center px-5 sm:px-6 pt-24 sm:pt-28 md:pt-36">
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: logoUrl ? -20 : -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 1.1, ease: [0.2, 0.85, 0.2, 1.3] }}
          className={`mb-4 sm:mb-6 shrink-0 ${logoUrl ? 'drop-shadow-[0_0_45px_rgba(255,255,255,0.5)]' : 'animate-golden-pulse rounded-full'}`}
        >
          <span className="sm:hidden"><LogoEPO url={logoUrl} size={110} glow /></span>
          <span className="hidden sm:inline md:hidden"><LogoEPO url={logoUrl} size={140} glow /></span>
          <span className="hidden md:inline"><LogoEPO url={logoUrl} size={180} glow /></span>
        </motion.div>

        {lema && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.95 }}
            className="font-serif italic text-verde-claro/90 text-sm md:text-base mt-2 mb-2"
          >
            "{lema}"
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, letterSpacing: '-0.05em' }}
          animate={{ opacity: 1, letterSpacing: '0em' }}
          transition={{ duration: 1.4, delay: 0.3 }}
          className="text-[10px] sm:text-xs uppercase tracking-[0.35em] sm:tracking-[0.5em] text-verde-claro mb-3 sm:mb-4"
        >
          Estado de México · BGE
        </motion.div>

        <h1 className="font-serif text-[2.15rem] leading-[1.08] sm:text-5xl sm:leading-[1.05] md:text-7xl lg:text-8xl max-w-5xl px-2 sm:px-4 break-words">
          {titleWords.map((w, i) => {
            const isLast = i === titleWords.length - 1;
            return (
              <motion.span
                key={`${w}-${i}`}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.55 + i * 0.12, ease: [0.2, 0.85, 0.2, 1] }}
                className={`inline-block mr-2 sm:mr-3 ${isLast ? 'text-shimmer' : ''}`}
              >
                {w}
              </motion.span>
            );
          })}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.85 }}
          className="font-serif text-xl sm:text-2xl md:text-3xl text-verde-claro mt-2"
        >
          "Nicolás Bravo"
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.95 }}
          className="mt-3 inline-flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-[0.4em] text-white/80 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 backdrop-blur"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-verde-claro animate-pulse" />
          CCT {cct ?? '15EBH0409B'}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.05 }}
          className="mt-6 sm:mt-8 max-w-2xl text-white/85 text-sm sm:text-base md:text-lg leading-relaxed px-2 sm:px-0"
        >
          {subtitulo}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.25 }}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0"
        >
          <Link
            href="/publico/oferta"
            className="btn-ripple bg-white text-verde font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-full hover:bg-verde-claro transition shadow-xl shadow-black/30 inline-flex items-center justify-center gap-2 group text-sm sm:text-base"
          >
            Explora nuestra oferta
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link
            href="/login"
            className="glass text-white font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-full hover:bg-white/20 transition inline-flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            🔐 Portal alumnos
          </Link>
        </motion.div>
      </motion.div>

      {/* Indicador scroll */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 text-xs"
      >
        <span className="uppercase tracking-widest">scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="w-[2px] h-8 bg-gradient-to-b from-dorado to-transparent"
        />
      </motion.div>
    </section>
  );
}
