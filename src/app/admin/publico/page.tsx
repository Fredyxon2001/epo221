import { requireIdentity } from "@/lib/security/access";
import Link from 'next/link';
import { PublicationReadiness } from './PublicationReadiness';
import { adminClient } from '@/lib/supabase/admin';
import { HubCards, type HubCard as Card } from './HubCards';

export default async function AdminPublicoHub() {
  const { client } = await requireIdentity(["admin","staff","director"]);

  const supabase = adminClient();

  // Conteos para tarjetas (tolerante a tablas que aún no existen)
  const [noticias, convocatorias, albumes, paginas] = await Promise.all([
    supabase.from('noticias').select('id', { count: 'exact', head: true }),
    supabase.from('convocatorias').select('id', { count: 'exact', head: true }),
    supabase.from('albumes').select('id', { count: 'exact', head: true }),
    supabase.from('paginas_publicas').select('id', { count: 'exact', head: true }),
  ]);

  const cards: Card[] = [{href:'/admin/operacion',icon:'📋',title:'Revisión institucional',desc:'Responsables, referencias, aprobación con MFA e historial del contenido público.'},
    {href:'/admin/publico/rendimiento',icon:'📊',title:'Rendimiento público',desc:'Métricas agrupadas del sitio, con consentimiento opcional.'},
    {href:'/admin/publico/guias',icon:'ℹ️',title:'Guía por ciclo',desc:'Requisitos, fechas, admisión y preguntas frecuentes para web y app.'},
    {href:'/admin/publico/descargas',icon:'📥',title:'Documentos públicos',desc:'Formatos PDF/DOCX por ciclo, versión y vigencia.'},
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
          className="bg-white border text-sm px-4 py-2 rounded-sm hover:bg-gray-50"
        >
          👁️ Ver sitio público
        </Link>
      </div>

      <PublicationReadiness client={client} />
      <HubCards cards={cards} />

      {[noticias, convocatorias, albumes, paginas].some(result => result.error) && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">No se pudieron comprobar todos los conteos del CMS. Un cero no confirma que el catálogo esté vacío. Revisa la conexión y vuelve a cargar.</p>}
    </div>
  );
}
