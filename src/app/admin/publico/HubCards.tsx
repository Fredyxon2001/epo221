'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export type HubCard = {
  href: string;
  icon: string;
  title: string;
  desc: string;
  count?: number | string;
  badge?: string;
};

export function HubCards({ cards }: { cards: HubCard[] }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.href}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: i * 0.04, ease: [0.2, 0.85, 0.2, 1] }}
          whileHover={{ y: -3 }}
        >
          <Link
            href={c.href}
            className="block relative overflow-hidden bg-white rounded-xl shadow-sm border hover:shadow-xl hover:border-verde transition p-5 group h-full"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-verde-claro/20 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition"
            />
            <div className="flex items-start justify-between relative">
              <motion.div
                className="text-3xl"
                whileHover={{ scale: 1.15, rotate: -6 }}
                transition={{ type: 'spring', stiffness: 360, damping: 14 }}
              >
                {c.icon}
              </motion.div>
              <div className="flex items-center gap-2">
                {c.badge && (
                  <span className="bg-dorado text-verde text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {c.badge}
                  </span>
                )}
                {c.count !== undefined && (
                  <span className="text-xs text-gray-400 font-mono bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                    {c.count}
                  </span>
                )}
              </div>
            </div>
            <div className="font-serif text-lg text-verde mt-3 group-hover:text-verde-medio relative">
              {c.title}
            </div>
            <p className="text-xs text-gray-500 mt-1 relative">{c.desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-verde opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
              Abrir <span>→</span>
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
