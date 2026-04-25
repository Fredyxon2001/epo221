'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';

type Props = {
  href: string;
  label: string;
  icon?: string;
  active: boolean;
};

/**
 * Item de navegación con micro-interacciones (versión nítida, sin filtros sobre el texto):
 *  - Píldora blanca compartida entre items (layoutId) que se desliza al activo
 *  - Underline degradado que se dibuja desde el centro al hacer hover
 *  - Icono glífico que hace "pop" al hover
 *  - Punto pulsante decorativo cuando está activo
 */
export function NavItem({ href, label, icon, active }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full transition-colors duration-200 ${
        active ? 'text-verde-oscuro' : 'text-white/85 hover:text-white'
      }`}
      style={{ WebkitFontSmoothing: 'antialiased' }}
    >
      {/* Píldora blanca compartida cuando está activo */}
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 rounded-full bg-white shadow-lg shadow-black/10"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          aria-hidden
        />
      )}

      {/* Contenido */}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {icon && (
          <motion.span
            aria-hidden
            className={`text-[11px] inline-block ${active ? 'text-verde' : 'opacity-70'}`}
            animate={{
              rotate: hovered && !active ? [0, -10, 10, 0] : 0,
              scale: hovered ? 1.15 : 1,
            }}
            transition={{ duration: 0.45 }}
          >
            {icon}
          </motion.span>
        )}
        <span>{label}</span>
      </span>

      {/* Subrayado animado al hover (solo cuando NO está activo) */}
      {!active && (
        <motion.span
          aria-hidden
          className="absolute left-4 right-4 -bottom-0.5 h-[2px] rounded-full origin-center bg-gradient-to-r from-verde-claro via-white to-verde-claro"
          initial={false}
          animate={{ scaleX: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.85, 0.2, 1] }}
        />
      )}

      {/* Puntito pulsante arriba cuando activo */}
      {active && (
        <motion.span
          aria-hidden
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-verde-claro"
          animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}
    </Link>
  );
}
