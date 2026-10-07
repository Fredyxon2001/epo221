import { type ReactNode } from 'react';

export function Marquee({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`public-marquee overflow-hidden relative ${className}`}>
      <div className="marquee py-2">
        {children}
        {children}
      </div>
    </div>
  );
}
