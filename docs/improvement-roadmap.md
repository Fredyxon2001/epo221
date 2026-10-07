# Mejoras escolares — estado del 2026-10-06

Actualización 2026-10-07: asistente visual vestido por rol y guía secuencial introducción→controles→siguiente módulo implementados en web y app vigente; recomendaciones y tiendas oficiales Google Authenticator añadidas. Guía pública11 módulos y RN Web de todos los roles pasan. Fuente móvil e32b936 publicada en Git/CI success; APK code8 solicitado una sola vez (EAS e1347938-eed4-4934-adab-561741c78807), pendiente QA nativo antes de distribución/OTA. Descarga code7 sigue vigente hasta terminar esa comprobación. Web final, rutas compartidas, compilación y estado de despliegue se registrarán a continuación en AGENTS.md. Se conservan los pendientes institucionales y límites de verificación descritos abajo.

Implementadas: motor de riesgo por grupo/ciclo con fallos explícitos y finanzas separadas; avisos críticos atómicos/deduplicados; bandejas por rol en web/app; diagnóstico, cierre y reapertura auditados; guías públicas editables por ciclo; sitemap/metadata del contenido publicado; teclado/foco/movimiento reducido/texto ampliado y optimización de imágenes.

Las reglas de cierre son operativas: fechas concluidas, inscripción/materias/calificaciones completas, grupos consistentes y revisiones resueltas. Los adeudos y las notas reprobatorias no bloquean el cierre ni modifican el riesgo. No sustituyen decisiones pedagógicas o normativa institucional. Reapertura con motivo para corregir un ciclo cerrado.

## Evidencia
- Tipos/lint/build y 143 guardas/cookies/riesgo paginado >1100 alumnos pasan.
- Cuentas/ciclos desechables comprueban cierre/reapertura, bloqueo en base, MFA, scopes, avisos nuevos/deduplicación y bandeja propia/ajena.
- Finanzas comprueba recibo/rechazo/corrección/validación/folio, SELECT de bandeja y DML directo denegado.
- Navegador visible de 390px comprueba guía administrable, HTML escapado, teclado, menú/Escape, zoom200%, movimiento reducido y cero errores.
- SEO comprueba noticia/álbum/CMS publicados con fechas/canonical, ocultación de borradores y eliminados.
- RN Web comprueba login, MFA, cambio obligatorio, calificaciones, entrega de tarea, avisos, navegación y ciclos. APK Android1.2.0/code6 limpio PASS en API29/x86_64: login/Unicode/persistencia/reanudación/entrega con UN toque/avisos/cuenta/contraseña/TOTP/rol/cierre/reapertura/logout; cleanup PASS. Code5 se descartó por consumir el primer toque del formulario; arreglo incorporado en code6.
- Lighthouse: referencia rendimiento51/accesibilidad96/LCP7.63s/CLS0/TBT618ms. Último ensayo sin emulador tras reducir filtros móviles: rendimiento73/accesibilidad100/buenas prácticas100/SEO100/LCP2.98s/TBT548.5ms/CLS0.00305. Se conservan corridas intermedias y condiciones; no son métricas de campo ni certificación WCAG.
- PWA: registro activo en producción; portada/título/enlace principal visibles también sin JavaScript.

## Continuidad operativa pendiente
1. Ensayo local gratuito PASS: 63 tablas/5612 filas/125 FK/ocho archivos en PostgreSQL aislado sin red ni almacenamiento persistente. Auth solo tiene UUID de referencia; todavía falta simulacro integral de contraseñas/MFA, RLS/RPC/triggers, servicio Storage e infraestructura en Supabase. Se cotizó rama en organización de EPO221: 0.01344 USD/h; confirmación de costo pendiente. Eliminar rama al terminar. Nunca restaurar sobre producción.
2. QA del APK nativo code7 PASS, firmado con certificado original; Android físico ARM y actualización desde1.0 siguen sin comprobar. iOS todavía requiere compilación/dispositivo. Descarga1.2.0/code7 mediante release GitHub público detrás de /app-movil/descargar; Supabase devolvió413 por tamaño y no se contrató plan. QR antiguos directos al objeto Supabase todavía descargan1.0: sustituirlos por la ruta institucional.
3. Actualización PostgreSQL del proveedor: comprobar versión disponible, compatibilidad y recuperación antes de ventana; no actualizar infraestructura sin ese ensayo.
4. Responsables institucionales: aprobar aviso/contacto/retenciones, fotografías, custodios de MFA/claves y alertas/cuotas; revisar protección de rama según acceso/plan. No inventar aprobación institucional.
5. Ampliar flujos E2E y auditoría de accesibilidad con lector de pantalla/datos sintéticos en entorno aislado; medir LCP/INP/CLS de campo. QA actual no garantiza ausencia absoluta de bugs ni conformidad WCAG/legal.

## Revisión diaria
Heartbeat revisi-n-diaria-epo-221 ACTIVE, 09:00 America/Mexico_City. Lectura/metadatos y hallazgos materiales documentados; avisar solo cambios importantes. Sin fixtures de escritura en producción ni reparación/despliegue automático.

Detalles y comandos en AGENTS.md, docs/security-operations.md y ../epo221-mobile-github/docs/native-verification.md.

## Revisión pública adicional — 2026-10-06

Hallazgos de la revisión inicial; implementados en la entrega siguiente (véase estado más abajo):

- Guía escolar: cero guías publicadas. El editor y API existen, pero faltan requisitos, fechas y preguntas aprobadas/publicadas para que sean útiles en web y móvil.
- Portada anuncia «Ciclo 2026-A abierto» e «Inscripciones en curso» con texto fijo; ciclo activo registrado 2025-2026. Confirmar calendario/admisión y sustituir anuncios fijos por información administrable, sin modificar el ciclo académico real para hacer coincidir una leyenda.
- Descargas conserva títulos/requisitos fijos 2025-2026-2. Revisar vigencia institucional; administrar versiones por ciclo y ofrecer PDF accesible además del DOCX editable.
- Menú de escritorio usa items.slice(0,8), ocultando Contacto y páginas CMS adicionales al agregar Guía escolar. El botón alternativo se oculta desde xl. Mantener acceso visible a todas las secciones mediante distribución o menú adicional.
- Convocatorias usa fecha UTC y compara una fecha SQL a medianoche con el instante actual para el distintivo, y no comprueba vigente_desde. Puede concluir antes del fin del día local o anunciar apertura futura. Usar días del calendario de México, límite final inclusivo, validación de rango y estados coherentes en admin/público.
- Sin JavaScript, los encabezados de Oferta, Convocatorias, Descargas y Contacto tienen opacity:0; todas esas páginas carecen de h1. Corregir SectionHeader sin ocultar contenido inicial y permitir nivel semántico de encabezado.
- No interpretar el PASS anterior de portada sin JavaScript ni Lighthouse100 accesibilidad/SEO como cobertura de todas las subpáginas. Ampliar la prueba a cada plantilla y usar lector de pantalla. Rendimiento móvil73/LCP2.98s pertenece al ensayo anterior; falta LCP/INP/CLS real por dispositivo.

## Implementación de las seis mejoras y recorridos — 2026-10-06

Navegación completa, calendario mexicano inclusivo, h1 visibles sin JavaScript, portada basada en ciclo registrado, guía escolar publicada y catálogo de documentos por ciclo implementados. El catálogo distingue históricos; nuevos archivos quedan privados hasta publicación, con previsualización MFA, URLs propias y versiones inmutables al publicar. Guía de uso web por seis roles/orientación y guía nativa por rol/pantalla implementadas, sin ejecutar operaciones durante el recorrido. Se retiró Framer del modo público y se carga ayuda pública bajo demanda.

Tipos/unidades/exportes móvil, RN Web, seguridad/calendario web y recorrido web seis roles pasan. Nuevo APK code7 en QA antes de distribuir; medición de rendimiento y despliegue final se registrarán después de build. Pendientes institucionales reales: actualizar/confirmar calendario, requisitos y formatos vigentes; aviso/retención/fotografías/custodia. Pendientes técnicos con alcance separado: percentiles de campo, lector de pantalla, dispositivo ARM/upgrade físico e iOS nativo, recuperación integral de Auth/infraestructura. No se certifica ausencia absoluta de bugs.

Estado final de guía Android: code7 firmado QA nativo completo PASS (guía contextual alumno/admin, pasos/AndroidBack/login/MFA/Unicode/reanudación/tareas UN toque/avisos/cuentas/contraseña/ciclos/historial), release inmutable publicado y bytes/hash comprobados. OTA Android/preview/runtime1.2 aprobada también PASS sobre instalador original code6 tras reabrir; no toca runtime1.0/iOS. Guía web seis roles/orientación y catálogo privado/publicación/retirada pasan en producción. CI webce5e44e/móvil129ee8a success; web READY. Descarga estable307/no-store sirve compilación7; instalador390px publicado sin desborde/errores. Laboratorio/proxy/fixtures propios limpiados.

Rendimiento publicado ce5e44e: tres corridas90/93/73, mediana90/LCP2.854s/TBT151ms/CLS0.003052; todas accesibilidad/buenas prácticas/SEO100. Corrección posterior e00cc96 entrega el banner en SSR manteniendo el mapa bloqueado hasta validar la cookie cliente; rechazo falla cerrado aunque el navegador impida guardar. Quince casos de navegador y seguridad/build/tipos/lint pasan local y el helper de cookies pasa en producción. Vercel READY y CI success.

Tres mediciones finales e00cc96: rendimiento79/93/92, LCP2.749/2.497/2.447s y TBT475/186/257ms. Mediana92/LCP2.497s/TBT257ms/CLS0.0037; accesibilidad/buenas prácticas/SEO100 en todas y cero errores HTTP/JS. LCP mediano queda por margen mínimo dentro de2.5s y una corrida excede; TBT sigue mejorable. Condiciones y todas las corridas en AGENTS y evidencia fueraGit. Faltan percentiles de usuarios reales y lector de pantalla; estos scores no acreditan conformidad WCAG/legal ni ausencia absoluta de bugs.

## Avatar y explicación completa — 2026-10-07

Web eb0056d publicado READY: avatar local vestido por rol/orientación, recorrido de introducción y controles de cada módulo antes del siguiente, regreso entre módulos y continuidad segura en App/contraseña. Google Authenticator recomendado mediante enlaces oficiales, conservando autenticadores TOTP existentes. Recorrido público completo11módulos/205controles y seis roles/orientación pasan en producción, sin ejecutar operaciones desde la ayuda. Formularios todavía cerrados requieren apertura voluntaria y ayuda contextual. Documentación/procedencia del atlas en docs/guide-avatar.md.

Una ampliación de la inspección detectó que el marcado automático de avisos al montar podía ejecutarse detrás del coach. Pausa de lecturas mientras guía/pestaña oculta implementada y publicada en bab16416 (READY/CI success): cero lecturas durante ayuda y una al cerrar, comprobado en producción con aviso individual sintético. Recorridos completos alumno21módulos/80controles y docenteorientación28/130 pasan con cero escrituras, también al seguir después deAvisos sin cerrar la guía; cleanup exacto PASS. Probe reutilizable con autorización --live en scripts/verify-guide-notice.cjs. App móvil fuente e32b936 pasa tipos/unidades/exportes/RNWeb por roles y MFA; build único code8 e1347938-eed4-4934-adab-561741c78807 espera cola EAS. Mantener descarga code7 y OTA aprobada anterior hasta firma/hash y QA nativa de code8; no atribuirles aún el avatar o los94 pasos nuevos. Estos avances no cierran pendientes institucionales, recuperación integral, ARM/iOS ni métricas de campo.

Coherencia de onboarding: UI y plantilla de importación corregidas para describir claves individuales, cambio inicial obligatorio, accesos existentes preservados y entrega de cuentas nuevas mediante descarga única24h. No cambia el mecanismo seguro del servidor. Compatibilidad adicional pendiente: aceptar CURP legacy directamente en móvil; actualmente esas cuentas entran con su correo completo, y las nuevas entregas ya usan correo institucional. Probado con cuenta sintética propia y limpieza exacta; no es regresión de la guía ni razón para cambiar accesos reales.

Android code8 terminó, firmado con certificado original y QA nativa completa/visual del avatar PASS, instalación limpia y OTA bloqueada; cleanup exacto PASS. Nuevo instalador inmutable público71413729bytes/SHA256cf00615193c8ea5382c9bcfc2fbdd5cb687ec1e2e45da4ace091602ed13bd4c7, fuente e32b936/EAS e1347938, preserva code6/code7. Destino institucional actualizado a8 en publicación; OTA Android/preview/runtime1.2 en publicación y prueba de recepción sobre code7. No modifica runtime1.0/iOS ni cierra límites físicos/recuperación integral/criterios institucionales/mediciones de campo.
