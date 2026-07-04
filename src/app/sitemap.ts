import type { MetadataRoute } from 'next';

// Genera /sitemap.xml automáticamente con las páginas públicas del sitio.
// Solo incluye rutas SIN login (buscadores no pueden pasar autenticación).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://epo221.edu.mx';
  const now = new Date();

  const rutas = [
    { path: '/publico', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/publico/conoce', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/publico/oferta', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/publico/noticias', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/publico/convocatorias', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/publico/albumes', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/publico/descargas', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/publico/contacto', priority: 0.6, changeFrequency: 'yearly' as const },
    { path: '/app-movil', priority: 0.6, changeFrequency: 'monthly' as const },
  ];

  return rutas.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
