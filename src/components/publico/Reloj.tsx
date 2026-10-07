'use client';
import { useEffect, useState } from 'react';

const CLOCK = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const DAY = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long' });
const DATE = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short' });

type Props = {
  variant?: 'light' | 'dark';
  /** 'card' = tarjeta completa. 'compact' = versión inline para navbar. */
  size?: 'card' | 'compact';
  /** Solo afecta al modo compact: tono sobre fondo oscuro o claro. */
  tone?: 'onDark' | 'light';
};

export function Reloj({ variant = 'light', size = 'card', tone = 'onDark' }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => { if (!document.hidden) setNow(new Date()); };
    tick();
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);

  if (size === 'compact') {
    // Placeholder invisible mientras hidrata para evitar saltos
    if (!now) {
      return <div className="hidden md:flex items-center w-[120px] h-9" aria-hidden />;
    }
    const hora = CLOCK.format(now);
    const diaCorto = DAY.format(now).slice(0, 3);
    const fechaCorta = SHORT_DATE.format(now);

    const light = tone === 'light';
    return (
      <div
        className={`hidden md:flex items-center gap-2 rounded-full px-3.5 py-1.5 backdrop-blur-sm border ${
          light
            ? 'bg-verde-claro/20 border-verde/20 text-verde-oscuro'
            : 'bg-white/10 border-white/20 text-white/90'
        }`}
      >
        <span className={`text-[10px] uppercase tracking-widest ${light ? 'text-verde' : 'opacity-80'}`}>
          {diaCorto} · {fechaCorta}
        </span>
        <span className={`w-px h-4 ${light ? 'bg-verde/30' : 'bg-white/30'}`} aria-hidden />
        <span className="font-mono font-bold text-sm tabular-nums leading-none">
          {hora}
        </span>
      </div>
    );
  }

  if (!now) {
    return <div className="h-[110px] rounded-2xl bg-white/10 animate-pulse" aria-hidden />;
  }

  const dia = DAY.format(now);
  const fecha = DATE.format(now);
  const hora = CLOCK.format(now);

  const isDark = variant === 'dark';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl px-6 py-5 border shadow-lg ${
        isDark
          ? 'bg-linear-to-br from-verde-oscuro via-verde to-verde-medio text-white border-white/10 shadow-verde/30'
          : 'bg-white text-verde-oscuro border-verde/15 shadow-verde/10'
      }`}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle at 80% 20%, rgba(94,234,212,0.35), transparent 45%)'
            : 'radial-gradient(circle at 80% 20%, rgba(13,148,136,0.12), transparent 45%)',
        }}
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className={`text-[10px] uppercase tracking-[0.4em] ${isDark ? 'text-verde-claro' : 'text-verde'}`}>
            Hora oficial · Ecatepec
          </div>
          <div className="font-serif text-lg mt-1 capitalize">{dia}</div>
          <div className={`text-xs ${isDark ? 'text-white/70' : 'text-gray-500'} capitalize`}>{fecha}</div>
        </div>
        <div className="text-right">
          <div className="font-mono font-black text-3xl md:text-4xl tracking-tight tabular-nums">
            {hora}
          </div>
          <div className={`text-[10px] uppercase tracking-widest mt-0.5 ${isDark ? 'text-white/60' : 'text-gray-400'}`}>
            Ciudad de México
          </div>
        </div>
      </div>
    </div>
  );
}
