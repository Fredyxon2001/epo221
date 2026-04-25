'use client';
import { useEffect, useState } from 'react';

type P = { left: number; size: number; dur: number; delay: number; op: number };

/** Partículas doradas sutiles que suben. Sin libs. */
export function Particles({ count = 18 }: { count?: number }) {
  // Estado vacío en el SSR y primer render de cliente → sin mismatch de hidratación.
  // Las partículas se generan solo tras el mount.
  const [items, setItems] = useState<P[]>([]);

  useEffect(() => {
    setItems(
      Array.from({ length: count }).map(() => ({
        left: Math.random() * 100,
        size: 3 + Math.random() * 6,
        dur:  10 + Math.random() * 14,
        delay: Math.random() * 12,
        op:   0.25 + Math.random() * 0.45,
      })),
    );
  }, [count]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: p.size, height: p.size,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.op,
          }}
        />
      ))}
    </div>
  );
}
