'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { peekHelpTransition, type HelpViewer } from '@/lib/help/transition';
import type { HelpLink } from '@/lib/help/catalog';
import styles from './InteractiveGuide.module.css';

// Visitors download the walkthrough and its catalog only when requesting help.
const Guide = dynamic(() => import('./InteractiveGuide').then(module => module.InteractiveGuide), {
  loading: () => <span className={`${styles.launcher} ${styles.publicLauncher}`} role="status">Abriendo guía…</span>,
});
export function PublicGuideEntry({ links, viewerIdentity, onlyResume = false }: { links: HelpLink[]; viewerIdentity?: HelpViewer | null; onlyResume?: boolean }) {
  const [requested, setRequested] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [resuming, setResuming] = useState<ReturnType<typeof peekHelpTransition>>(null);
  const entry = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const transition = peekHelpTransition(viewerIdentity);
    if (transition?.links[transition.moduleIndex]?.href.split('?')[0] === pathname && (!onlyResume || transition.role !== 'publico')) {
      setResuming(transition); setAutoOpen(true); setRequested(true);
    }
  }, [pathname, viewerIdentity, onlyResume]);
  useEffect(() => {
    if (resuming && resuming.role !== 'publico' && (resuming.identityKey !== viewerIdentity?.id || resuming.role !== viewerIdentity?.role)) {
      setResuming(null); setRequested(false); setAutoOpen(false);
    }
  }, [resuming, viewerIdentity]);
  const clearPrivateContext = useCallback(() => {
    setResuming(null); setAutoOpen(false);
    if (!onlyResume) requestAnimationFrame(() => entry.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.focus());
  }, [onlyResume]);
  if (onlyResume && !resuming) return null;
  return <div ref={entry} style={{ '--help-color': '#115e59' } as CSSProperties}>
    {requested ? <Guide key={resuming?.role ?? 'publico'} role={resuming?.role ?? 'publico'} links={resuming?.links ?? links} identityKey={resuming?.identityKey} orientador={resuming?.orientador} initiallyOpen={autoOpen} onClose={resuming && resuming.role !== 'publico' ? clearPrivateContext : undefined} /> : <button type="button" className={`${styles.launcher} ${styles.publicLauncher}`} aria-haspopup="dialog" aria-label="Abrir Guía de uso: Visitantes y familias" onClick={() => { setAutoOpen(true); setRequested(true); }}><span aria-hidden>?</span> Guía de uso</button>}
  </div>;
}
