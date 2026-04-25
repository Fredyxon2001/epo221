import { createClient } from '@/lib/supabase/server';

/**
 * Fondo decorativo para páginas internas de /publico.
 * - Gradiente verde-agua muy tenue
 * - Logo de la escuela súper difuminado detrás
 * - Blobs teal/blanco y patrón de puntos para dar profundidad
 *
 * Se renderiza `fixed` detrás del contenido (z-index -10) para que siga visible
 * al hacer scroll sin bloquear clics.
 */
export async function PageBackdrop() {
  const supabase = createClient();
  const { data: cfg } = await supabase
    .from('sitio_config')
    .select('logo_url')
    .maybeSingle();
  const logo = cfg?.logo_url || null;

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradiente agua */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e0f7f4] via-white to-[#ccfbf1]" />

      {/* Logo gigante difuminado centrado */}
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[110vmin] h-[110vmin] object-contain opacity-[0.07] select-none"
          style={{ filter: 'blur(1.5px)' }}
        />
      )}

      {/* Blobs flotando */}
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-verde-claro/40 blob blur-3xl" />
      <div className="absolute top-1/3 -right-40 w-[440px] h-[440px] rounded-full bg-verde/20 blob blur-3xl" style={{ animationDelay: '-6s' }} />
      <div className="absolute -bottom-40 left-1/4 w-[380px] h-[380px] rounded-full bg-white blob blur-3xl opacity-70" style={{ animationDelay: '-12s' }} />

      {/* Patrón de puntos teal */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(rgba(13,148,136,0.25) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
        }}
      />

      {/* Viñeta blanca en bordes para legibilidad */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(255,255,255,0.5) 100%)' }}
      />
    </div>
  );
}
