'use client';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

// -------------------- StatCard --------------------
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'verde',
  delta,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
  tone?: 'verde' | 'dorado' | 'rosa' | 'azul' | 'slate';
  delta?: { value: string; positive?: boolean };
  href?: string;
}) {
  const tones: Record<string, { grad: string; chip: string; dot: string }> = {
    verde:  { grad: 'from-verde-oscuro via-verde to-verde-medio',      chip: 'bg-white/15 text-verde-claro', dot: 'bg-verde-claro' },
    dorado: { grad: 'from-[#5b4306] via-[#8a6a10] to-dorado',           chip: 'bg-white/15 text-dorado-claro', dot: 'bg-dorado-claro' },
    rosa:   { grad: 'from-rose-900 via-rose-700 to-rose-500',           chip: 'bg-white/15 text-rose-100',     dot: 'bg-rose-200' },
    azul:   { grad: 'from-sky-900 via-sky-700 to-sky-500',              chip: 'bg-white/15 text-sky-100',      dot: 'bg-sky-200' },
    slate:  { grad: 'from-slate-900 via-slate-700 to-slate-500',        chip: 'bg-white/15 text-slate-100',    dot: 'bg-slate-200' },
  };
  const t = tones[tone];
  const Wrap = href ? 'a' : 'div';
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: [0.2, 0.85, 0.2, 1] }}
      className="h-full"
    >
      <Wrap
        {...(href ? { href } : {})}
        className={`lift spotlight group relative block rounded-2xl overflow-hidden text-white bg-gradient-to-br ${t.grad} p-5 h-full shadow-xl shadow-black/10`}
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blob blur-2xl" aria-hidden />
        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] px-2 py-0.5 rounded-full ${t.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${t.dot} animate-pulse`} />
              {label}
            </div>
            <div className="font-serif text-4xl md:text-5xl mt-3 leading-none tabular-nums">{value}</div>
            {hint && <div className="text-xs text-white/75 mt-2 line-clamp-2">{hint}</div>}
            {delta && (
              <div className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${delta.positive ? 'text-verde-claro' : 'text-rose-200'}`}>
                <span>{delta.positive ? '▲' : '▼'}</span>{delta.value}
              </div>
            )}
          </div>
          {icon && (
            <div className="text-3xl opacity-80 group-hover:scale-110 transition-transform">{icon}</div>
          )}
        </div>
      </Wrap>
    </motion.div>
  );
}

// -------------------- Card --------------------
export function Card({
  title,
  eyebrow,
  action,
  children,
  padding = 'normal',
  className = '',
}: {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  padding?: 'normal' | 'tight' | 'none';
  className?: string;
}) {
  const pad = padding === 'none' ? '' : padding === 'tight' ? 'p-4' : 'p-6';
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
      className={`bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 ring-1 ring-verde-oscuro/5 shadow-[0_4px_24px_-8px_rgba(11,52,51,0.12)] hover:shadow-[0_8px_30px_-8px_rgba(11,52,51,0.2)] transition-shadow ${className}`}
    >
      {(title || eyebrow || action) && (
        <div className={`flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-white/50`}>
          <div className="min-w-0">
            {eyebrow && <div className="text-[10px] uppercase tracking-[0.3em] text-verde font-semibold">{eyebrow}</div>}
            {title && <h3 className="font-serif text-lg md:text-xl text-verde-oscuro mt-1 truncate">{title}</h3>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={pad}>{children}</div>
    </motion.section>
  );
}

// -------------------- Badge --------------------
export function Badge({
  children,
  tone = 'gray',
  size = 'md',
}: {
  children: ReactNode;
  tone?: 'gray' | 'verde' | 'dorado' | 'rosa' | 'azul' | 'ambar' | 'violeta';
  size?: 'sm' | 'md';
}) {
  const tones: Record<string, string> = {
    gray:    'bg-gray-100 text-gray-700 border-gray-200',
    verde:   'bg-verde-claro/30 text-verde-oscuro border-verde/30',
    dorado:  'bg-dorado/20 text-[#6b4d05] border-dorado/40',
    rosa:    'bg-rose-100 text-rose-700 border-rose-200',
    azul:    'bg-sky-100 text-sky-700 border-sky-200',
    ambar:   'bg-amber-100 text-amber-800 border-amber-200',
    violeta: 'bg-violet-100 text-violet-700 border-violet-200',
  };
  const sz = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider ${tones[tone]} ${sz}`}>
      {children}
    </span>
  );
}

// -------------------- EmptyState --------------------
export function EmptyState({
  icon = '✨',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-5xl mb-3">{icon}</div>
      <div className="font-serif text-lg text-verde-oscuro">{title}</div>
      {description && <div className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// -------------------- PageHeader --------------------
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="text-[11px] uppercase tracking-[0.3em] text-verde font-semibold mb-1.5">{eyebrow}</div>}
        <h2 className="font-serif text-2xl md:text-3xl text-verde-oscuro">{title}</h2>
        {description && <p className="text-sm md:text-[15px] text-gray-500 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// -------------------- Countdown ------------------
export function Countdown({ target, label }: { target: string; label?: string }) {
  // pure SSR-safe string
  const d = new Date(target);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const over = diff <= 0;
  const days = Math.floor(Math.abs(diff) / 86_400_000);
  const hours = Math.floor((Math.abs(diff) % 86_400_000) / 3_600_000);
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${over ? 'bg-rose-100 text-rose-700 border-rose-200' : days <= 2 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-verde-claro/30 text-verde-oscuro border-verde/30'}`}>
      <span>⏱</span>
      {over ? `Venció hace ${days}d ${hours}h` : `${label ?? 'Vence en'} ${days}d ${hours}h`}
    </div>
  );
}
