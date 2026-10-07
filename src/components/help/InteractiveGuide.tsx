'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { describeControl, describeModule, helpAppearance, HELP_VERSION, type HelpLink, type HelpRole } from '@/lib/help/catalog';
import { useModalFocus } from '@/lib/use-modal-focus';
import styles from './InteractiveGuide.module.css';

type Step = { title: string; explanation: string; element?: HTMLElement; href?: string };
type Mode = 'overview' | 'modules' | 'buttons';
type Position = { top: number; left: number; width: number; height: number };

function visibleControl(element: HTMLElement) {
  const style = getComputedStyle(element);
  return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    && !element.closest('[inert]:not([data-help-background]),[aria-hidden="true"],[data-help-root]')
    && !element.matches(':disabled,[aria-disabled="true"],input[type="hidden"]');
}

export function InteractiveGuide({ role, links, orientador = false, initiallyOpen = false }: { role: HelpRole; links: HelpLink[]; orientador?: boolean; initiallyOpen?: boolean }) {
  const pathname = usePathname();
  const appearance = helpAppearance[role];
  const roleTitle = role === 'profesor' && orientador ? 'Docente · Orientación' : appearance.title;
  const [open, setOpen] = useState(initiallyOpen);
  const [mode, setMode] = useState<Mode>('overview');
  const [steps, setSteps] = useState<Step[]>([]);
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState('');
  const [completed, setCompleted] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const root = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); launcher.current?.focus(); }, []);
  useModalFocus(open, root, close);
  const storageKey = `epo-help-v${HELP_VERSION}:${role}:${orientador ? 'orientacion' : 'general'}`;
  const current = steps[index];
  const context = describeModule(pathname, role, 'esta pantalla');
  const colorStyle = { '--help-color': appearance.color } as CSSProperties;

  useEffect(() => { if (open) root.current?.querySelector<HTMLElement>('#help-title')?.focus(); }, [open, mode]);

  useEffect(() => {
    if (!open || !root.current) return;
    const returnFocus = launcher.current;
    const hidden: HTMLElement[] = [];
    let branch: HTMLElement = root.current;
    // Inert the siblings at every level, preserving existing mobile-menu locks.
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.inert) {
          sibling.inert = true; sibling.dataset.helpBackground = 'true'; hidden.push(sibling);
        }
      }
      branch = branch.parentElement;
    }
    return () => { for (const element of hidden) { element.inert = false; delete element.dataset.helpBackground; } if (returnFocus?.isConnected) returnFocus.focus(); };
  }, [open]);

  // Route changes unmount only the dialog, preserving the always-available help entry.
  useEffect(() => {
    const changed = () => close();
    window.addEventListener('popstate', changed);
    return () => window.removeEventListener('popstate', changed);
  }, [close]);

  useEffect(() => {
    if (!open || mode !== 'buttons' || !current?.element?.isConnected) return;
    const element = current.element;
    const previousScroll = window.scrollY;
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
    // Keep the target above the help card on narrow displays.
    if (innerWidth < 640) window.scrollBy(0, innerHeight * .22);
    const update = () => {
      const rect = element.getBoundingClientRect();
      setPosition({ top: Math.max(0, rect.top - 4), left: Math.max(0, rect.left - 4), width: Math.min(rect.width + 8, innerWidth), height: rect.height + 8 });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update); setPosition(null); if (!element.isConnected) window.scrollTo(0, previousScroll); };
  }, [open, mode, current]);

  function begin() {
    try { setCompleted(localStorage.getItem(storageKey) === '1'); } catch { setCompleted(false); }
    setMode('overview'); setFilter(''); setIndex(0); setPosition(null); setOpen(true);
  }
  function moduleTour() {
    setSteps(links.map(link => ({ title: link.label, explanation: link.description ?? describeModule(link.href, role, link.label), href: link.href })));
    setIndex(0); setMode('modules');
  }
  function buttonsTour() {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('main button,main a[href],main summary,main input:not([type="hidden"]),main select,main textarea,header button,header a[href],header summary,nav button,nav a[href],nav summary,aside button,aside a[href],button[aria-label="Abrir menú"]'));
    const seen = new Set<string>();
    const controls: Step[] = [];
    for (const element of elements.filter(visibleControl)) {
      const input = element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
      const labelled = element.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ');
      const label = (element.getAttribute('aria-label') || labelled || (input && element.id ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(element.id)}"]`)?.textContent : '') || (input ? element.closest('label')?.childNodes[0]?.textContent : '') || element.getAttribute('title') || (input ? element.getAttribute('placeholder') || element.getAttribute('name') : element.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 100);
      if (!label || label === 'Saltar al contenido') continue;
      const href = element.getAttribute('href');
      const key = `${input ? 'campo' : 'accion'}:${label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      controls.push({ title: label, element, explanation: element.dataset.helpDescription || (input ? `Completa o selecciona «${label}» según las instrucciones de este formulario. Los campos con asterisco son obligatorios. Revisa los datos antes de guardar.` : describeControl(label, href, role, pathname)) });
    }
    setSteps(controls); setIndex(0); setMode('buttons');
  }
  function finish() {
    try { localStorage.setItem(storageKey, '1'); } catch { /* Help also works when storage is blocked. */ }
    setCompleted(true); setMode('overview'); setPosition(null);
  }

  return <div data-help-root style={colorStyle}>
    <button ref={launcher} type="button" onClick={begin} className={`${styles.launcher} ${role === 'publico' ? styles.publicLauncher : ''}`} aria-haspopup="dialog" aria-expanded={open} aria-label={`Abrir Guía de uso: ${roleTitle}`}><span aria-hidden>?</span> Guía de uso</button>
    {open && <div className={`${styles.layer} ${mode === 'buttons' ? styles.walkLayer : ''}`}>
      {mode === 'buttons' && position && <div className={styles.highlight} style={position} aria-hidden />}
      <section ref={root} role="dialog" aria-modal="true" aria-labelledby="help-title" aria-describedby="help-description" className={styles.dialog}>
        <div className={styles.header}><span className={styles.badge} data-help-role={role}>{roleTitle}</span><button type="button" onClick={close} aria-label="Cerrar guía">✕ Cerrar</button></div>
        <h2 id="help-title" tabIndex={-1}>{mode === 'overview' ? 'Tu guía del sistema' : mode === 'modules' ? 'Conoce tus secciones' : 'Botones de esta pantalla'}</h2>
        {mode === 'overview' ? <>
          <p id="help-description">{appearance.intro}</p>
          <p><strong>En esta pantalla:</strong> {context}</p>
          {orientador && <p>También tienes herramientas de orientación para los grupos que aparecen en tu menú.</p>}
          {completed && <p role="status">Ya completaste un recorrido. Puedes repetirlo cuando lo necesites.</p>}
          <div className={styles.choices}><button type="button" className={styles.primary} onClick={moduleTour}>Recorrer mis secciones</button><button type="button" onClick={buttonsTour}>Explicar botones de esta pantalla</button></div>
          <label htmlFor="help-filter">Encontrar una función</label><input id="help-filter" className={styles.filter} value={filter} onChange={event => setFilter(event.target.value)} placeholder="Por ejemplo: tareas, pagos o documentos" />
          <ul className={styles.list}>{links.filter(link => link.label.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(link => <li key={link.href}><Link href={link.href} onClick={close}><span>{link.label}</span><span aria-hidden>→</span></Link></li>)}</ul>
          <p>Abre una sección y vuelve a la guía para conocer sus controles. El recorrido explica las acciones; realizarlas sigue siendo tu decisión.</p>
        </> : <>
          <p id="help-description">{steps.length ? `Paso ${index + 1} de ${steps.length}` : 'No hay controles habilitados que explicar en esta pantalla. Puedes abrir una sección y repetir la guía.'}</p>
          {current && <><progress className={styles.progress} value={index + 1} max={steps.length} aria-label="Progreso de la guía" /><div aria-live="polite" aria-atomic="true"><h3>{current.title}</h3><p>{current.explanation}</p></div>{current.href && <Link className={styles.primary} href={current.href} onClick={close}>Abrir {current.title}</Link>}</>}
          <div className={styles.actions}><button type="button" disabled={index === 0} onClick={() => setIndex(value => Math.max(0, value - 1))}>Anterior</button>{index < steps.length - 1 ? <button type="button" className={styles.primary} onClick={() => setIndex(value => value + 1)}>Siguiente</button> : <button type="button" className={styles.primary} onClick={finish}>Terminar recorrido</button>}<button type="button" onClick={() => { setIndex(0); setPosition(null); }}>Reiniciar</button><button type="button" onClick={() => { setMode('overview'); setPosition(null); }}>Ver secciones</button></div>
        </>}
      </section>
    </div>}
  </div>;
}
