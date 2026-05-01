// Galería de tomas aéreas DJI — sitio público
import { Reveal } from '@/components/publico/Reveal';
import { SectionHeader } from '@/components/publico/SectionHeader';
import { AuroraBg } from '@/components/publico/AuroraBg';
import { VideoCard } from './VideoCard';
import { HeroVideo } from './HeroVideo';

export const metadata = {
  title: 'Conoce nuestras instalaciones · EPO 221',
  description: 'Recorre la EPO 221 "Nicolás Bravo" desde el aire. Tomas aéreas con dron DJI de fachada, instalaciones, construcción del auditorio y más.',
};

type Video = {
  slug: string;
  titulo: string;
  descripcion: string;
  duracion: string;
  destacado?: boolean;
};

const VIDEOS: Video[] = [
  {
    slug: 'fachada-escuela',
    titulo: 'Fachada institucional',
    descripcion: 'Vista frontal de nuestra EPO 221, donde recibimos a las nuevas generaciones cada ciclo escolar.',
    duracion: '0:57',
    destacado: true,
  },
  {
    slug: 'recorrido-escuela',
    titulo: 'Recorrido completo',
    descripcion: 'Tour aéreo por las instalaciones, canchas, áreas verdes y aulas que conforman nuestro plantel.',
    duracion: '3:13',
    destacado: true,
  },
  {
    slug: 'construccion-auditorio',
    titulo: 'Construcción del auditorio',
    descripcion: 'El crecimiento es constante: documentamos el avance de obra del nuevo auditorio escolar.',
    duracion: '2:22',
  },
  {
    slug: 'construccion',
    titulo: 'Avance de obra · Vista panorámica',
    descripcion: 'Toma extendida de las áreas en desarrollo para futuras generaciones de estudiantes.',
    duracion: '3:11',
  },
  {
    slug: 'piloteando',
    titulo: 'Sobrevolando el plantel',
    descripcion: 'Vista pilotada del entorno de la institución y su contexto comunitario.',
    duracion: '0:38',
  },
  {
    slug: 'grabacion-360',
    titulo: 'Toma 360°',
    descripcion: 'Plano envolvente que muestra la magnitud completa de las instalaciones.',
    duracion: '0:22',
  },
];

export default function ConocePage() {
  return (
    <>
      {/* Hero con video de fondo (highlights reel) */}
      <HeroVideo />

      <AuroraBg className="py-24 px-6">
        <div id="galeria" className="relative max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Tomas aéreas con dron DJI"
            ghost="EPO 221"
            title="Conoce nuestras instalaciones desde el aire"
            titleAccent="instalaciones"
            subtitle="Recorre cada rincón de la EPO 221 'Nicolás Bravo'. Documentamos en video cada espacio, cada avance de obra y cada detalle del plantel."
          />

          {/* Destacados (2 columnas) */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {VIDEOS.filter((v) => v.destacado).map((v, i) => (
              <Reveal key={v.slug} delay={0.05 + i * 0.05}>
                <VideoCard video={v} variant="destacado" />
              </Reveal>
            ))}
          </div>

          {/* Resto en grid 3 columnas */}
          <Reveal delay={0.2}>
            <div className="border-t border-verde/20 pt-10">
              <h3 className="font-serif text-2xl text-verde-oscuro mb-6 text-center">Más tomas del plantel</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {VIDEOS.filter((v) => !v.destacado).map((v, i) => (
                  <Reveal key={v.slug} delay={0.25 + i * 0.04}>
                    <VideoCard video={v} variant="estandar" />
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>

          {/* CTA */}
          <Reveal delay={0.4}>
            <div className="mt-16 bg-gradient-to-br from-verde-oscuro via-verde to-verde-medio text-white rounded-3xl p-10 text-center shadow-2xl shadow-verde/30">
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="font-serif text-3xl mb-3">¿Quieres formar parte de la EPO 221?</h3>
              <p className="text-white/85 max-w-2xl mx-auto mb-6">
                Conoce nuestra oferta educativa y los procesos de inscripción para el siguiente ciclo escolar.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a href="/publico/oferta" className="bg-dorado hover:bg-dorado-claro text-verde-oscuro font-bold px-6 py-3 rounded-xl transition shadow-lg">
                  📚 Oferta educativa
                </a>
                <a href="/publico/descargas" className="bg-white/10 border border-white/30 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl transition">
                  📄 Trámites
                </a>
                <a href="/publico/contacto" className="bg-white/10 border border-white/30 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl transition">
                  📞 Contacto
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </AuroraBg>
    </>
  );
}
