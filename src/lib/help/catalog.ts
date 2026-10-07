import type { Role } from '@/lib/security/policy';

export type HelpRole = Role | 'publico';
export type HelpLink = { href: string; label: string; description?: string };
export const HELP_VERSION = 1;
export const helpAppearance: Record<HelpRole, { title: string; color: string; intro: string }> = {
  publico: { title: 'Visitantes y familias', color: '#115e59', intro: 'Conoce la escuela, consulta los trámites publicados y encuentra los documentos y medios de contacto.' },
  alumno: { title: 'Alumno', color: '#115e59', intro: 'Organiza tus clases, tareas, evaluaciones y trámites. Consulta primero Pendientes para saber qué necesita tu atención.' },
  profesor: { title: 'Docente', color: '#854d0e', intro: 'Trabaja con tus clases asignadas, prepara actividades y acompaña a tus alumnos. Las opciones de orientación aparecen cuando tienes grupos asignados.' },
  admin: { title: 'Administración', color: '#334155', intro: 'Administra el catálogo escolar, las cuentas, los ciclos y la publicación institucional desde los módulos habilitados.' },
  staff: { title: 'Personal operativo', color: '#4338ca', intro: 'Gestiona los trámites y la operación escolar desde los módulos que tiene habilitados tu cuenta.' },
  director: { title: 'Dirección', color: '#854d0e', intro: 'Revisa el panorama académico y las solicitudes, coordina la comunicación y consulta los módulos administrativos disponibles.' },
  finanzas: { title: 'Finanzas', color: '#1d4ed8', intro: 'Consulta conceptos, pagos y comprobantes; revisa los pendientes financieros y la búsqueda de alumnos de tu panel.' },
};

const topics: Record<string, string> = {
  pendientes: 'Agrupa asuntos que requieren atención. Abre el elemento para revisar su detalle; entrar a la bandeja no lo resuelve automáticamente.',
  horario: 'Consulta las clases por día y hora. Revisa el grupo, la asignatura y el docente antes de organizar tus actividades.',
  boleta: 'Consulta y descarga el documento de calificaciones del ciclo seleccionado.',
  kardex: 'Descarga tu historial académico en PDF. El acceso corresponde al expediente que tu cuenta puede consultar.',
  tareas: 'Abre la actividad para ver instrucciones y fecha límite. El alumno entrega su respuesta; el docente prepara y revisa las entregas de sus clases.',
  examenes: 'Consulta las evaluaciones habilitadas. Antes de iniciar un intento revisa el tiempo disponible y la fecha de cierre; el docente configura las evaluaciones de sus clases.',
  portafolio: 'Organiza y consulta evidencias de aprendizaje del alumno y de las clases que tienes asignadas.',
  extraordinarios: 'Consulta o gestiona los procesos de recuperación y sus registros desde las opciones que muestra tu perfil.',
  chat: 'Participa en la conversación de tu clase. Revisa el grupo antes de enviar un mensaje.',
  tutorias: 'Consulta o registra el acompañamiento y las sesiones de tutoría disponibles.',
  'eval-docente': 'Consulta la evaluación docente o responde el instrumento habilitado para tu perfil y periodo.',
  solicitudes: 'Abre un trámite o una solicitud de revisión, consulta su estado y da seguimiento a la respuesta.',
  mensajes: 'Abre una conversación, revisa su destinatario y envía el mensaje. La comunicación corresponde a las personas con las que tienes vínculo escolar.',
  avisos: 'Consulta avisos dirigidos a tu cuenta. Marca como leído cuando hayas revisado la información; la lectura queda registrada.',
  calendario: 'Consulta eventos y fechas de la comunidad escolar. Elige el periodo o descarga el calendario cuando esté disponible.',
  'estado-cuenta': 'Consulta cargos y pagos de tu cuenta. Un comprobante pendiente de revisión todavía no equivale a un pago validado.',
  ficha: 'Revisa tus datos escolares. Solicita la corrección cuando corresponda y espera la respuesta de Control Escolar.',
  reglamento: 'Lee la versión publicada del reglamento y registra tu aceptación cuando el sistema la solicite.',
  perfil: 'Consulta o actualiza los datos y la fotografía de tu propia cuenta.',
  'cambiar-password': 'Cambia tu contraseña usando el formulario seguro. Después del cambio, vuelve a iniciar sesión con la nueva clave.',
  seguridad: 'Configura o verifica tu autenticador y administra la seguridad de tu cuenta. Los perfiles privilegiados necesitan verificación MFA.',
  alumnos: 'Busca los alumnos que tu perfil puede consultar. Abre una ficha para ver sus datos y los trámites habilitados.',
  profesores: 'Consulta y administra los registros docentes y sus vínculos escolares.',
  usuarios: 'Gestiona cuentas, perfiles y recuperación de acceso. Verifica a la persona antes de restablecer contraseña o MFA; las credenciales iniciales tienen entrega limitada.',
  grupos: 'Organiza los grupos del ciclo escolar y revisa sus inscripciones.',
  materias: 'Administra el catálogo de asignaturas, semestre y campo disciplinar.',
  asignaciones: 'Relaciona docente, grupo, materia y ciclo. Estas asignaciones determinan el acceso a las clases.',
  horarios: 'Organiza las horas de cada clase y revisa los cruces de grupo y docente.',
  ciclos: 'Revisa el diagnóstico antes de cerrar. El cierre exige fechas y registros completos, motivo y confirmación; la reapertura deja historial. Los adeudos y las notas reprobatorias no bloquean por sí solos el cierre.',
  parciales: 'Gestiona los periodos de evaluación y sus solicitudes de apertura o corrección.',
  planeaciones: 'Prepara, entrega o revisa la planeación de las clases del ciclo seleccionado.',
  aprendizajes: 'Consulta o administra el catálogo de aprendizajes utilizado en la planeación.',
  'banco-preguntas': 'Organiza preguntas reutilizables para preparar evaluaciones.',
  generaciones: 'Consulta los resultados agregados de las generaciones y ciclos disponibles.',
  alertas: 'Revisa alertas y su contexto antes de decidir el seguimiento escolar.',
  riesgo: 'Consulta los indicadores académicos y de conducta con su contexto. Los pagos no modifican el nivel de riesgo académico.',
  pmi: 'Registra objetivos, acciones y seguimiento del Plan de Mejora Institucional.',
  correos: 'Prepara la comunicación con tutores, revisa destinatarios y contenido antes de enviar.',
  pagos: 'Revisa comprobantes y su estado. Validar registra el pago y su folio; rechazar requiere seguimiento o corrección del comprobante.',
  conceptos: 'Consulta o administra los conceptos financieros y sus importes desde las opciones habilitadas.',
  noticias: 'Consulta las noticias publicadas. En administración, guarda un borrador y revisa antes de publicar para visitantes.',
  convocatorias: 'Consulta el periodo y el documento oficial de cada convocatoria. Las fechas publicadas determinan cuándo está vigente.',
  anuncios: 'Consulta o publica comunicados para la comunidad y audiencia seleccionada.',
  publico: 'Administra el contenido que verán visitantes y familias. Un borrador no se muestra públicamente hasta que lo publiques.',
  auditoria: 'Consulta el historial de operaciones para dar seguimiento a los cambios escolares.',
  seiem: 'Prepara los reportes institucionales del periodo y revisa los datos antes de exportar.',
  push: 'Gestiona las notificaciones disponibles y revisa su audiencia antes de enviarlas.',
  clases: 'Abre una de tus clases asignadas para consultar alumnos, actividades y evaluación.',
  asistencia: 'Registra o revisa la asistencia de la clase y fecha seleccionadas.',
  propuestas: 'Propón las calificaciones de tus clases y revisa el estado de validación.',
  conducta: 'Registra o da seguimiento a reportes de conducta dentro de tus grupos autorizados.',
  rubricas: 'Define criterios de evaluación para revisar actividades con el mismo instrumento.',
  tutores: 'Consulta el directorio de tutores de los alumnos con los que tienes vínculo escolar.',
  constancia: 'Genera o descarga tu constancia de servicio del ciclo seleccionado.',
  orientacion: 'Acompaña tus grupos orientados y revisa las calificaciones y solicitudes de esos grupos.',
  academico: 'Consulta indicadores, grupos y resultados para coordinar el seguimiento académico.',
  oferta: 'Explora las asignaturas y los seis semestres de la oferta educativa.',
  guia: 'Consulta los requisitos, fechas y preguntas publicados para el ciclo elegido. Confirma los datos pendientes con Control Escolar.',
  descargas: 'Elige el ciclo y la versión del formato. PDF sirve para consultar e imprimir; DOCX permite llenarlo con un editor compatible.',
  contacto: 'Consulta teléfono, correo, horario y dirección. El mapa externo se carga cuando autorizas esa opción.',
  albumes: 'Explora los álbumes publicados de actividades escolares.',
  conoce: 'Recorre la información y las instalaciones presentadas por la escuela.',
  'app-movil': 'Consulta las instrucciones de instalación y descarga Android desde la dirección institucional. En iPhone usa el portal web mientras no haya app nativa publicada.',
  privacidad: 'Consulta cómo se tratan los datos escolares y los medios institucionales disponibles.',
  cookies: 'Consulta y cambia tus preferencias de servicios opcionales. Rechazarlos mantiene el acceso y tu sesión escolar.',
  login: 'Entra con las credenciales entregadas por la escuela. Completa cambio inicial y autenticador cuando se soliciten.',
};

export function describeModule(href: string, role: HelpRole, label: string) {
  const parts = href.split('?')[0].split('/').filter(Boolean);
  if (href.startsWith('/admin/publico/descargas')) return 'Administra formatos públicos por ciclo, versión y vigencia. Sube PDF y DOCX, conserva una versión anterior como histórica y publica solo después de revisar el contenido. Un borrador no está disponible para visitantes.';
  if (href.startsWith('/admin/publico/guias')) return 'Edita requisitos, fechas y preguntas de cada ciclo; guarda borrador o publica para web y app móvil. Usa información confirmada por la escuela y comprueba la guía pública después de guardar.';
  if (parts.includes('calificaciones')) return role === 'alumno'
    ? 'Consulta tus calificaciones del periodo. Si necesitas una revisión, utiliza Mis solicitudes.'
    : parts.includes('orientacion') ? 'Revisa las propuestas de calificación de tus grupos orientados y registra su validación o corrección.'
      : 'Consulta o gestiona las calificaciones del grupo y periodo habilitados. Revisa propuestas, validación y solicitudes antes de confirmar cambios.';
  if (parts.includes('publico') && parts.length > 2 && parts[1] === 'publico') return topics.publico;
  for (const part of [...parts].reverse()) if (topics[part]) return topics[part];
  return `Abre ${label} para consultar el resumen y las opciones disponibles de esta sección.`;
}

/** Explanations only: never execute a target or inspect field values. */
export function describeControl(label: string, href: string | null, role: HelpRole, pathname: string) {
  if (href) return describeModule(href, role, label);
  const text = label.toLocaleLowerCase('es-MX');
  if (pathname.includes('/ciclos') && /registrar cambio|acción|diagnóstico/.test(text)) return topics.ciclos;
  if (pathname.includes('/pagos') && /validar|aprobar/.test(text)) return 'Valida el comprobante seleccionado y registra su pago y folio. Comprueba alumno, concepto, importe y evidencia antes de confirmar.';
  if (pathname.includes('/calificaciones') && /enviar|proponer/.test(text)) return 'Envía las calificaciones propuestas del grupo y parcial seleccionados para su revisión. Revisa las notas antes de registrar la propuesta.';
  if (/cerrar sesión/.test(text)) return 'Termina tu sesión y vuelve al acceso. Guarda antes el trabajo que todavía no hayas enviado.';
  if (/cerrar ciclo/.test(text)) return topics.ciclos;
  if (/reabrir/.test(text)) return 'Reabre el ciclo para permitir correcciones; requiere motivo y deja un registro de auditoría.';
  if (/eliminar|borrar/.test(text)) return 'Elimina el registro indicado. Revisa el elemento y la confirmación antes de continuar.';
  if (/rechazar/.test(text)) return 'Registra el rechazo o la devolución del elemento seleccionado. Revisa el motivo y los datos antes de confirmar.';
  if (/validar|aprobar|confirmar/.test(text)) return 'Confirma la operación del registro seleccionado. Revisa sus datos, periodo y estado antes de enviarla.';
  if (/publicar/.test(text)) return 'Hace visible el contenido para la audiencia indicada. Revisa texto, fechas, archivo y destinatarios antes de publicarlo.';
  if (/entregar|enviar/.test(text)) return pathname.includes('examen') ? 'Envía las respuestas del intento actual. Revisa que hayas respondido las preguntas antes de finalizar.' : 'Envía el formulario o respuesta actual. Revisa destinatario, contenido y fecha antes de continuar.';
  if (/guardar|actualizar/.test(text)) return 'Guarda los cambios del formulario actual. Revisa los campos obligatorios y espera el mensaje de confirmación.';
  if (/descargar|exportar|imprimir/.test(text)) return 'Genera o descarga el documento indicado con los filtros y periodo seleccionados.';
  if (/iniciar.*examen|comenzar.*intento/.test(text)) return 'Inicia tu intento y su tiempo de evaluación. Revisa instrucciones, duración y disponibilidad antes de empezar.';
  if (/filtrar|consultar|buscar/.test(text)) return 'Actualiza la lista según el texto, ciclo o filtros elegidos. No modifica los registros escolares.';
  if (/cancelar|volver|cerrar/.test(text)) return 'Cierra esta vista o vuelve a la anterior. Los cambios del formulario se conservan solo si ya los guardaste.';
  if (/nuevo|nueva|crear|agregar|añadir/.test(text)) return 'Abre o crea un registro del tipo indicado. Completa y revisa sus campos antes de guardar.';
  if (/editar|modificar/.test(text)) return 'Abre el registro para cambiar sus datos. Guarda al terminar y comprueba la confirmación.';
  if (/notificacion|aviso|lectura|leído/.test(text)) return 'Consulta los avisos o registra la lectura del elemento que acabas de revisar.';
  if (/menú|colapsar|expandir/.test(text)) return 'Muestra, oculta o compacta la navegación. Las funciones disponibles dependen de tu cuenta.';
  if (/oscuro|claro|tema/.test(text)) return 'Cambia la presentación del portal. No modifica tus datos escolares.';
  if (/siguiente|anterior|^\d+$|[»«]/.test(text)) return 'Cambia la página de resultados o el paso mostrado. No guarda ni modifica registros.';
  if (/contraseña/.test(text)) return topics['cambiar-password'];
  if (/autenticador|verificar/.test(text)) return topics.seguridad;
  return `Usa «${label}» para la operación indicada en esta pantalla. ${describeModule(pathname, role, 'el módulo actual')} Revisa los datos y el resultado que muestra el sistema.`;
}
