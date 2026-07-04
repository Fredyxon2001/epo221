import type { MetadataRoute } from 'next';

// Genera /robots.txt automáticamente. Permite indexar solo el sitio público
// y bloquea zonas privadas (login, paneles, API) para no exponerlas en buscadores.
export default function robots(): MetadataRoute.Robots {
  const base = 'https://epo221.edu.mx';
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/publico', '/publico/'],
      disallow: [
        '/admin', '/admin/',
        '/profesor', '/profesor/',
        '/alumno', '/alumno/',
        '/director', '/director/',
        '/api/', '/login', '/cambiar-password', '/recuperar',
        '/chat-grupal', '/solicitudes', '/perfil', '/tutorias', '/planeaciones',
        '/calendario',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
