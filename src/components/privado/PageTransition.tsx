'use client';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/**
 * Envoltorio de animación para las páginas privadas.
 * Produce un fade/slide sutil en cada navegación para dar sensación
 * premium sin entorpecer la lectura.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.85, 0.2, 1] }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
