import { GUIDANCE_ORIENTATION, safePublicDocumentUrl } from './public-guidance';

export type PublicReadinessInput = {
  contact: { telefono?: string | null; email?: string | null; horario?: string | null } | null;
  cycles: { id: string; activo: boolean }[];
  guides: { ciclo_id: string; publicada: boolean; requisitos: string | null; fechas: string | null; preguntas: string | null }[];
  documents: { ciclo_id: string | null; publicada: boolean; vigente: boolean; pdf_url: string | null; docx_url: string | null }[];
};
export type PublicReadinessCheck = { id: string; label: string; ready: boolean; detail: string; href: string };

/** Completeness signals only: a saved value is never evidence of institutional approval. */
export function publicReadiness(input: PublicReadinessInput): PublicReadinessCheck[] {
  const nonEmptyText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
  const active = input.cycles.filter(cycle => cycle.activo === true);
  const activeId = active.length === 1 ? active[0].id : null;
  const guide = activeId ? input.guides.find(item => item.ciclo_id === activeId && item.publicada === true) : null;
  const orientationOnly = !!guide && (Object.keys(GUIDANCE_ORIENTATION) as (keyof typeof GUIDANCE_ORIENTATION)[]).some(key => typeof guide[key] === 'string' && guide[key]!.trim() === GUIDANCE_ORIENTATION[key].trim());
  const completeGuide = !!guide && !orientationOnly && [guide.requisitos, guide.fechas, guide.preguntas].every(nonEmptyText);
  const currentDocuments = activeId ? input.documents.filter(doc => doc.ciclo_id === activeId && doc.publicada === true && doc.vigente === true) : [];
  const documentsReady = currentDocuments.length > 0 && currentDocuments.every(doc => nonEmptyText(doc.pdf_url) && safePublicDocumentUrl(doc.pdf_url, 'pdf'));
  const contactReady = nonEmptyText(input.contact?.telefono) && nonEmptyText(input.contact?.email) && nonEmptyText(input.contact?.horario);
  return [
    { id: 'ciclo', label: 'Ciclo de referencia', ready: active.length === 1, detail: active.length === 1 ? 'Hay un ciclo activo registrado. Esto no anuncia inscripciones abiertas.' : active.length ? 'Hay varios ciclos activos: confirma cuál corresponde antes de publicar.' : 'No hay ciclo activo. Confirma el ciclo con Control Escolar.', href: '/admin/ciclos' },
    { id: 'contacto', label: 'Contacto de atención', ready: contactReady, detail: contactReady ? 'Teléfono, correo y horario registrados; comprueba que el área los atiende.' : 'Completa teléfono, correo y horario con medios confirmados por la escuela.', href: '/admin/publico/config#contacto' },
    { id: 'guia', label: 'Guía del ciclo activo', ready: completeGuide, detail: completeGuide ? 'Las tres secciones tienen contenido propio publicado. Revisa su exactitud antes de aprobar.' : orientationOnly ? 'La guía conserva orientación inicial; faltan requisitos, fechas o preguntas confirmados para el ciclo.' : 'Falta una guía publicada y completa para el único ciclo activo.', href: activeId ? '/admin/publico/guias?ciclo=' + activeId : '/admin/publico/guias' },
    { id: 'formatos', label: 'Formatos para lectura', ready: documentsReady, detail: documentsReady ? 'Cada documento publicado vigente del ciclo tiene enlace PDF admitido. Comprueba lectura, accesibilidad y contenido del archivo.' : 'Publica formatos confirmados del ciclo y ofrece PDF para lectura en cada documento vigente; DOCX es complementario.', href: '/admin/publico/descargas' },
  ];
}

export function preferredGuideCycle<T extends { id: string; activo?: boolean }>(cycles: T[], requested?: string): T | undefined {
  return cycles.find(cycle => cycle.id === requested) ?? cycles.find(cycle => cycle.activo) ?? cycles[0];
}
