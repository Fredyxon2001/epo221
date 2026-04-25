'use client';
import { useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Tarjeta con efecto 3D que sigue el mouse. */
export function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const rx = (y - 0.5) * -10;
    const ry = (x - 0.5) * 12;
    el.style.setProperty('--x', `${x * 100}%`);
    el.style.setProperty('--y', `${y * 100}%`);
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  };
  const onLeave = () => {
    const el = ref.current; if (!el) return;
    el.style.transform = '';
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`transition-transform duration-300 ease-out ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
}
