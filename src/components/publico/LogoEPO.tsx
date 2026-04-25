/**
 * Logo institucional EPO 221.
 * Si hay logo subido (URL en sitio_config), lo usa; si no, dibuja el escudo "221" dorado de fallback.
 */
export function LogoEPO({
  url,
  size = 44,
  glow = false,
  className = '',
}: {
  url?: string | null;
  size?: number;
  glow?: boolean;
  className?: string;
}) {
  if (url) {
    return (
      <span
        className={`inline-flex items-center justify-center ${glow ? 'drop-shadow-[0_0_12px_rgba(240,200,74,0.6)]' : ''} ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="EPO 221 Nicolás Bravo"
          width={size}
          height={size}
          className="object-contain w-full h-full"
        />
      </span>
    );
  }
  // Fallback: círculo dorado con "221"
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-dorado shadow-lg ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="font-serif font-black text-verde" style={{ fontSize: size * 0.36 }}>
        221
      </span>
    </span>
  );
}
