'use client';
import { useEffect, useState } from 'react';

export function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      setHover(!!t.closest('a, button, [role="button"], .cursor-hover'));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
    };
  }, []);

  return (
    <div
      className={`custom-cursor ${hover ? 'hover' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      aria-hidden
    />
  );
}
