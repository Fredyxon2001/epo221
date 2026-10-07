'use client';
import dynamic from 'next/dynamic';
import { useState, type CSSProperties } from 'react';
import type { HelpLink } from '@/lib/help/catalog';
import styles from './InteractiveGuide.module.css';

// Visitors download the walkthrough and its catalog only when requesting help.
const Guide = dynamic(() => import('./InteractiveGuide').then(module => module.InteractiveGuide), {
  loading: () => <span className={`${styles.launcher} ${styles.publicLauncher}`} role="status">Abriendo guía…</span>,
});
export function PublicGuideEntry({ links }: { links: HelpLink[] }) {
  const [requested, setRequested] = useState(false);
  return <div style={{ '--help-color': '#115e59' } as CSSProperties}>
    {requested ? <Guide role="publico" links={links} initiallyOpen /> : <button type="button" className={`${styles.launcher} ${styles.publicLauncher}`} aria-haspopup="dialog" aria-label="Abrir Guía de uso: Visitantes y familias" onClick={() => setRequested(true)}><span aria-hidden>?</span> Guía de uso</button>}
  </div>;
}
