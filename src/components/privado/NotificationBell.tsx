'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Noti = { id: string; titulo: string; mensaje: string | null; url: string | null; leida: boolean; created_at: string };

function rel(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'justo ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString('es-MX');
}

export function NotificationBell({ count, items }: { count: number; items: Noti[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        className="relative w-10 h-10 rounded-xl bg-white border border-gray-200 hover:border-verde/50 hover:bg-crema transition flex items-center justify-center"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-verde-oscuro">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 21a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
          >
            {count > 9 ? '9+' : count}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-[360px] max-w-[92vw] bg-white rounded-2xl shadow-2xl shadow-verde-oscuro/20 border border-gray-200 overflow-hidden z-50"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-verde-oscuro to-verde text-white flex items-center justify-between">
              <div>
                <div className="font-serif text-base">Notificaciones</div>
                <div className="text-[11px] text-white/70">{count > 0 ? `${count} sin leer` : 'Todo al día'}</div>
              </div>
              <span className="text-xl">🔔</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                  <div className="text-3xl mb-2">📭</div>
                  No tienes notificaciones.
                </div>
              ) : (
                items.map((n) => {
                  const body = (
                    <div className={`px-4 py-3 hover:bg-crema/60 transition ${!n.leida ? 'bg-verde-claro/10' : ''}`}>
                      <div className="flex items-start gap-2">
                        {!n.leida && <span className="mt-1.5 w-2 h-2 rounded-full bg-verde shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-verde-oscuro">{n.titulo}</div>
                          {n.mensaje && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.mensaje}</div>}
                          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{rel(n.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  );
                  return n.url ? (
                    <Link key={n.id} href={n.url} onClick={() => setOpen(false)}>{body}</Link>
                  ) : (
                    <div key={n.id}>{body}</div>
                  );
                })
              )}
            </div>
            {items.length > 0 && (
              <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-center">
                <span className="text-[11px] text-gray-500">Las notificaciones se marcan al abrirlas</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
