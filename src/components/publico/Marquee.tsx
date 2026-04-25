'use client';
import { type ReactNode } from 'react';

export function Marquee({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden relative ${className}`}>
      <div className="marquee py-2">
        {children}
        {children}
      </div>
    </div>
  );
}
