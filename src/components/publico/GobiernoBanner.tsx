'use client';
import { useState } from 'react';

/**
 * Franja oficial Gobierno del Estado de México · SEIEM / Educación.
 *
 * Usa dos archivos generados por `scripts/process-gobierno-banner.mjs`:
 *   public/img/gobierno-edomex-sep.png     (@1x, ~96 px de alto)
 *   public/img/gobierno-edomex-sep@2x.png  (@2x, ~192 px de alto)
 *
 * Si la imagen no existe, el componente se oculta silenciosamente.
 */
export function GobiernoBanner({
  className = '',
  height = 40,
}: {
  className?: string;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  const v = 'v=4';

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/img/gobierno-edomex-sep.png?${v}`}
      srcSet={`/img/gobierno-edomex-sep.png?${v} 1x, /img/gobierno-edomex-sep@2x.png?${v} 2x`}
      alt=""
      aria-label="Gobierno del Estado de México · Secretaría de Educación, Ciencia, Tecnología e Innovación"
      className={`block w-auto object-contain select-none ${className}`}
      style={{
        height,
        // Mejora la nitidez al hacer downscale en navegadores Chromium/WebKit
        imageRendering: 'auto',
      }}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
