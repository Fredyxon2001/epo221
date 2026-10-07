'use client';
import { useModalFocus } from '@/lib/use-modal-focus';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { LogoEPO } from './LogoEPO';
import { GobiernoBanner } from './GobiernoBanner';
import { Reloj } from './Reloj';
import { NavItem as NavLink } from './NavItem';

type NavItem = { href: string; label: string; icon?: string };

export function Navbar({ extras, escuela, logoUrl, cct }: { extras: NavItem[]; escuela: string; logoUrl?: string | null; cct?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const root=useRef<HTMLElement>(null);
  const desktopMenu = useRef<HTMLDetailsElement>(null);
  const close=useCallback(()=>setOpen(false),[]);
  useModalFocus(open,root,close);

  useEffect(() => {
    // Se leen ambas fuentes: algunos navegadores reportan el desplazamiento en
    // documentElement y no en window.scrollY.
    const onScroll = () =>
      setScrolled((window.scrollY || document.documentElement.scrollTop || 0) > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => { setOpen(false); if (desktopMenu.current) desktopMenu.current.open = false; }, [path]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && desktopMenu.current?.open) {
        desktopMenu.current.open = false;
        desktopMenu.current.querySelector('summary')?.focus();
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (desktopMenu.current?.open && event.target instanceof Node && !desktopMenu.current.contains(event.target)) desktopMenu.current.open = false;
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onOutside); };
  }, []);

  const base: NavItem[] = [{href:'/publico/guia',label:'Guía escolar',icon:'ℹ'},
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
  // Contact stays in the main desktop row; every other section remains reachable
  // in a native details menu, even before JavaScript is available.
  const primary = base.filter(item => !['/publico/guia', '/publico/conoce', '/publico/albumes'].includes(item.href));
  const more = items.filter(item => !primary.some(main => main.href === item.href));

  // Sin animación de entrada a propósito. La barra de navegación es el acceso
  // principal del sitio y debe estar visible desde el primer fotograma:
  // cualquier animación que arranque en opacity:0 o desplazada la deja
  // invisible mientras no se ejecute (pestaña en segundo plano, hidratación
  // lenta, animaciones diferidas), y entonces no se ve ni se puede pulsar.
  return (
    <nav ref={root} role={open?'dialog':undefined} aria-modal={open||undefined} aria-label="Menú principal" className="fixed top-0 left-0 right-0 z-50">
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

      {/* ────── Barra principal ──────
          El fondo NUNCA baja de verde/75: antes terminaba en `to-transparent` y,
          al scrollear sobre las secciones blancas, el texto blanco del menú
          quedaba invisible y no se podía dar clic. La legibilidad ya no depende
          del estado JS de scroll; ese estado solo refuerza sombra y compactado. */}
      <div
        className={`transition-all duration-500 backdrop-blur-md ${
          scrolled
            ? 'bg-verde/95 backdrop-blur-xl border-b border-white/20 shadow-xl shadow-verde/30 py-1.5'
            : 'bg-linear-to-b from-verde/95 via-verde/95 to-verde/90 py-2'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-6">
          <Link href="/publico" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
            <div className="flex items-center justify-center shrink-0 motion-safe:transition-transform motion-safe:group-hover:scale-105">
              <LogoEPO url={logoUrl} size={scrolled ? 40 : 48} />
            </div>
            <div className="text-white leading-tight min-w-0">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.3em] opacity-80">EPO 221</div>
              <div className="font-serif text-white text-base sm:text-lg truncate">Nicolás Bravo</div>
              <div className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-verde-claro/90 mt-0.5">
                CCT {cct ?? '15EBH0409B'}
              </div>
            </div>
          </Link>

          {/* Six primary links fit from xl; the remaining sections use an accessible native menu. */}
          <div className="hidden xl:flex items-center gap-0.5 2xl:gap-1 flex-1 justify-center min-w-0">
            {primary.map((it) => (
              <NavLink
                key={it.href}
                href={it.href}
                label={it.label}
                icon={it.icon}
                active={path === it.href}
              />
            ))}
            <details ref={desktopMenu} className="relative shrink-0">
              <summary className={`cursor-pointer list-none rounded-full px-3 py-2 text-[13px] font-medium ${more.some(it => path === it.href) ? 'bg-white text-verde-oscuro' : 'text-white hover:bg-white/10'}`}>Más secciones <span aria-hidden>▾</span></summary>
              <div className="absolute right-0 top-full mt-3 w-72 max-h-[65vh] overflow-y-auto rounded-2xl border border-verde/15 bg-white p-2 shadow-xl">
                {more.map(it => <Link key={it.href} href={it.href} aria-current={path === it.href ? 'page' : undefined} className={`block rounded-xl px-4 py-3 text-sm hover:bg-verde/10 focus-visible:bg-verde/10 ${path === it.href ? 'bg-verde/10 font-semibold text-verde-oscuro' : 'text-verde-oscuro'}`}>{it.label}</Link>)}
              </div>
            </details>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:inline-flex">
              <Link
                href="/login"
                className="group relative overflow-hidden bg-white text-verde font-semibold px-5 py-2 rounded-full transition items-center gap-2 shadow-lg inline-flex"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="w-1.5 h-1.5 rounded-full bg-verde"
                  />
                  Acceso
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
                {/* Shimmer sweep */}
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-verde-claro/40 to-transparent"
                />
              </Link>
            </div>
            <button
              className="xl:hidden text-white p-2"
              aria-label="Menú" aria-expanded={open} aria-controls="menu-publico-movil"
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
        {open && (
          <div id="menu-publico-movil"
            className="xl:hidden overflow-hidden bg-verde/95 backdrop-blur-xl border-t border-white/20 max-h-[80vh] overflow-y-auto"
          >
            <div className="px-5 sm:px-6 py-4 flex flex-col gap-1">
              <Link
                href="/login"
                onClick={close}
                className="mb-2 bg-white text-verde font-bold text-center py-3 rounded-xl shadow-lg"
              >
                🔐 Acceso al portal
              </Link>
              {items.map((it) => {
                const active = path === it.href;
                return (
                  <div
                    key={it.href}
                  >
                    <Link
                      href={it.href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={`group flex items-center gap-3 py-3 border-b border-white/10 last:border-0 transition ${
                        active ? 'text-white' : 'text-white/85 hover:text-white'
                      }`}
                    >
                      {it.icon && (
                        <span aria-hidden className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-white/10 text-xs group-hover:bg-white/20 group-hover:scale-110 transition">
                          {it.icon}
                        </span>
                      )}
                      <span className="flex-1">{it.label}</span>
                      <span aria-hidden className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition">
                        →
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      <noscript><details className="xl:hidden border-t border-white/20 bg-verde text-white"><summary className="cursor-pointer px-5 py-3">Ver todas las secciones</summary><div className="max-h-[60vh] overflow-y-auto px-5 pb-4">{items.map(it => <Link key={it.href} href={it.href} className="block py-2">{it.label}</Link>)}<Link href="/login" className="block py-2">Acceso al portal</Link></div></details></noscript>
    </nav>
  );
}
