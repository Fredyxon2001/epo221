import { ReactNode } from 'react';

/**
 * Capa aurora: mesh gradient animado (se define en globals.css como .aurora)
 * más una textura sutil de grano. Úsalo como envoltorio de una sección
 * para darle un acabado editorial/premium.
 */
export function AuroraBg({
  children,
  className = '',
  grain = true,
}: {
  children: ReactNode;
  className?: string;
  grain?: boolean;
}) {
  return (
    <section className={`relative overflow-hidden ${className}`}>
      <div className="aurora absolute inset-0 pointer-events-none" aria-hidden />
      {grain && <div className="grain absolute inset-0 pointer-events-none" aria-hidden />}
      <div className="relative">{children}</div>
    </section>
  );
}
