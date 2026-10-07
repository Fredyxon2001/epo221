import { type ReactNode } from 'react';

export function MotionItem({
  children,
  className = '',
}: {
  children: ReactNode;
  variants?: unknown;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
