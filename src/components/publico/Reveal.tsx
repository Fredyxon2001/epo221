import { type ElementType, type ReactNode } from 'react';

export function Reveal({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: ElementType;
  once?: boolean;
}) {
  // Keep the existing API while rendering content on the server. In-view opacity
  // animations delayed useful text and hydrated a motion tree for every card.
  return (
    <Tag
      className={className}
    >
      {children}
    </Tag>
  );
}

export function Stagger({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  return (
    <div
      className={className}
    >
      {children}
    </div>
  );
}

export const staggerItem = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.85, 0.2, 1] } },
};
