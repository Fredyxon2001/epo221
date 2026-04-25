'use client';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState, ReactNode } from 'react';
import Link from 'next/link';

/**
 * StatCard 3D interactivo con count-up animado y tilt según el mouse.
 */
export function AnimatedStat({
  label,
  value,
  icon,
  tone = 'verde',
  href,
  delay = 0,
  hint,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: 'verde' | 'dorado' | 'azul' | 'rosa' | 'slate';
  href?: string;
  delay?: number;
  hint?: string;
}) {
  const ref = useRef<HTMLAnchorElement | HTMLDivElement | null>(null);
  const inView = useInView(ref as any, { once: true, margin: '-50px' });

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rX = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 150, damping: 15 });
  const rY = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 150, damping: 15 });
  const glowX = useTransform(mx, (v) => `${v * 100}%`);
  const glowY = useTransform(my, (v) => `${v * 100}%`);

  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 900;
    let raf: number;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  const toneMap: Record<string, { bg: string; ring: string; iconBg: string; text: string }> = {
    verde:  { bg: 'from-verde-oscuro via-verde to-verde-medio', ring: 'ring-verde/40', iconBg: 'bg-white/15', text: 'text-verde-claro' },
    dorado: { bg: 'from-[#7a5803] via-dorado to-[#c5932a]', ring: 'ring-dorado/40', iconBg: 'bg-white/15', text: 'text-dorado-claro' },
    azul:   { bg: 'from-[#0a2d4f] via-[#15507d] to-[#2a7ab3]', ring: 'ring-sky-400/40', iconBg: 'bg-white/15', text: 'text-sky-200' },
    rosa:   { bg: 'from-[#7a1734] via-[#b32353] to-[#d94678]', ring: 'ring-rose-400/40', iconBg: 'bg-white/15', text: 'text-rose-100' },
    slate:  { bg: 'from-[#1d2530] via-[#2c3746] to-[#495365]', ring: 'ring-slate-400/40', iconBg: 'bg-white/15', text: 'text-slate-200' },
  };
  const t = toneMap[tone];

  const content = (
    <motion.div
      ref={ref as any}
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
      style={{ perspective: 800, rotateX: rX, rotateY: rY, transformStyle: 'preserve-3d' }}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.85, 0.2, 1] }}
      whileHover={{ y: -4 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.bg} text-white p-4 md:p-5 shadow-xl shadow-black/10 ring-1 ${t.ring} h-full`}
    >
      {/* spotlight */}
      <motion.span
        aria-hidden
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition"
        style={{
          background: `radial-gradient(180px circle at ${glowX.get()} ${glowY.get()}, rgba(255,255,255,0.25), transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '14px 14px' }}
      />

      <div className="relative flex items-start justify-between" style={{ transform: 'translateZ(30px)' }}>
        <div className={`w-10 h-10 rounded-xl ${t.iconBg} backdrop-blur flex items-center justify-center text-xl shadow-inner`}>
          {icon}
        </div>
        {href && <span className="text-white/60 text-sm group-hover:translate-x-0.5 transition">→</span>}
      </div>

      <div className="relative mt-4" style={{ transform: 'translateZ(45px)' }}>
        <div className={`text-[10px] uppercase tracking-[0.3em] font-semibold ${t.text}`}>{label}</div>
        <div className="mt-1 font-serif text-4xl md:text-5xl tabular-nums leading-none">
          {display.toLocaleString('es-MX')}
        </div>
        {hint && <div className="text-[11px] text-white/70 mt-2">{hint}</div>}
      </div>

      {/* shimmer */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 opacity-0 hover:opacity-100 transition bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.25)_50%,transparent_60%)] bg-[length:200%_100%] animate-[shimmer_2.5s_linear_infinite]"
      />
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="group block h-full">
        {content}
      </Link>
    );
  }
  return <div className="group h-full">{content}</div>;
}
