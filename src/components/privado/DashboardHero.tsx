'use client';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useEffect, useState, ReactNode } from 'react';

/**
 * Hero premium interactivo para dashboards privados.
 * - Fondo aurora + partículas animadas
 * - Efecto parallax 3D según posición del mouse
 * - Reloj + saludo + chip de rol
 * - Slots para métricas destacadas
 */
export function DashboardHero({
  eyebrow,
  title,
  subtitle,
  icon = '✦',
  chip,
  gradient = 'from-verde-oscuro via-verde to-verde-medio',
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  chip?: { label: string; tone?: 'dorado' | 'verde' | 'blanco' };
  gradient?: string;
  children?: ReactNode;
}) {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [4, -4]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-4, 4]), { stiffness: 120, damping: 20 });
  const glowX = useTransform(mouseX, [0, 1], ['0%', '100%']);
  const glowY = useTransform(mouseY, [0, 1], ['0%', '100%']);

  const [hora, setHora] = useState('');
  const [fecha, setFecha] = useState('');
  useEffect(() => {
    const upd = () => {
      const d = new Date();
      setHora(d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
      setFecha(d.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    };
    upd();
    const id = setInterval(upd, 30_000);
    return () => clearInterval(id);
  }, []);

  const chipTone: Record<string, string> = {
    dorado: 'bg-dorado/90 text-verde-oscuro',
    verde: 'bg-verde-claro/20 text-verde-claro border border-verde-claro/30',
    blanco: 'bg-white/15 text-white border border-white/25',
  };

  return (
    <motion.div
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        mouseX.set((e.clientX - r.left) / r.width);
        mouseY.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => { mouseX.set(0.5); mouseY.set(0.5); }}
      style={{ perspective: 1200, rotateX, rotateY, transformStyle: 'preserve-3d' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.2, 0.85, 0.2, 1] }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} text-white p-6 md:p-10 shadow-2xl shadow-verde-oscuro/30`}
    >
      {/* Spotlight que sigue el mouse */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: 'radial-gradient(500px circle at var(--mx) var(--my), rgba(255,255,255,0.18), transparent 60%)',
          // @ts-ignore
          '--mx': glowX,
          '--my': glowY,
        }}
      />

      {/* Aurora blobs */}
      <div aria-hidden className="aurora absolute inset-0 opacity-50" />
      <div
        aria-hidden
        className="absolute -left-20 -top-20 w-96 h-96 rounded-full bg-dorado/20 blur-3xl animate-pulse"
        style={{ animationDuration: '8s' }}
      />
      <div
        aria-hidden
        className="absolute -right-16 bottom-0 w-80 h-80 rounded-full bg-verde-claro/20 blur-3xl animate-pulse"
        style={{ animationDuration: '11s', animationDelay: '-3s' }}
      />

      {/* Grid puntos */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Partículas flotantes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute block rounded-full bg-white/40"
            style={{
              left: `${(i * 83) % 100}%`,
              bottom: -8,
              width: 3 + ((i * 2) % 5),
              height: 3 + ((i * 2) % 5),
            }}
            animate={{
              y: [-10, -200 - (i * 15)],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 10 + (i % 5) * 2,
              repeat: Infinity,
              delay: (i * 0.8) % 8,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Contenido */}
      <div className="relative z-10 grid md:grid-cols-[1fr_auto] gap-6 items-start" style={{ transform: 'translateZ(40px)' }}>
        <div className="min-w-0">
          {eyebrow && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-[11px] uppercase tracking-[0.4em] text-dorado-claro font-semibold mb-3 inline-flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-dorado-claro animate-pulse" />
              {eyebrow}
            </motion.div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
            className="font-serif text-3xl md:text-5xl leading-[1.05] flex items-center gap-3"
          >
            <motion.span
              animate={{ rotate: [0, 10, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-block"
            >
              {icon}
            </motion.span>
            <span className="text-shimmer">{title}</span>
          </motion.h1>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.6 }}
              className="mt-3 text-white/85 text-sm md:text-base max-w-2xl leading-relaxed"
            >
              {subtitle}
            </motion.p>
          )}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
            className="mt-4 flex items-center flex-wrap gap-3 text-[12px]"
          >
            {chip && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${chipTone[chip.tone ?? 'blanco']}`}>
                ◆ {chip.label}
              </span>
            )}
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur rounded-full px-3 py-1 font-mono tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-verde-claro animate-pulse" />
              {hora}
            </span>
            <span className="capitalize text-white/70 hidden sm:inline">{fecha}</span>
          </motion.div>
        </div>

        {children && (
          <motion.div
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
            className="flex items-start gap-3"
            style={{ transform: 'translateZ(60px)' }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
