'use client';
import { motion } from 'framer-motion';

type Props = {
  eyebrow?: string;
  ghost?: string;          // Huge outlined number/letter behind the title
  title: string;
  titleAccent?: string;    // Last word(s) to highlight with shimmer
  subtitle?: string;
  align?: 'center' | 'left';
  tone?: 'dark' | 'light'; // 'light' for use on dark backgrounds
};

export function SectionHeader({
  eyebrow,
  ghost,
  title,
  titleAccent,
  subtitle,
  align = 'center',
  tone = 'dark',
}: Props) {
  const isLight = tone === 'light';
  const isCenter = align === 'center';

  const words = title.split(' ');
  const accent = titleAccent ?? words[words.length - 1];
  // Si el acento está al final del título, lo quitamos de la base para no duplicar.
  let base: string;
  if (titleAccent && title.toLowerCase().endsWith(titleAccent.toLowerCase())) {
    base = title.slice(0, title.length - titleAccent.length).trimEnd();
  } else if (titleAccent) {
    base = title;
  } else {
    base = words.slice(0, -1).join(' ');
  }

  return (
    <div className={`relative ${isCenter ? 'text-center' : 'text-left'} mb-10 md:mb-14`}>
      {/* ghost deshabilitado a petición del cliente */}
      <div className="relative">
        {eyebrow && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className={`inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.5em] mb-4 ${
              isLight ? 'text-verde-claro' : 'text-verde'
            }`}
          >
            <span className={`w-6 h-px ${isLight ? 'bg-verde-claro/70' : 'bg-verde/60'}`} />
            {eyebrow}
            <span className={`w-6 h-px ${isLight ? 'bg-verde-claro/70' : 'bg-verde/60'}`} />
          </motion.div>
        )}

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.2, 0.85, 0.2, 1] }}
          className={`font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.08] sm:leading-[1.05] ${
            isLight ? 'text-white' : 'text-verde-oscuro'
          }`}
        >
          {base && <span>{base} </span>}
          <span className="text-shimmer">{accent}</span>
        </motion.h2>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.85, 0.2, 1] }}
          className={`draw-rule mt-6 ${isCenter ? 'mx-auto' : ''}`}
          style={{ transformOrigin: isCenter ? 'center' : 'left' }}
          aria-hidden
        />

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className={`mt-5 max-w-2xl ${isCenter ? 'mx-auto' : ''} text-base md:text-lg leading-relaxed ${
              isLight ? 'text-white/80' : 'text-gray-600'
            }`}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </div>
  );
}
