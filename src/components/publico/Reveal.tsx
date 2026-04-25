'use client';
import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';

const variants: Variants = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export function Reveal({
  children,
  delay = 0,
  y = 40,
  className = '',
  as: Tag = 'div',
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: any;
  once?: boolean;
}) {
  const MotionTag = motion(Tag);
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.85, delay, ease: [0.2, 0.85, 0.2, 1] }}
    >
      {children}
    </MotionTag>
  );
}

export function Stagger({
  children,
  className = '',
  delay = 0,
  stagger = 0.1,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.85, 0.2, 1] } },
};
