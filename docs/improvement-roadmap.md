# Prioridades de mejora — EPO 221

Revisión del 2026-10-06. El usuario pidió evaluar mejoras del área privada y pública y activar revisión diaria con avisos solo de cambios importantes. Este plan distingue fallos comprobados, tareas operativas pendientes y mejoras propuestas. No acredita conformidad legal ni ausencia de bugs.

## Estado comprobado

- Web funcional: main 06d35d7, Vercel dpl_7vm5NFUjn5fMSoKJQhFmXZi6iE7x READY; check GitHub `verify` completed/success. El workflow ya comprueba seguridad/tipos/build: no proponerlo como inexistente. Protección de main: API 404, no se pudo distinguir ausencia de protección de falta de acceso a ese recurso.
- Móvil: EAS 16612c72-d6b7-4479-b421-0f3f7aafcca9 FINISHED, Android 1.1.0/versionCode 3, código 4b57a3a. Falta instalación/persistencia/reanudación en dispositivo; el APK institucional todavía requiere esa validación antes de sustituirse.
- La base devolvió PostgreSQL 17.6. La documentación oficial anuncia 17.11 con correcciones de seguridad; planificar actualización compatible y recuperación previa, sin ejecutarla por esta evaluación.
- Las consultas remotas de esta revisión solo leen metadatos. La comprobación inválida de pagos usó LIMIT 0 y reprodujo 42703 sin consultar expedientes.

## Primera etapa: integridad y continuidad

| Prioridad | Pendiente | Evidencia y criterio para cerrarlo |
|---|---|---|
| 1 | Reparar motor de riesgo académico | `src/lib/riesgo/score.ts` solicita pagos.monto/estado inexistentes: el esquema usa monto_pagado y cargos.estatus. Se ignora el error, por lo que el factor de adeudo queda vacío. Las tareas se toman de todo el ciclo, sin pertenencia por inscripción/asignación ni vencimiento por alumno. Corregir con pruebas de dos grupos, tareas futuras/ajenas y fallos de consulta; ninguna alerta debe salir de un cálculo incompleto. |
| 1 | Reparar avisos del cron de riesgo | `src/app/api/cron/calcular-riesgo/route.ts` inserta notificaciones.perfil_id; la columna real es user_id. Actualmente ignora el resultado de ese insert. Probar aviso de orientador correcto, deduplicación de casos nuevos y error explícito. No emitir avisos reales durante una prueba. |
| 1 | Simulacro integral de recuperación | La copia de aplicación y su descifrado están comprobados; restaurar Auth/esquema/relaciones/Storage/infraestructura sigue pendiente. Ensayar en otro proyecto con datos sintéticos, documentar tiempos y custodia externa de claves. No restaurar sobre producción. |
| 1 | Entorno de pruebas separado | `security-operations.md` indica que previews comparten proyecto existente. Provisionar un entorno con datos sintéticos y aislamiento de variables/Storage/cron antes de E2E recurrentes con escritura. Confirmar disponibilidad y costes con el propietario institucional. |
| 1 | Actualización PostgreSQL/proveedor | Planificar 17.6→versión parcheada disponible; inventariar pgcrypto/operadores y compatibilidad, respaldo y prueba de recuperación antes de programar la ventana. No hay columnas ltree ni extensión btree_gist en los metadatos inspeccionados; eso no sustituye toda la evaluación de actualización. |
| 2 | Recuperación y operación institucional | Revisar correo verificable, pérdida de MFA, custodios y último administrador; aprobar aviso de privacidad/contacto/retenciones, configurar alertas de fallos 5xx/cron/cuotas con responsable definido y revisar protección de rama según permisos/plan. Mantener estos pendientes explícitos. |

Los pesos, umbrales y recomendaciones del riesgo académico requieren validación pedagógica. El código mezcla datos financieros con el score y presenta umbrales como SEIEM sin una fuente institucional verificada en esta revisión. Separar seguimiento financiero de decisiones académicas y validar reglas antes de habilitar decisiones automáticas; no cambiar porcentajes ni inventar criterios normativos para corregir un problema de consulta.

## Segunda etapa: uso diario del área privada

- Ampliar E2E por rol en el entorno aislado: login/MFA/recuperación, calificaciones/boletas, tareas/exámenes, avisos/adjuntos, pagos y solicitudes de ficha. Incluir ausencia de acceso ajeno, doble envío, concurrencia, red caída y mensajes de error. Web ya tiene scripts con fixtures; móvil tiene pruebas de gates/almacenamiento y recorrido RN Web, pero falta automatización CI propia y validación nativa.
- Revisar errores de consultas en módulos todavía heredados y usar respuestas verificables para evitar pantallas vacías o éxito aparente. El motor de riesgo ofrece un caso comprobado para comenzar.
- Mejorar una bandeja de pendientes por rol y ciclo reutilizando solicitudes/avisos/reportes existentes: estado, responsable, fecha, filtros y cierre auditado. No crear módulos duplicados de asistencia, pagos o calificaciones que ya existen.
- Validar la calidad de importaciones y datos antes de cada ciclo: duplicados, identidad, inscripciones/asignaciones y conciliación de cargos con pagos validados. Medir errores y confirmar con cuentas sintéticas antes de añadir nuevas automatizaciones.
- Completar QA del APK con `../epo221-mobile-github/docs/native-verification.md`; móvil conserva alcance de alumno, con acceso al portal para otros roles. Adjuntos/exámenes nativos son mejoras futuras, no funciones verificadas actualmente.

## Tercera etapa: área pública

- **Accesibilidad medible:** auditoría de teclado/foco, lectores de pantalla, contraste, zoom, etiquetas y movimiento reducido con WCAG 2.2 AA como objetivo. HeroVideo ya respeta movimiento reducido; extender la evaluación a Reveal/Stagger/cursor/animaciones y navegación. No afirmar que toda la web carece de ese soporte ni que ya es conforme.
- **Velocidad móvil:** establecer primero una línea base en producción y conexión lenta. Medir vídeo/imágenes, scripts y estabilidad visual; priorizar por resultados. Objetivos de campo: LCP ≤2.5 s, INP ≤200 ms y CLS ≤0.1 en percentil 75; una corrida de Lighthouse no certifica INP ni métricas de campo.
- **SEO del contenido publicado:** sitemap ya existe, pero solo enumera rutas fijas y usa fecha de generación como lastModified. Incluir noticias/álbumes/páginas CMS publicadas con fechas reales, metadata/canonical/social y excluir borradores. No indexar paneles privados.
- **Gestión editorial:** evaluar borrador, vista previa, responsable, revisión, programación/caducidad e historial de publicación de noticias/convocatorias; confirmar cada función existente antes de ampliarla. Mantener el contenido administrable desde el panel.
- **Entrega y mantenimiento:** README dice Next.js 14 aunque package.json usa 16.3.8; la guía de entrega afirma portabilidad absoluta pese a URLs institucionales/identidad EAS y opciones de proveedor. Actualizar versión, inventario de propietarios/variables/dominios/firmas y pasos reales de transferencia, sin secretos.

## Revisión diaria autorizada

Heartbeat `revisi-n-diaria-epo-221`, ACTIVE, todos los días a las 09:00 en America/Mexico_City. Revisa este chat y ambos repositorios; usa únicamente lectura y metadatos, y registra hallazgos materiales localmente. Avisa de regresiones, vulnerabilidades importantes nuevas, fallos de build/deploy/respaldo, cierre verificado de pendientes importantes o decisiones necesarias. No repite pendientes sin cambios, no hace E2E con escritura en producción ni implementa/despliega cambios automáticamente. El usuario eligió revisión diaria, no reparación continua sin revisión.

Orden recomendado: reparar y probar riesgo/avisos, aislar pruebas y ensayar recuperación; después completar QA nativo y mejorar accesibilidad/velocidad/SEO con mediciones.

## Fuentes oficiales consultadas

- [Respaldos Supabase](https://supabase.com/docs/guides/platform/backups): el respaldo de base no incluye bytes de Storage; Free necesita exportaciones/custodia independiente.
- [Actualización PostgreSQL 15.19/17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes): compatibilidad de índices, cifrados antiguos y operadores.
- [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/): criterios de accesibilidad.
- [Core Web Vitals](https://web.dev/articles/vitals): objetivos, percentil 75 y diferencia laboratorio/campo.
- [Google Search Central](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): contenido, títulos, enlaces e indexación.
