import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { HubCards, type HubCard as Card } from './HubCards';

export default async function AdminPublicoHub() {
  const supabase = createClient();

  // Conteos para tarjetas (tolerante a tablas que aún no existen)
  const [noticias, convocatorias, albumes, paginas] = await Promise.all([
    supabase.from('noticias').select('id', { count: 'exact', head: true }),
    supabase.from('convocatorias').select('id', { count: 'exact', head: true }),
    supabase.from('albumes').select('id', { count: 'exact', head: true }),
    supabase.from('paginas_publicas').select('id', { count: 'exact', head: true }),
  ]);

  const cards: Card[] = [
    {
      href: '/admin/publico/inicio',
      icon: '🏠',
      title: 'Página de inicio',
      desc: 'Hero, descripción y bloques de la portada.',
    },
    {
      href: '/admin/materias',
      icon: '🎓',
      title: 'Oferta educativa',
      desc: 'Materias, campos disciplinares y plan de estudios.',
    },
    {
      href: '/admin/publico/config#contacto',
      icon: '📍',
      title: 'Contacto y mapa',
      desc: 'Dirección, teléfonos, correo, horario y mapa embebido.',
    },
    {
      href: '/admin/noticias',
      icon: '📣',
      title: 'Noticias',
      desc: 'Publicaciones del sitio público.',
      count: noticias.count ?? 0,
    },
    {
      href: '/admin/convocatorias',
      icon: '📢',
      title: 'Convocatorias',
      desc: 'Procesos de admisión y trámites.',
      count: convocatorias.count ?? 0,
    },
    {
      href: '/admin/publico/albumes',
      icon: '🖼️',
      title: 'Álbumes de fotos',
      desc: 'Galería de eventos y actividades escolares.',
      count: albumes.count ?? 0,
    },
    {
      href: '/admin/publico/paginas',
      icon: '📄',
      title: 'Páginas personalizadas',
      desc: 'Crea páginas estáticas (historia, misión, etc.).',
      count: paginas.count ?? 0,
    },
    {
      href: '/admin/publico/redes',
      icon: '🔗',
      title: 'Redes sociales',
      desc: 'Facebook, Instagram, TikTok (botones flotantes).',
    },
    {
      href: '/admin/publico/config',
      icon: '⚙️',
      title: 'Configuración del sitio',
      desc: 'Nombre, CCT, contacto, misión, estadísticas y cuenta bancaria institucional.',
    },
    {
      href: '/admin/conceptos',
      icon: '💛',
      title: 'Tarifas y conceptos',
      desc: 'Conceptos y costos oficiales por alumno (uso interno del sistema).',
    },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-verde">Sitio público</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona todo el contenido que ven los visitantes en{' '}
            <Link href="/publico" className="text-verde underline" target="_blank">/publico</Link>.
          </p>
        </div>
        <Link
          href="/publico"
          target="_blank"
          className="bg-white border text-sm px-4 py-2 rounded hover:bg-gray-50"
        >
          👁️ Ver sitio público
        </Link>
      </div>

      <HubCards cards={cards} />

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900 flex items-start gap-3">
        <span className="text-lg">✅</span>
        <div>
          <strong>Todo listo.</strong> Las tablas del CMS están creadas, el bucket <code className="text-xs bg-green-100 px-1 rounded">publico</code> está activo y las auditorías se registran automáticamente.
          Puedes gestionar cada apartado desde las tarjetas de arriba.
        </div>
      </div>
    </div>
  );
}
