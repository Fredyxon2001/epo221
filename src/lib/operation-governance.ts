import { schoolToday, validCalendarDate } from './public-convocatorias';

export const OPERATION_TOPICS = {
  publicaciones: { instruction: 'Revisa portada, oferta, noticias y páginas publicadas. Registra la referencia que respalda su contenido.', href: '/admin/publico', link: 'Administrar sitio público' },
  calendario_formatos: { instruction: 'Confirma ciclo, convocatorias, fechas y versiones de guías y documentos. Contrasta también el calendario interno con el acuerdo institucional.', href: '/admin/publico/descargas', link: 'Revisar documentos' },
  privacidad: { instruction: 'Documenta el aviso aplicable, medios para ejercer derechos y responsable por área. Solicita revisión especializada cuando corresponda.', href: '/privacidad', link: 'Ver aviso publicado' },
  fotografias: { instruction: 'Registra dónde se resguardan las autorizaciones y cómo se solicita el retiro de fotografías; revisa cada álbum publicado.', href: '/admin/publico/albumes', link: 'Revisar álbumes' },
  recuperacion_mfa: { instruction: 'Describe cómo se verifica la identidad, quién autoriza recuperar acceso y dónde queda la evidencia. Nunca registres contraseñas, códigos MFA ni documentos personales aquí.', href: '/admin/usuarios', link: 'Administrar acceso' },
  retenciones: { instruction: 'Propón categorías, fundamento y plazos de conservación por área. La aprobación de esta ficha no elimina expedientes ni ejecuta purgas.', href: '/admin/ciclos', link: 'Revisar ciclos' },
  continuidad: { instruction: 'Registra ubicación del procedimiento y evidencia del simulacro. RPO indica minutos máximos de datos que se acepta perder; RTO, minutos objetivo para recuperar servicio. Son objetivos acordados, no resultados garantizados.', href: '/admin/auditoria', link: 'Consultar auditoría' },
  contactos: { instruction: 'Confirma teléfonos, correos, horarios y canal de atención publicados, sin inventar responsables personales o datos de contacto.', href: '/admin/publico/config#contacto', link: 'Revisar contacto' },
} as const;

export type OperationTopic = keyof typeof OPERATION_TOPICS;
export type ReviewState = 'pendiente' | 'vigente' | 'vencido';
export type OperationReview = {
  id: string; tema: OperationTopic; titulo: string; area_responsable: string; periodicidad_dias: number; ciclo_id: string | null;
  folio_referencia: string; referencia_url: string; detalle: string; fecha_revision: string | null; proxima_revision: string | null;
  objetivo_rpo_minutos: number | null; objetivo_rto_minutos: number | null; estado: string; huella_aprobada: string | null;
  aprobado_en: string | null; fuentes_aprobadas: string | null; revision: number;
};
export function reviewState(review: Pick<OperationReview, 'estado' | 'huella_aprobada' | 'fecha_revision' | 'proxima_revision'> & { fuentes_aprobadas?: string | null }, liveHash: string | null, today = schoolToday(), sourceHash: string | null = null): { state: ReviewState; reason: string } {
  if (review.estado !== 'aprobado') return { state: 'pendiente', reason: 'Borrador pendiente de revisión y aprobación.' };
  if (!review.fecha_revision || !review.proxima_revision || !validCalendarDate(review.fecha_revision) || !validCalendarDate(review.proxima_revision) || review.fecha_revision > today || review.proxima_revision < review.fecha_revision) return { state: 'pendiente', reason: 'La revisión requiere fechas válidas.' };
  if (review.proxima_revision < today) return { state: 'vencido', reason: 'Se cumplió la fecha para volver a revisar.' };
  if (!liveHash) return { state: 'pendiente', reason: 'No se pudo comprobar el contenido actual; recarga antes de aprobar.' };
  if (review.huella_aprobada !== liveHash) return { state: 'pendiente', reason: 'El contenido público cambió desde la aprobación. Vuelve a revisarlo.' };
  if (sourceHash && review.fuentes_aprobadas !== sourceHash) return { state: 'pendiente', reason: 'Las páginas de privacidad o cookies cambiaron desde la aprobación. Vuelve a revisarlas.' };
  return { state: 'vigente', reason: 'Revisión registrada para el contenido actual y dentro de su plazo.' };
}
export function safeReferenceUrl(value: string): boolean {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !/[\s\x00-\x1f]/.test(value); } catch { return false; }
}
export function validReviewDates(review: string | null, next: string | null): boolean {
  return (!review || validCalendarDate(review)) && (!next || validCalendarDate(next)) && (!review || !next || review <= next);
}
