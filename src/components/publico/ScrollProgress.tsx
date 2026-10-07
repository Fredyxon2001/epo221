'use client';
import { useEffect, useRef } from 'react';

export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const available = document.documentElement.scrollHeight - window.innerHeight;
        const progress = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0;
        if (ref.current) ref.current.style.transform = `scaleX(${progress})`;
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);
  return <div ref={ref} aria-hidden className="scroll-progress" style={{ transform: 'scaleX(0)', width: '100%' }} />;
}
