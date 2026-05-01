'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoEPO } from './LogoEPO';
import { GobiernoBanner } from './GobiernoBanner';
import { Reloj } from './Reloj';
import { NavItem as NavLink } from './NavItem';

type NavItem = { href: string; label: string; icon?: string };

export function Navbar({ extras, escuela, logoUrl, cct }: { extras: NavItem[]; escuela: string; logoUrl?: string | null; cct?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [path]);

  const base: NavItem[] = [
    { href: '/publico',                label: 'Inicio',        icon: '✦' },
    { href: '/publico/oferta',         label: 'Oferta',        icon: '◈' },
    { href: '/publico/noticias',       label: 'Noticias',      icon: '❖' },
    { href: '/publico/conoce',         label: 'Recorrido',     icon: '✈' },
    { href: '/publico/albumes',        label: 'Galería',       icon: '◐' },
    { href: '/publico/convocatorias',  label: 'Convocatorias', icon: '✧' },
    { href: '/publico/descargas',      label: 'Descargas',     icon: '↓' },
    { href: '/publico/contacto',       label: 'Contacto',      icon: '✉' },
  ];
  const items = [...base, ...extras];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.2, 0.85, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      {/* ────── Franja institucional superior ────── */}
      <div
        className={`transition-all duration-500 border-b border-gray-200 backdrop-blur-xl bg-white/95 ${
          scrolled ? 'py-1' : 'py-1.5 md:py-2'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center min-w-0 flex-1 md:flex-none">
            <div className="md:hidden max-w-full">
              <GobiernoBanner className="max-w-full" height={scrolled ? 28 : 36} />
            </div>
            <div className="hidden md:block">
              <GobiernoBanner height={scrolled ? 48 : 64} />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <Reloj size="compact" tone="light" />
          </div>
        </div>
      </div>

      {/* ────── Barra principal ────── */}
      <div
        className={`transition-all duration-500 ${
          scrolled
            ? 'bg-verde/95 backdrop-blur-xl border-b border-white/20 shadow-xl shadow-verde/30 py-1.5'
            : 'bg-gradient-to-b from-verde/80 via-verde/35 to-transparent py-2'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-6">
          <Link href="/publico" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
            <motion.div
              whileHover={{ rotate: logoUrl ? 0 : 360, scale: 1.1 }}
              transition={{ duration: 0.8 }}
              className="flex items-center justify-center shrink-0"
            >
              <LogoEPO url={logoUrl} size={scrolled ? 40 : 48} />
            </motion.div>
            <div className="text-white leading-tight min-w-0">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.3em] opacity-80">EPO 221</div>
              <div className="font-serif text-white text-base sm:text-lg truncate">Nicolás Bravo</div>
              <div className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-verde-claro/90 mt-0.5">
                CCT {cct ?? '15EBH0409B'}
              </div>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {items.slice(0, 8).map((it) => (
              <NavLink
                key={it.href}
                href={it.href}
                label={it.label}
                icon={it.icon}
                active={path === it.href}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="hidden sm:inline-flex"
            >
              <Link
                href="/login"
                className="group relative overflow-hidden bg-white text-verde font-semibold px-5 py-2 rounded-full transition items-center gap-2 shadow-lg inline-flex"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <motion.span
                    aria-hidden
                    className="w-1.5 h-1.5 rounded-full bg-verde"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  Acceso
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
                {/* Shimmer sweep */}
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-verde-claro/40 to-transparent"
                />
              </Link>
            </motion.div>
            <button
              className="lg:hidden text-white p-2"
              aria-label="Menú"
              onClick={() => setOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                {open ? (
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden bg-verde/95 backdrop-blur-xl border-t border-white/20 max-h-[80vh] overflow-y-auto"
          >
            <div className="px-5 sm:px-6 py-4 flex flex-col gap-1">
              <Link
                href="/login"
                className="mb-2 bg-white text-verde font-bold text-center py-3 rounded-xl shadow-lg"
              >
                🔐 Acceso al portal
              </Link>
              {items.map((it, i) => {
                const active = path === it.href;
                return (
                  <motion.div
                    key={it.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.35 }}
                  >
                    <Link
                      href={it.href}
                      className={`group flex items-center gap-3 py-3 border-b border-white/10 last:border-0 transition ${
                        active ? 'text-white' : 'text-white/85 hover:text-white'
                      }`}
                    >
                      {it.icon && (
                        <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-white/10 text-xs group-hover:bg-white/20 group-hover:scale-110 transition">
                          {it.icon}
                        </span>
                      )}
                      <span className="flex-1">{it.label}</span>
                      <span className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition">
                        →
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
