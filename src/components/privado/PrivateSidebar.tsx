'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { logoutAction } from '@/app/login/actions';
import { LogoEPO } from '@/components/publico/LogoEPO';

export type NavItem = { href: string; label: string; icon: string; badge?: number | string };
export type NavGroup = { title?: string; items: NavItem[] };

type Role = 'alumno' | 'profesor' | 'admin' | 'director' | 'staff';

const rolMeta: Record<Role, { label: string; gradient: string; chip: string }> = {
  alumno:   { label: 'Portal alumno',    gradient: 'from-verde-oscuro via-verde to-verde-medio', chip: 'bg-verde-claro/20 text-verde-claro' },
  profesor: { label: 'Portal docente',   gradient: 'from-[#0b3b3a] via-verde-oscuro to-verde',   chip: 'bg-dorado/20 text-dorado-claro' },
  admin:    { label: 'Panel admin',      gradient: 'from-[#091f1e] via-[#103b39] to-verde-oscuro', chip: 'bg-white/15 text-white' },
  staff:    { label: 'Panel operativo',  gradient: 'from-[#091f1e] via-[#103b39] to-verde-oscuro', chip: 'bg-white/15 text-white' },
  director: { label: 'Dirección',        gradient: 'from-[#1a1200] via-[#3a2a05] to-verde-oscuro', chip: 'bg-dorado/25 text-dorado-claro' },
};

export function PrivateSidebar({
  role,
  groups,
  userName,
  userSub,
  logoUrl,
}: {
  role: Role;
  groups: NavGroup[];
  userName: string;
  userSub?: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const meta = rolMeta[role];

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('priv-sidebar-collapsed') : null;
    if (saved === '1') setCollapsed(true);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggle = () => {
    setCollapsed((v) => {
      const n = !v;
      if (typeof window !== 'undefined') localStorage.setItem('priv-sidebar-collapsed', n ? '1' : '0');
      return n;
    });
  };

  const width = collapsed ? 'lg:w-[78px]' : 'lg:w-[260px]';

  return (
    <>
      {/* Botón hamburguesa mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        className="lg:hidden fixed top-4 left-4 z-40 w-11 h-11 rounded-xl bg-white shadow-lg border border-gray-200 flex items-center justify-center text-verde-oscuro"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {/* Overlay móvil */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          group/side fixed lg:sticky top-0 left-0 h-screen z-50
          transition-[width,transform] duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          w-[260px] ${width}
          bg-gradient-to-b ${meta.gradient}
          text-white flex flex-col overflow-hidden
          shadow-2xl shadow-black/30
        `}
      >
        {/* Decor aurora */}
        <div className="aurora absolute inset-0 pointer-events-none opacity-30" aria-hidden />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.8) 1px, transparent 1px)", backgroundSize: '16px 16px' }}
          aria-hidden
        />

        {/* Header */}
        <div className="relative px-4 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: logoUrl ? 0 : 360, scale: 1.08 }}
              transition={{ duration: 0.7 }}
              className="shrink-0 relative w-11 h-11 rounded-xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center shadow-lg shadow-black/30 overflow-hidden"
            >
              {logoUrl ? (
                <LogoEPO url={logoUrl} size={38} />
              ) : (
                <span className="font-serif font-black text-dorado-claro text-sm">221</span>
              )}
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-verde-claro ring-2 ring-verde-oscuro animate-pulse" />
            </motion.div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="font-serif text-dorado-claro text-[13px] leading-tight truncate">EPO 221 · N. Bravo</div>
                <div className={`text-[10px] uppercase tracking-[0.25em] mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${meta.chip}`}>
                  {meta.label}
                </div>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar"
              className="lg:hidden w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.title && !collapsed && (
                <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.3em] text-white/45 font-semibold">
                  {g.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = pathname === it.href || (it.href !== '/' + role && pathname.startsWith(it.href + '/'));
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        title={collapsed ? it.label : undefined}
                        className={`
                          relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium
                          transition-colors duration-200
                          ${active ? 'text-verde-oscuro' : 'text-white/85 hover:text-white hover:bg-white/10'}
                        `}
                      >
                        {active && (
                          <motion.span
                            layoutId="priv-side-pill"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-white to-verde-claro/90 shadow-lg shadow-black/20"
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            aria-hidden
                          />
                        )}
                        {active && (
                          <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-dorado" aria-hidden />
                        )}
                        <span className={`relative z-10 text-lg shrink-0 ${active ? '' : 'opacity-80 group-hover/side:opacity-100'}`}>
                          {it.icon}
                        </span>
                        {!collapsed && (
                          <span className="relative z-10 flex-1 truncate">{it.label}</span>
                        )}
                        {!collapsed && it.badge != null && (
                          <span className={`relative z-10 text-[10px] px-2 py-0.5 rounded-full font-semibold ${active ? 'bg-verde-oscuro text-white' : 'bg-dorado/90 text-verde-oscuro'}`}>
                            {it.badge}
                          </span>
                        )}
                        {collapsed && it.badge != null && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-dorado" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer usuario */}
        <div className="relative border-t border-white/10 p-3 space-y-2">
          <div className={`flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-dorado to-verde-claro flex items-center justify-center text-verde-oscuro font-bold text-sm shadow">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{userName}</div>
                {userSub && <div className="text-[11px] text-white/60 truncate">{userSub}</div>}
              </div>
            )}
          </div>

          <form action={logoutAction} className="block">
            <button
              type="submit"
              title="Cerrar sesión"
              className={`w-full inline-flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/75 hover:text-white hover:bg-rose-500/20 transition ${collapsed ? 'justify-center' : ''}`}
            >
              <span className="text-base">↩</span>
              {!collapsed && <span>Cerrar sesión</span>}
            </button>
          </form>

          <button
            onClick={toggle}
            className="hidden lg:flex w-full items-center justify-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-white/90 py-1.5 rounded-lg hover:bg-white/5 transition"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <span>{collapsed ? '»' : '«'}</span>
            {!collapsed && <span>Colapsar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
