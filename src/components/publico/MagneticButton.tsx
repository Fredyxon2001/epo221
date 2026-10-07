import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = { href: string; external?: boolean; variant?: 'solid' | 'glass' | 'outline'; className?: string; children: ReactNode; };
function buttonClass(variant: Props['variant'], className: string) {
  const styles = { solid: 'bg-white text-verde shadow-xl hover:shadow-2xl hover:shadow-verde/30', glass: 'glass text-white hover:bg-white/20', outline: 'border-2 border-white/40 text-white hover:border-white hover:bg-white/10' }[variant ?? 'solid'];
  return ['relative inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold overflow-hidden motion-safe:transition motion-safe:hover:-translate-y-0.5', styles, className].join(' ');
}
/** CSS feedback keeps the button responsive without a motion engine or pointer springs. */
export function MagneticButton({ href, external, variant = 'solid', className = '', children }: Props) {
  return <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={buttonClass(variant, className)}>{children}</a>;
}
export function MagneticLink({ href, variant = 'solid', className = '', children }: Omit<Props, 'external'>) {
  return <Link href={href} className={buttonClass(variant, className)}>{children}</Link>;
}
