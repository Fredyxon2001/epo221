# Mejoras escolares — estado del 2026-10-06

Implementadas: motor de riesgo por grupo/ciclo con fallos explícitos y finanzas separadas; avisos críticos atómicos/deduplicados; bandejas por rol en web/app; diagnóstico, cierre y reapertura auditados; guías públicas editables por ciclo; sitemap/metadata del contenido publicado; teclado/foco/movimiento reducido/texto ampliado y optimización de imágenes.

Las reglas de cierre son operativas: fechas concluidas, inscripción/materias/calificaciones completas, grupos consistentes y revisiones resueltas. Los adeudos y las notas reprobatorias no bloquean el cierre ni modifican el riesgo. No sustituyen decisiones pedagógicas o normativa institucional. Reapertura con motivo para corregir un ciclo cerrado.

## Evidencia
- Tipos/lint/build y 143 guardas/cookies/riesgo paginado >1100 alumnos pasan.
- Cuentas/ciclos desechables comprueban cierre/reapertura, bloqueo en base, MFA, scopes, avisos nuevos/deduplicación y bandeja propia/ajena.
- Finanzas comprueba recibo/rechazo/corrección/validación/folio, SELECT de bandeja y DML directo denegado.
- Navegador visible de 390px comprueba guía administrable, HTML escapado, teclado, menú/Escape, zoom200%, movimiento reducido y cero errores.
- SEO comprueba noticia/álbum/CMS publicados con fechas/canonical, ocultación de borradores y eliminados.
- RN Web comprueba login, MFA, cambio obligatorio, calificaciones, entrega de tarea, avisos, navegación y ciclos. Pruebas nativas Android pendientes de completar build EAS 1.2.0/code5.
- Lighthouse de referencia: rendimiento51/accesibilidad96/LCP7.63s/CLS0/TBT618ms. Nueva medición tras publicación pendiente; no son métricas de campo.

## Continuidad operativa pendiente
1. Entorno Supabase aislado y simulacro de Auth/esquema/relaciones/Storage/infraestructura. Respaldo de aplicación cifrado y validación temporal no sustituyen recuperación integral. Se cotizó rama en organización de EPO221: 0.01344 USD/h; confirmación de costo pendiente. Eliminar rama al terminar. Nunca restaurar sobre producción.
2. QA del APK nativo y actualización de descarga institucional solo después de instalación/login/persistencia/reanudación/logout comprobados. Android oficial ya instalado y emulador arrancó. iOS todavía requiere compilación/dispositivo.
3. Actualización PostgreSQL del proveedor: comprobar versión disponible, compatibilidad y recuperación antes de ventana; no actualizar infraestructura sin ese ensayo.
4. Responsables institucionales: aprobar aviso/contacto/retenciones, fotografías, custodios de MFA/claves y alertas/cuotas; revisar protección de rama según acceso/plan. No inventar aprobación institucional.
5. Ampliar flujos E2E y auditoría de accesibilidad con lector de pantalla/datos sintéticos en entorno aislado; medir LCP/INP/CLS de campo. QA actual no garantiza ausencia absoluta de bugs ni conformidad WCAG/legal.

## Revisión diaria
Heartbeat revisi-n-diaria-epo-221 ACTIVE, 09:00 America/Mexico_City. Lectura/metadatos y hallazgos materiales documentados; avisar solo cambios importantes. Sin fixtures de escritura en producción ni reparación/despliegue automático.

Detalles y comandos en AGENTS.md, docs/security-operations.md y ../epo221-mobile-github/docs/native-verification.md.
