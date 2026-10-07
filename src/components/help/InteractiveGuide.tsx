'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { describeModule, helpAppearance, HELP_VERSION, type HelpLink, type HelpRole } from '@/lib/help/catalog';
import { authorizedHelpLinks, collectHelpControls, manualHelpLinks, moduleIntroduction, routeMatches, type HelpStep } from '@/lib/help/walkthrough';
import { clearHelpTransition, rememberHelpTransition, resetHelpIdentity, takeHelpTransition } from '@/lib/help/transition';
import { useModalFocus } from '@/lib/use-modal-focus';
import { GuideAvatar } from './GuideAvatar';
import styles from './InteractiveGuide.module.css';

type Mode = 'overview' | 'modules' | 'buttons';
type Position = { top: number; left: number; width: number; height: number };

export function InteractiveGuide({ role, links, orientador = false, initiallyOpen = false, identityKey, onClose }: { role: HelpRole; links: HelpLink[]; orientador?: boolean; initiallyOpen?: boolean; identityKey?: string; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const modules = useMemo(() => authorizedHelpLinks(links, role), [links, role]);
  const manual = useMemo(() => manualHelpLinks(links), [links]);
  const appearance = helpAppearance[role];
  const roleTitle = role === 'profesor' && orientador ? 'Docente · Orientación' : appearance.title;
  const [open, setOpen] = useState(initiallyOpen);
  const [mode, setMode] = useState<Mode>('overview');
  const [steps, setSteps] = useState<HelpStep[]>([]);
  const [index, setIndex] = useState(0);
  const [moduleIndex, setModuleIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [navigationError, setNavigationError] = useState(false);
  const [filter, setFilter] = useState('');
  const [completed, setCompleted] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const root = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const resumeIndex = useRef<number | null>(null);
  const previousIdentity = useRef({ role, orientador, identityKey });
  const close = useCallback(() => { clearHelpTransition(); setOpen(false); setNavigating(false); launcher.current?.focus(); onClose?.(); }, [onClose]);
  useModalFocus(open, root, close);
  const storageKey = 'epo-help-v' + HELP_VERSION + ':' + role + ':' + (orientador ? 'orientacion' : 'general');
  const current = steps[index];
  const activeModule = modules[moduleIndex];
  const context = describeModule(pathname, role, 'esta pantalla');
  const colorStyle = { '--help-color': appearance.color } as CSSProperties;

  useEffect(() => {
    const previous = previousIdentity.current;
    const changed = resetHelpIdentity(role, orientador, identityKey) || previous.role !== role || previous.orientador !== orientador || previous.identityKey !== identityKey;
    previousIdentity.current = { role, orientador, identityKey };
    if (changed) {
      clearHelpTransition(); setOpen(false); setMode('overview'); setSteps([]); setIndex(0); setModuleIndex(0); setCompleted(false); setPosition(null);
      return;
    }
    const transition = takeHelpTransition(role, orientador, identityKey);
    // Only a recent, explicitly requested navigation can reopen a new layout.
    if (transition && modules[transition.moduleIndex] && routeMatches(modules[transition.moduleIndex].href, pathname)) {
      resumeIndex.current = transition.controlIndex; setModuleIndex(transition.moduleIndex); setMode('modules'); setOpen(true);
    }
  }, [role, orientador, identityKey, modules, pathname]);

  useEffect(() => { if (open) root.current?.querySelector<HTMLElement>('#help-title')?.focus(); }, [open, mode, moduleIndex]);

  useEffect(() => {
    if (!open || !root.current) return;
    const returnFocus = launcher.current;
    const hidden: HTMLElement[] = [];
    let branch: HTMLElement = root.current;
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.inert) {
          sibling.inert = true; sibling.dataset.helpBackground = 'true'; hidden.push(sibling);
        }
      }
      branch = branch.parentElement;
    }
    return () => {
      for (const element of hidden) { element.inert = false; delete element.dataset.helpBackground; }
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || mode === 'overview') return;
    if (mode === 'modules' && (!activeModule || !routeMatches(activeModule.href, pathname))) {
      setNavigating(true);
      const timeout = window.setTimeout(() => setNavigationError(true), 20_000);
      return () => window.clearTimeout(timeout);
    }
    setNavigating(false); setNavigationError(false);
    let timer: number | undefined;
    let frame: number;
    const collect = () => {
      const controls = collectHelpControls(role, pathname, modules);
      const next = mode === 'modules' && activeModule ? [moduleIntroduction(activeModule, role), ...controls] : controls;
      setSteps(previous => {
        if (previous.length === next.length && previous.every((step, i) => step.key === next[i].key && step.element === next[i].element)) return previous;
        return next;
      });
      if (resumeIndex.current !== null) {
        setIndex(resumeIndex.current < 0 ? Math.max(0, next.length - 1) : Math.min(resumeIndex.current, Math.max(0, next.length - 1)));
        resumeIndex.current = null;
      } else setIndex(value => Math.min(value, Math.max(0, next.length - 1)));
    };
    // Wait for the navigation commit, then observe delayed or newly rendered controls.
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(collect); });
    const observer = new MutationObserver(records => {
      if (records.every(record => record.target instanceof Element && record.target.closest('[data-help-root]'))) return;
      window.clearTimeout(timer); timer = window.setTimeout(collect, 120);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'hidden', 'open', 'class'] });
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); observer.disconnect(); };
  }, [open, mode, activeModule, pathname, role, modules]);

  useEffect(() => {
    if (!open || mode === 'overview' || navigating || !current?.element?.isConnected) { setPosition(null); return; }
    const element = current.element;
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
    if (innerWidth < 640) window.scrollBy(0, innerHeight * .22);
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!element.isConnected) { setPosition(null); return; }
        const rect = element.getBoundingClientRect();
        setPosition({ top: Math.max(0, rect.top - 4), left: Math.max(0, rect.left - 4), width: Math.min(rect.width + 8, innerWidth), height: rect.height + 8 });
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', update); window.removeEventListener('scroll', update); };
  }, [open, mode, current, navigating]);

  function begin() {
    try { setCompleted(localStorage.getItem(storageKey) === '1'); } catch { setCompleted(false); }
    clearHelpTransition(); setMode('overview'); setFilter(''); setIndex(0); setPosition(null); setOpen(true);
  }
  function visitModule(nextIndex: number, controlIndex = 0) {
    const link = modules[nextIndex];
    if (!link) return;
    setModuleIndex(nextIndex); setIndex(0); setPosition(null); setNavigationError(false); setSteps([moduleIntroduction(link, role)]);
    resumeIndex.current = controlIndex;
    if (!routeMatches(link.href, pathname)) {
      setNavigating(true);
      rememberHelpTransition({ role, orientador, identityKey, links: modules, moduleIndex: nextIndex, controlIndex });
      router.push(link.href, { scroll: false });
    } else setNavigating(false);
  }
  function moduleTour() { setMode('modules'); visitModule(0); }
  function buttonsTour() { setSteps(collectHelpControls(role, pathname, modules)); setIndex(0); setPosition(null); setNavigating(false); setMode('buttons'); }
  function finish() {
    clearHelpTransition();
    try { localStorage.setItem(storageKey, '1'); } catch { /* Also works without storage. */ }
    setCompleted(true); setMode('overview'); setPosition(null);
  }
  function previousStep() {
    if (index > 0) setIndex(value => value - 1);
    else if (mode === 'modules' && moduleIndex > 0) visitModule(moduleIndex - 1, -1);
  }
  const walking = mode !== 'overview';
  const lastStep = index >= steps.length - 1;

  return <div data-help-root style={colorStyle}>
    <button ref={launcher} type="button" onClick={begin} className={styles.launcher + (role === 'publico' ? ' ' + styles.publicLauncher : '')} aria-haspopup="dialog" aria-expanded={open} aria-label={'Abrir Guía de uso: ' + roleTitle}><span aria-hidden>?</span> Guía de uso</button>
    {open && <div className={styles.layer + (walking ? ' ' + styles.walkLayer : '')}>
      {walking && position && <div className={styles.highlight} style={position} aria-hidden />}
      <section ref={root} role="dialog" aria-modal="true" aria-labelledby="help-title" aria-describedby="help-description" className={styles.dialog}>
        <div className={styles.header}><span className={styles.badge} data-help-role={role}>{roleTitle}</span><button type="button" onClick={close} aria-label="Cerrar guía">✕ Cerrar</button></div>
        <GuideAvatar role={role} orientador={orientador} compact={walking} />
        <h2 id="help-title" tabIndex={-1}>{mode === 'overview' ? 'Tu guía del sistema' : mode === 'modules' ? 'Conoce tus secciones' : 'Botones de esta pantalla'}</h2>
        {mode === 'overview' ? <>
          <p id="help-description">{appearance.intro}</p>
          <p><strong>En esta pantalla:</strong> {context}</p>
          {orientador && <p>También tienes herramientas de orientación para los grupos que aparecen en tu menú.</p>}
          {completed && <p role="status">Ya completaste un recorrido. Puedes repetirlo cuando lo necesites.</p>}
          <div className={styles.choices}><button type="button" className={styles.primary} disabled={!modules.length} onClick={moduleTour}>Recorrer mis secciones</button><button type="button" onClick={buttonsTour}>Explicar botones de esta pantalla</button></div>
          <label htmlFor="help-filter">Encontrar una función</label><input id="help-filter" className={styles.filter} value={filter} onChange={event => setFilter(event.target.value)} placeholder="Por ejemplo: tareas, pagos o documentos" />
          <ul className={styles.list}>{modules.filter(link => link.label.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(link => <li key={link.href}><Link href={link.href} onClick={close}><span>{link.label}</span><span aria-hidden>→</span></Link><button type="button" onClick={() => { setMode('modules'); visitModule(modules.indexOf(link)); }}>Guiar {link.label}</button></li>)}</ul>
          {manual.length > 0 && <><p><strong>Documentos de apertura manual:</strong> la guía explica estas opciones sin generar ni descargar archivos.</p><ul className={styles.list}>{manual.filter(link => link.label.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(link => <li key={link.href}><p><strong>{link.label}:</strong> {describeModule(link.href, role, link.label)}</p><a href={link.href} onClick={close}>Abrir {link.label}</a></li>)}</ul></>}
          <p>El recorrido visita cada módulo y explica sus controles antes de avanzar. La guía no pulsa acciones, envía formularios ni lee tus datos.</p>
        </> : <>
          {mode === 'modules' && <p className={styles.moduleCounter}>Módulo {moduleIndex + 1} de {modules.length} · {activeModule?.label}</p>}
          <p id="help-description">{navigating ? 'Abriendo módulo… La guía continuará al cargar la pantalla.' : steps.length ? 'Paso ' + (index + 1) + ' de ' + steps.length + (current?.kind === 'intro' ? ' · Introducción del módulo' : ' · Control de la pantalla') : 'No hay controles habilitados que explicar en esta pantalla.'}</p>
          {navigationError && <p role="status">La pantalla está tardando en abrirse. Puedes volver al módulo anterior, reintentar o cerrar la guía.</p>}
          {!navigating && current && <><progress className={styles.progress} value={index + 1} max={steps.length} aria-label="Progreso del módulo" /><div aria-live="polite" aria-atomic="true"><h3>{current.title}</h3><p>{current.explanation}</p></div></>}
          {!navigating && lastStep && mode === 'modules' && <p role="status">Fin del módulo. Ya revisaste su introducción y los controles disponibles. Las acciones repetidas por fila se explican una vez por patrón.</p>}
          <div className={styles.actions}>
            <button type="button" disabled={index === 0 && (mode !== 'modules' || moduleIndex === 0)} onClick={previousStep}>Anterior</button>
            {navigating ? <button type="button" className={styles.primary} onClick={() => visitModule(moduleIndex)}>Reintentar módulo</button>
              : !lastStep ? <button type="button" className={styles.primary} onClick={() => setIndex(value => value + 1)}>Siguiente</button>
                : mode === 'modules' && moduleIndex < modules.length - 1 ? <button type="button" className={styles.primary} onClick={() => visitModule(moduleIndex + 1)}>Siguiente módulo</button>
                  : <button type="button" className={styles.primary} onClick={finish}>Terminar recorrido</button>}
            <button type="button" disabled={navigating} onClick={() => { setIndex(0); setPosition(null); }}>Reiniciar</button>
            <button type="button" onClick={() => { clearHelpTransition(); setMode('overview'); setNavigating(false); setPosition(null); }}>Ver secciones</button>
          </div>
        </>}
      </section>
    </div>}
  </div>;
}
