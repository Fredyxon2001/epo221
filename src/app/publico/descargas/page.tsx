import { Reveal } from '@/components/publico/Reveal';
import { SectionHeader } from '@/components/publico/SectionHeader';
import { AuroraBg } from '@/components/publico/AuroraBg';
import { MagneticLink } from '@/components/publico/MagneticButton';

export const metadata = {
  title: 'Descargas · EPO 221',
  description: 'Formatos oficiales de inscripción, reinscripción, carta compromiso y reglamento escolar.',
};

type Doc = {
  href: string;
  nombre: string;
  tamaño: string;
  icon: string;
};

const DOCS_COMUNES: Doc[] = [
  { href: '/descargas/carta-compromiso.docx',    nombre: 'Carta compromiso 2025-2026-2', tamaño: '224 KB', icon: '📝' },
  { href: '/descargas/reglamento-escolar.docx',  nombre: 'Reglamento escolar 2025-2026-2', tamaño: '220 KB', icon: '📘' },
];

const INSCRIPCION: Doc[] = [
  { href: '/descargas/solicitud-inscripcion.docx', nombre: 'Solicitud de inscripción (alumnos de nuevo ingreso)', tamaño: '217 KB', icon: '🆕' },
  ...DOCS_COMUNES,
];

const REINSCRIPCION: Doc[] = [
  { href: '/descargas/solicitud-reinscripcion.docx', nombre: 'Solicitud de reinscripción 2025-26-2', tamaño: '201 KB', icon: '🔁' },
  ...DOCS_COMUNES,
];

const REQUISITOS_REINS = [
  'Solicitud de reinscripción (adjuntar fotografía)',
  'Reglamento escolar firmado',
  'Carta compromiso firmada',
  'CURP del alumno(a) actualizado — gob.mx/curp',
  'Certificado médico de institución pública (vigente)',
  'Carnet de seguridad social actualizado (copia)',
  'Vigencia de derechos del IMSS Digital — imss.gob.mx/imssdigital',
  'Copia del INE del padre, madre o tutor',
  'Comprobante de la donación voluntaria de inscripción (apoya el mantenimiento y operación de la institución) — acércate a Control Escolar para conocer el monto del apoyo y los medios de pago',
  'Comprobante de domicilio actualizado',
  'Un folder tamaño carta color verde pistache',
];

function DocCard({ doc }: { doc: Doc }) {
  const fileName = doc.href.split('/').pop() || 'archivo';
  return (
    <a
      href={doc.href}
      download={fileName}
      className="lift gradient-border group flex items-center gap-4 bg-white/95 backdrop-blur rounded-2xl p-5 transition"
    >
      <div className="w-14 h-14 flex-shrink-0 rounded-2xl bg-gradient-to-br from-verde to-verde-medio text-white flex items-center justify-center text-2xl shadow-lg shadow-verde/30">
        {doc.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-verde-oscuro leading-tight">{doc.nombre}</div>
        <div className="text-xs text-gray-500 mt-1">DOCX · {doc.tamaño}</div>
      </div>
      <div className="text-verde text-2xl group-hover:translate-y-0.5 group-hover:text-verde-medio transition">
        ⬇
      </div>
    </a>
  );
}

export default function Descargas() {
  return (
    <AuroraBg className="pt-32 pb-28 px-6">
      <div className="relative max-w-5xl mx-auto">
        <SectionHeader
          eyebrow="Formatos oficiales"
          ghost="DOC"
          title="Descargas institucionales"
          titleAccent="institucionales"
          subtitle="Descarga los formatos, llénalos en casa y entrégalos impresos en ventanilla para agilizar tu trámite."
        />

        {/* Donación voluntaria de inscripción */}
        <Reveal delay={0.05}>
          <div className="spotlight lift bg-gradient-to-br from-verde-oscuro via-verde to-verde-medio text-white rounded-3xl p-8 shadow-2xl shadow-verde/30 relative overflow-hidden mb-12">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 blob blur-3xl" aria-hidden />
            <div className="relative grid md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <div className="text-xs uppercase tracking-[0.4em] text-verde-claro mb-2">Concepto de inscripción</div>
                <h2 className="font-serif text-3xl">Donación voluntaria · Ciclo 2025-2026-2</h2>
                <p className="text-white/85 text-sm mt-3 max-w-xl leading-relaxed">
                  La inscripción se cubre mediante una <strong>donación voluntaria</strong> que se destina al
                  <strong> mantenimiento, operación y mejora continua de las instalaciones</strong> de la institución.
                  Acércate a <strong>Control Escolar</strong> para conocer el monto del apoyo, los medios de pago
                  disponibles y recibir tu comprobante para entregarlo con los demás requisitos en ventanilla.
                </p>
              </div>
              <div className="text-center">
                <div className="text-xs uppercase tracking-[0.4em] text-verde-claro mb-2">Información del apoyo</div>
                <div className="text-4xl mb-2">🏫</div>
                <div className="font-serif text-base leading-snug px-2">
                  Acércate a <strong>Control Escolar</strong> para conocer de cuánto es el apoyo
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Inscripción nuevo ingreso */}
        <Reveal delay={0.1}>
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-10 h-10 rounded-full bg-verde text-white flex items-center justify-center font-bold shadow-lg">1</span>
              <h2 className="font-serif text-3xl text-verde-oscuro">Inscripción · Nuevo ingreso</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5 ml-13">
              Formatos para alumnas y alumnos que ingresan por primera vez a la EPO 221.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {INSCRIPCION.map((d) => <DocCard key={d.href} doc={d} />)}
            </div>
          </section>
        </Reveal>

        {/* Reinscripción */}
        <Reveal delay={0.2}>
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-10 h-10 rounded-full bg-verde-medio text-white flex items-center justify-center font-bold shadow-lg">2</span>
              <h2 className="font-serif text-3xl text-verde-oscuro">Reinscripción · Alumnos activos</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Si ya eres alumno y continúas al siguiente semestre, descarga estos formatos.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {REINSCRIPCION.map((d) => <DocCard key={d.href} doc={d} />)}
            </div>
          </section>
        </Reveal>

        {/* Requisitos reinscripción */}
        <Reveal delay={0.25}>
          <section className="bg-white/90 backdrop-blur rounded-3xl p-8 border border-verde/15 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">✅</span>
              <h2 className="font-serif text-2xl text-verde-oscuro">Requisitos de reinscripción 2025-2026-2</h2>
            </div>
            <ol className="space-y-2 list-decimal list-inside text-sm text-gray-700 marker:text-verde marker:font-bold">
              {REQUISITOS_REINS.map((r, i) => (
                <li key={i} className="leading-relaxed">{r}</li>
              ))}
            </ol>

            {/* Aviso importante */}
            <div className="mt-6 flex items-start gap-3 bg-verde-claro/30 border border-verde/30 rounded-2xl p-4">
              <div className="text-2xl">👨‍👩‍👧</div>
              <div className="text-sm text-verde-oscuro">
                <strong>Importante:</strong> los alumnos deberán asistir <strong>siempre acompañados de su padre, madre o tutor</strong>
                para realizar el trámite de reinscripción.
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-verde/10 text-xs text-gray-500 flex flex-wrap gap-4">
              <a href="https://www.gob.mx/curp/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-verde hover:underline">
                🔗 Tramitar CURP en gob.mx
              </a>
              <a href="https://www.imss.gob.mx/imssdigital" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-verde hover:underline">
                🔗 IMSS Digital · Vigencia de derechos
              </a>
              <a href="https://www.miderechomilugar.gob.mx/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-verde hover:underline">
                🔗 Mi Derecho, Mi Lugar
              </a>
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.3} className="text-center mt-12">
          <p className="text-sm text-gray-600 mb-4">¿Dudas con tu trámite?</p>
          <MagneticLink href="/publico/contacto" variant="solid">
            📞 Contáctanos
          </MagneticLink>
        </Reveal>
      </div>
    </AuroraBg>
  );
}
