'use client';
import { motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';

export function MotionItem({
  children,
  variants,
  className = '',
}: {
  children: ReactNode;
  variants: Variants;
  className?: string;
}) {
  return <motion.div variants={variants} className={className}>{children}</motion.div>;
}
