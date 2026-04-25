'use client';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef, ReactNode } from 'react';

type Props = {
  href: string;
  external?: boolean;
  variant?: 'solid' | 'glass' | 'outline';
  className?: string;
  children: ReactNode;
};

/**
 * Botón con efecto "magnético": el contenido se desplaza suavemente hacia
 * el cursor mientras está sobre el botón. Incluye halo de luz animado.
 */
export function MagneticButton({
  href,
  external,
  variant = 'solid',
  className = '',
  children,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 15, mass: 0.3 });
  const sy = useSpring(my, { stiffness: 200, damping: 15, mass: 0.3 });
  const tx = useTransform(sx, (v) => v / 4);
  const ty = useTransform(sy, (v) => v / 4);

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const base =
    'relative inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold transition overflow-hidden will-change-transform';
  const styles = {
    solid: 'bg-white text-verde shadow-xl hover:shadow-2xl',
    glass: 'glass text-white hover:bg-white/20',
    outline:
      'border-2 border-white/40 text-white hover:border-white hover:bg-white/10 backdrop-blur',
  }[variant];

  return (
    <motion.a
      ref={ref}
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={`${base} ${styles} ${className}`}
    >
      <motion.span style={{ x: tx, y: ty }} className="relative z-10 inline-flex items-center gap-3">
        {children}
      </motion.span>
      {variant === 'solid' && (
        <span
          className="absolute inset-0 opacity-0 hover:opacity-100 transition pointer-events-none"
          style={{
            background:
              'radial-gradient(120px circle at var(--mx,50%) var(--my,50%), rgba(13,148,136,0.18), transparent 60%)',
          }}
          aria-hidden
        />
      )}
    </motion.a>
  );
}

/** Variante para <Link> interno de Next — mismo efecto, sin target. */
export function MagneticLink({
  href,
  variant = 'solid',
  className = '',
  children,
}: Omit<Props, 'external'>) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 200, damping: 15, mass: 0.3 });
  const sy = useSpring(my, { stiffness: 200, damping: 15, mass: 0.3 });

  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left - r.width / 2) / 2);
    my.set((e.clientY - r.top - r.height / 2) / 2);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const base =
    'relative inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold transition overflow-hidden will-change-transform';
  const styles = {
    solid: 'bg-white text-verde shadow-xl hover:shadow-2xl hover:shadow-verde/30',
    glass: 'glass text-white hover:bg-white/20',
    outline:
      'border-2 border-white/40 text-white hover:border-white hover:bg-white/10 backdrop-blur',
  }[variant];

  return (
    <motion.span style={{ x: sx, y: sy }} className="inline-block">
      <Link
        href={href}
        ref={ref as any}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={`${base} ${styles} ${className}`}
      >
        <span className="relative z-10 inline-flex items-center gap-3">{children}</span>
      </Link>
    </motion.span>
  );
}
