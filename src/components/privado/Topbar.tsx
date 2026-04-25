'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { NotificationBell } from './NotificationBell';
import { saludoPorHora } from '@/lib/saludo';

export function Topbar({
  greeting,
  userName,
  userSub,
  role,
  notiCount = 0,
  notiItems = [],
}: {
  greeting?: string;
  userName: string;
  userSub?: string;
  role: 'alumno' | 'profesor' | 'admin' | 'director' | 'staff';
  notiCount?: number;
  notiItems?: { id: string; titulo: string; mensaje: string | null; url: string | null; leida: boolean; created_at: string }[];
}) {
  const [hora, setHora] = useState<string>('');
  const [fecha, setFecha] = useState<string>('');
  const [saludoLocal, setSaludoLocal] = useState<string | undefined>(greeting);
  useEffect(() => {
    const upd = () => {
      const d = new Date();
      setHora(d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
      setFecha(d.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' }));
      setSaludoLocal(saludoPorHora(d));
    };
    upd();
    const id = setInterval(upd, 30_000);
    return () => clearInterval(id);
  }, []);

  const rolTag: Record<typeof role, { text: string; cls: string }> = {
    alumno:   { text: 'Alumno',   cls: 'bg-verde-claro/30 text-verde-oscuro border-verde/30' },
    profesor: { text: 'Docente',  cls: 'bg-dorado/20 text-[#6b4d05] border-dorado/40' },
    admin:    { text: 'Admin',    cls: 'bg-verde text-white border-verde-oscuro' },
    staff:    { text: 'Staff',    cls: 'bg-slate-700 text-white border-slate-900' },
    director: { text: 'Director', cls: 'bg-gradient-to-r from-dorado to-dorado-claro text-verde-oscuro border-dorado' },
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/55 border-b border-white/50">
      <div className="px-4 lg:px-8 py-3 flex items-center gap-3 md:gap-5">
        <div className="min-w-0 flex-1 pl-14 lg:pl-0">
          {(saludoLocal ?? greeting) && (
            <motion.div
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              className="text-sm md:text-base text-verde-oscuro"
            >
              <span className="text-gray-500">{saludoLocal ?? greeting},</span>{' '}
              <span className="font-semibold">{userName}</span>
            </motion.div>
          )}
          {fecha && (
            <div className="text-[11px] text-gray-400 capitalize hidden sm:block">{fecha}</div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[12px] text-gray-600 font-mono tabular-nums bg-white/60 border border-gray-200 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-verde animate-pulse" />
          {hora}
        </div>

        <NotificationBell count={notiCount} items={notiItems} />

        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="text-right min-w-0 max-w-[180px]">
            {userSub && <div className="text-[11px] text-gray-500 truncate">{userSub}</div>}
          </div>
          <span className={`text-[10px] uppercase tracking-[0.25em] px-2.5 py-1 rounded-full border font-semibold whitespace-nowrap ${rolTag[role].cls}`}>
            {rolTag[role].text}
          </span>
        </div>
      </div>
    </header>
  );
}
