import type { HelpLink } from './catalog';

export function publicHelpLinks(extras: HelpLink[] = []): HelpLink[] {
  return [
    { href: '/publico', label: 'Inicio' }, { href: '/publico/oferta', label: 'Oferta educativa' },
    { href: '/publico/guia', label: 'Guía escolar y trámites' }, { href: '/publico/convocatorias', label: 'Convocatorias' },
    { href: '/publico/descargas', label: 'Documentos y descargas' }, { href: '/publico/contacto', label: 'Contacto' },
    { href: '/publico/noticias', label: 'Noticias' }, { href: '/publico/albumes', label: 'Galería' },
    { href: '/publico/conoce', label: 'Recorrido de la escuela' }, { href: '/app-movil', label: 'App móvil' },
    { href: '/login', label: 'Acceso al sistema escolar' }, ...extras,
  ];
}
