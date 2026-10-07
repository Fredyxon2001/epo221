/** Shared, factual orientation. Institutional dates and requirements come from published guides. */
export const GUIDANCE_ORIENTATION = {
  requisitos: '1. Revisa las convocatorias publicadas en el sitio para identificar el trámite que te corresponde.\n2. Consulta Descargas y comprueba el ciclo, la versión y la vigencia antes de llenar un formato. Los archivos históricos sirven como referencia y requieren confirmación en Control Escolar.\n3. Confirma con Control Escolar los documentos, las firmas y la forma de entrega que corresponden a tu caso. No entregues documentos personales mediante enlaces o cuentas no confirmados por la escuela.\n4. Si ya tienes cuenta, consulta tus avisos, calendario y pendientes dentro del sistema o de la app móvil.',
  fechas: 'Las fechas, el proceso de admisión y los requisitos específicos deben estar publicados por la escuela en una convocatoria o confirmarse con Control Escolar. Esta orientación no anuncia inscripciones abiertas ni establece montos, cupos o fechas.\nConsulta Convocatorias y Contacto para obtener información vigente. Si no hay una convocatoria vigente, confirma el siguiente proceso con la escuela antes de realizar un trámite.',
  preguntas: '¿Cómo sé qué formato debo usar?\nComprueba el ciclo y la versión en Descargas. Si aparece como histórico, confirma su uso con Control Escolar.\n\n¿Dónde reviso fechas y requisitos de ingreso?\nEn Convocatorias y en la guía publicada para el ciclo. Si no están publicados, pregunta a Control Escolar desde los medios de Contacto.\n\n¿Necesito una cuenta para consultar el sitio público?\nNo. Oferta, noticias, convocatorias, guía y descargas son públicas. Tus calificaciones, tareas y mensajes requieren iniciar sesión.\n\n¿Cómo ingreso al sistema o a la app?\nUtiliza la cuenta entregada por la escuela. Cambia la contraseña inicial cuando se solicite y completa la verificación de seguridad si corresponde. Si no tienes acceso, solicita ayuda a Control Escolar; no compartas tu contraseña.\n\n¿La app y el sitio muestran la misma guía?\nSí, consultan las guías escolares publicadas por la escuela. La guía de uso dentro del sistema explica las funciones habilitadas para tu rol.',
} as const;

export function safePublicDocumentUrl(value: string, format: 'pdf' | 'docx'): boolean {
  if (!value) return true;
  if (/^\/descargas\/[a-zA-Z0-9_-]+\.(pdf|docx)$/.test(value)) return value.endsWith('.' + format);
  const endpoint=value.match(/^\/api\/public\/documentos\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/(pdf|docx)$/i);
  if(endpoint)return endpoint[2]===format;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return false;
    if (url.port && url.port !== '443') return false;
    if (!url.pathname.toLowerCase().endsWith('.' + format)) return false;
    return ['epo221.edu.mx', 'www.epo221.edu.mx'].includes(url.hostname) && url.pathname.startsWith('/descargas/');
  } catch { return false; }
}
