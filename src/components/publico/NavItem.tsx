import Link from 'next/link';

type Props = {
  href: string;
  label: string;
  icon?: string;
  active: boolean;
};

/**
 * Navegación visible desde SSR, con estado activo semántico y feedback CSS.
 * No necesita animaciones de layout, timers ni renders al mover el puntero.
 */
export function NavItem({ href, label, icon, active }: Props) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group relative px-2.5 2xl:px-3 py-2 text-[13px] 2xl:text-sm font-medium whitespace-nowrap rounded-full transition-colors duration-200 ${
        active ? 'bg-white text-verde-oscuro shadow-sm' : 'text-white/85 hover:text-white hover:bg-white/10'
      }`}
      style={{ WebkitFontSmoothing: 'antialiased' }}
    >
      {/* Contenido */}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {icon && (
          <span
            aria-hidden
            /* Los glifos se reservan para pantallas anchas. */
            className={`hidden 2xl:inline-block text-[11px] ${active ? 'text-verde' : 'opacity-70'}`}
          >
            {icon}
          </span>
        )}
        <span>{label}</span>
      </span>

      {/* Subrayado animado al hover (solo cuando NO está activo) */}
      {!active && (
        <span
          aria-hidden
          className="absolute left-2.5 right-2.5 -bottom-0.5 h-[2px] rounded-full origin-center bg-verde-claro scale-x-0 group-hover:scale-x-100 motion-safe:transition-transform"
        />
      )}

      {/* Distintivo decorativo cuando está activo */}
      {active && (
        <span
          aria-hidden
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-verde-claro"
        />
      )}
    </Link>
  );
}
