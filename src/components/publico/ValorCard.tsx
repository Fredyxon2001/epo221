'use client';
import { motion } from 'framer-motion';

const META: Record<string, { icon: string; from: string; to: string; glow: string; tint: string }> = {
  lucha:          { icon: '⚔',  from: '#0f766e', to: '#14b8a6', glow: 'rgba(20,184,166,0.35)',  tint: 'bg-teal-50' },
  transformación: { icon: '✦',  from: '#0891b2', to: '#22d3ee', glow: 'rgba(34,211,238,0.3)',   tint: 'bg-cyan-50' },
  transformacion: { icon: '✦',  from: '#0891b2', to: '#22d3ee', glow: 'rgba(34,211,238,0.3)',   tint: 'bg-cyan-50' },
  solidaridad:    { icon: '❀',  from: '#16a34a', to: '#4ade80', glow: 'rgba(74,222,128,0.35)',  tint: 'bg-emerald-50' },
  perseverancia:  { icon: '▲',  from: '#b45309', to: '#f59e0b', glow: 'rgba(245,158,11,0.35)',  tint: 'bg-amber-50' },
  humanismo:      { icon: '☼',  from: '#c2410c', to: '#fb923c', glow: 'rgba(251,146,60,0.35)',  tint: 'bg-orange-50' },
  compromiso:     { icon: '◈',  from: '#4338ca', to: '#818cf8', glow: 'rgba(129,140,248,0.35)', tint: 'bg-indigo-50' },
  democracia:     { icon: '✪',  from: '#be123c', to: '#fb7185', glow: 'rgba(251,113,133,0.35)', tint: 'bg-rose-50' },
  'pueblo (comunidad-unidad)': { icon: '⚘', from: '#065f46', to: '#10b981', glow: 'rgba(16,185,129,0.35)', tint: 'bg-emerald-50' },
  pueblo:         { icon: '⚘',  from: '#065f46', to: '#10b981', glow: 'rgba(16,185,129,0.35)',  tint: 'bg-emerald-50' },
  identidad:      { icon: '◉',  from: '#701a75', to: '#c026d3', glow: 'rgba(192,38,211,0.35)',  tint: 'bg-fuchsia-50' },
};

function metaFor(label: string) {
  const k = label.trim().toLowerCase();
  if (META[k]) return META[k];
  // Fallback: take first word
  const first = k.split(/[\s(]/)[0];
  return META[first] ?? { icon: '✧', from: '#0f766e', to: '#5eead4', glow: 'rgba(94,234,212,0.35)', tint: 'bg-teal-50' };
}

export function ValorCard({ index, label }: { index: number; label: string }) {
  const m = metaFor(label);
  const n = String(index + 1).padStart(2, '0');

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="group relative lift h-full"
    >
      {/* Glow halo */}
      <div
        className="absolute -inset-1 rounded-[28px] opacity-0 group-hover:opacity-100 blur-2xl transition duration-500 pointer-events-none"
        style={{ background: `radial-gradient(60% 60% at 50% 50%, ${m.glow}, transparent 70%)` }}
        aria-hidden
      />

      <div className="gradient-border relative h-full rounded-3xl bg-white p-6 overflow-hidden">
        {/* Corner tint */}
        <div
          className={`absolute -right-8 -top-8 w-28 h-28 rounded-full ${m.tint} blur-2xl opacity-70 pointer-events-none`}
          aria-hidden
        />

        <div className="relative flex items-start gap-4">
          {/* Icon chip with gradient + ring */}
          <div
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shrink-0"
            style={{
              background: `linear-gradient(135deg, ${m.from}, ${m.to})`,
              boxShadow: `0 10px 25px -5px ${m.glow}`,
            }}
          >
            <span className="drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">{m.icon}</span>
            <span
              className="absolute inset-0 rounded-2xl ring-1 ring-white/40 pointer-events-none"
              aria-hidden
            />
          </div>

          <div className="min-w-0 pt-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-1">
              Valor · {n}
            </div>
            <div className="font-serif text-xl text-verde-oscuro leading-tight capitalize">
              {label}
            </div>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          className="absolute left-6 right-6 bottom-4 h-[2px] rounded-full opacity-60 group-hover:opacity-100 transition"
          style={{ background: `linear-gradient(90deg, ${m.from}, ${m.to}, transparent)` }}
          aria-hidden
        />
      </div>
    </motion.div>
  );
}
