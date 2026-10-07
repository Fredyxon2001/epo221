import { describeControl, describeField, describeModule, type HelpLink, type HelpRole } from './catalog';

export type HelpStep = { key: string; title: string; explanation: string; element?: HTMLElement; kind: 'intro' | 'control' };
const selectors = 'button,a[href],summary,input:not([type="hidden"]),select,textarea,[role="button"],[role="tab"],[role="switch"],[role="checkbox"]';

/** Navigation is an explicit allowlist from the account's already-filtered menu. */
export function safeHelpHref(href: string): string | null {
  if (!href.startsWith('/') || href.startsWith('//') || /[\\\u0000-\u0020]/.test(href)) return null;
  try {
    const url = new URL(href, 'https://help.invalid');
    const decoded = decodeURIComponent(url.pathname);
    if (url.origin !== 'https://help.invalid' || decoded.startsWith('//') || /[\\\u0000-\u0020]/.test(decoded)) return null;
    // A tour must never visit action endpoints, files, downloads, or logout links.
    if (!/^\/(?:publico(?:\/|$)|alumno(?:\/|$)|profesor(?:\/|$)|admin(?:\/|$)|director(?:\/|$)|app-movil$|cambiar-password$|login$|privacidad$|cookies$)/.test(decoded)
      || /(?:^|\/)(?:api|logout|salir|descargar|download|exportar|imprimir|pdf)(?:\/|$)|\.[a-z0-9]{2,5}$/i.test(decoded)
      || Array.from(url.searchParams.keys()).some(key => /^(?:next|returnto|redirect|url|callbackurl)$/i.test(key))) return null;
    return url.pathname + url.search;
  } catch { return null; }
}

export function manualHelpLinks(links: HelpLink[]) {
  // Existing own-document menu links may be explained/downloaded voluntarily,
  // but a walkthrough must never fetch these action/file endpoints itself.
  return links.filter(link => /^\/api\/(?:kardex|constancia)(?:\/|$)/.test(link.href) && !/[\\\u0000-\u0020]/.test(link.href));
}

export function authorizedHelpLinks(links: HelpLink[], role: HelpRole): HelpLink[] {
  const seen = new Set<string>();
  return links.flatMap(link => {
    const href = safeHelpHref(link.href);
    if (!href || seen.has(href)) return [];
    const privateArea = /^\/(admin|director|profesor|alumno)(?:\/|$)/.exec(href)?.[1];
    if (role === 'publico' && privateArea || role === 'alumno' && privateArea && privateArea !== 'alumno'
      || role === 'profesor' && privateArea && privateArea !== 'profesor'
      || role === 'finanzas' && privateArea && (privateArea !== 'admin' || !/^\/admin(?:$|\/(?:alumnos|conceptos|pagos|pendientes|estado-cuenta|perfil|extraordinarios|cambiar-password|seguridad)(?:\/|$|\?))/.test(href))) return [];
    seen.add(href);
    return [{ ...link, href }];
  });
}

export function routeMatches(href: string, pathname: string) {
  return href.split('?')[0] === pathname;
}

export function visibleHelpControl(element: HTMLElement) {
  const style = getComputedStyle(element);
  return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    && !element.closest('[inert]:not([data-help-background]),[aria-hidden="true"],[data-help-root]')
    && !element.matches(':disabled,[aria-disabled="true"],input[type="hidden"]');
}

const actions = /(?:^|\s)(guardar|actualizar|cancelar|volver|cerrar|eliminar|borrar|editar|modificar|validar|aprobar|rechazar|confirmar|publicar|despublicar|entregar|enviar|descargar|exportar|imprimir|iniciar|comenzar|filtrar|consultar|buscar|crear|agregar|añadir|nuevo|nueva|ver|abrir|responder|revisar|seleccionar|quitar|restablecer|recuperar|siguiente|anterior|reiniciar|configurar|aceptar|marcar|mostrar|ocultar|registrar|reabrir|diagnóstico)\b/i;
const actionNames: Record<string, string> = { nuevo: 'Nuevo registro', nueva: 'Nuevo registro', ver: 'Ver registro', abrir: 'Abrir registro' };

function fieldLabel(element: HTMLElement) {
  const explicit = element.getAttribute('aria-label');
  const ids = element.getAttribute('aria-labelledby');
  const associated = element.id ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(element.id)}"]`) : null;
  // Only label nodes, never a field's current value, selected option, or form text.
  return explicit || ids?.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ')
    || associated?.textContent || element.closest('label')?.childNodes[0]?.textContent
    || element.getAttribute('placeholder') || element.getAttribute('name') || 'Campo del formulario';
}

function patternHref(href: string | null) {
  if (!href) return '';
  try {
    const url = new URL(href, location.origin);
    return url.origin + url.pathname.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)|\/\d+(?=\/|$)/gi, '/:registro').replace(/\/(?:noticias|albumes|mensajes|tareas|examenes|alumnos|profesores)\/[^/]+$/i, '/:registro');
  } catch { return 'enlace'; }
}

/** Collect rendered controls, including those below the fold. Never click or read values. */
export function collectHelpControls(role: HelpRole, pathname: string, links: HelpLink[]): HelpStep[] {
  const seen = new Set<string>();
  const steps: HelpStep[] = [];
  const forms = Array.from(document.querySelectorAll('form'));
  for (const [controlNumber, element] of Array.from(document.querySelectorAll<HTMLElement>(selectors)).entries()) {
    if (!visibleHelpControl(element)) continue;
    const field = element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
    const href = element.getAttribute('href');
    const menuLink = links.find(link => href === link.href);
    const row = element.closest('tr,[data-help-repeat]');
    const dynamicRecord = href && /\/(?:[0-9a-f]{8}-[0-9a-f-]{27,}|\d+)(?:\/|$)|\/(?:mensajes|tareas|examenes|alumnos|profesores|usuarios|clases)\/[^/]+$|[?&](?:id|perfil|usuario|user|alumno|profesor|destinatario|conversacion)=/i.test(href);
    const privateRecord = role !== 'publico' && (row || dynamicRecord);
    let title: string;
    if (menuLink) title = menuLink.label;
    else if (privateRecord && field) {
      const cell = element.closest('td');
      const column = cell && row instanceof HTMLTableRowElement ? row.closest('table')?.querySelector('thead tr')?.children[cell.cellIndex]?.textContent?.trim() : '';
      title = element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type) ? 'Seleccionar una opción del registro' : column ? `Campo: ${column.slice(0, 60)}` : 'Campo del registro';
    }
    else if (privateRecord && href) title = 'Abrir detalle del registro';
    else {
      const raw = (field ? fieldLabel(element) : element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent || '').replace(/\s+/g, ' ').trim();
      if (raw === 'Saltar al contenido') continue;
      // Repeated private rows can contain names in action labels: expose only the verb.
      const verb = raw.match(actions)?.[1]?.toLocaleLowerCase('es-MX');
      title = privateRecord ? (verb ? actionNames[verb] ?? `${verb.charAt(0).toUpperCase()}${verb.slice(1)} registro` : 'Acción del registro') : raw.slice(0, 100) || 'Control de esta pantalla';
      // Account/header controls may embed a person's display name.
      if (role !== 'publico' && !element.closest('main') && !menuLink && !verb && !/^(?:Más secciones|Menú|Modo oscuro|Modo claro|Tema|Navegación)$/i.test(raw)) title = 'Opciones de navegación o cuenta';
    }
    const kind = field ? `campo:${element.tagName}:${element.getAttribute('type') ?? ''}` : `accion:${element.tagName}:${element.getAttribute('role') ?? ''}`;
    const form = element.closest('form');
    const formKey = row ? 'fila' : form ? `formulario:${forms.indexOf(form)}` : '';
    const numericPage = !field && /^\d+$/.test(title);
    const slot = row ? Array.from(row.querySelectorAll(selectors)).indexOf(element) : title === 'Control de esta pantalla' ? controlNumber : '';
    const key = `${kind}:${numericPage ? 'página de resultados' : title}:${patternHref(href)}:${formKey}:${slot}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pattern = row || numericPage ? ' Este control se repite en otros registros u opciones; aplica la misma función al elemento elegido.' : '';
    let explanation = element.dataset.helpDescription || (field
      ? describeField(title, role, pathname, element.hasAttribute('required'), element.getAttribute('type') ?? undefined)
      : describeControl(title, href, role, pathname));
    if (element.closest('[aria-labelledby="cookie-heading"]') && title === 'Configurar') explanation = describeControl('Configurar cookies', null, role, pathname);
    if (element.tagName === 'SUMMARY' || /menú|más secciones/i.test(title)) {
      if (element.tagName === 'SUMMARY' && !element.closest('nav,aside')) explanation = 'Despliega o contrae la respuesta y la información adicional de este apartado. La guía no abre ni modifica el contenido por ti.';
      else explanation += ' Las opciones internas aparecen cuando tú abres este menú; la guía no lo abre ni ejecuta ninguna opción.';
      if (element.tagName === 'SUMMARY') {
        const hiddenRoutes = Array.from(element.parentElement?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []).flatMap(anchor => links.find(link => link.href === anchor.getAttribute('href'))?.label ?? []);
        if (hiddenRoutes.length) explanation += ` Secciones disponibles: ${hiddenRoutes.join(', ')}.`;
      }
    }
    steps.push({ key, title: numericPage ? 'Número de página' : title, explanation: explanation + pattern, element, kind: 'control' });
  }
  return steps;
}

export function moduleIntroduction(link: HelpLink, role: HelpRole): HelpStep {
  return { key: `intro:${link.href}`, title: link.label, explanation: link.description ?? describeModule(link.href, role, link.label), kind: 'intro' };
}
