# Mejoras escolares — seguimiento al 2026-10-19

## Permisos y recuperación sin pago — cierre19oct

**Notas protegidas en producción:** migraciones20261020021143/20261020021238 aplicadas una vez en el escolar, después de desplegar consumidores compatibles. SELECT/filtro/orden directo de nota denegados; metadata8campos, RLS, publicación, alumno propio y docente asignado preservados. Prueba alojada de permisosLIMIT0 sin leer notas ni crear fixtures. Web funcional0811d8f en ambos dominios READY, ambasCI SUCCESS;23páginas/13recursos/0fallos. Recibo e ID exactos en AGENTS. Pestañas antiguas requieren recarga; evitar rollback al lector crudo.

**Web y móvil comprobados:** suite web integral aislada, tipos/seguridad/contratos y RNWeb390 fresco con roles/aprendizaje PASS. AppQA corrigió cachéMetro con --clear y guarda del destinoexacto; ambasCImóvil288a499 SUCCESS. ProductoAPK15/fuente69c93029 sigue vigente; no nuevoEAS/OTA ni pruebaAndroid/iOSnativa por esta migración de backend. Cierre documental móvilbf7573f publicado; CI final se comprobará al terminar.

**Recuperación gratuita ejecutada:** [runnerGitHub39360725548](https://github.com/Fredyxon2001/epo221/actions/runs/39360725548) recuperó datos sintéticos/Auth/contraseña+MFAoriginales/Storage/RLS/grants y limpió fixtures, recibo poscleanupsource0811d8f verificado. No datos escolares ni artifacts/secretos productivos. Respaldo real de aplicación cifrado y copia local íntegraPASS. Estos controles no equivalen a restauración gestionada escolarAuth/infra ni custodiaexterna.

**Pendiente externo sin pago:** origen2.398GB/1GB, escolar0.074GB, gracia27oct. Supabase bloquea transferir mientras la fuente siga en gracia y crear tercerFree por límite2; backup/clonegestionados requierenPro. Org educativaFree vacía preparada, no traslado/noDRoperativo. Responsable del exceso debe revisar/autorizar reducción concreta deStorage; no se borró/pausóInventario ni se pagó. Detalle en AGENTS y docs/full-recovery-lab.md.

## Recibo anterior

Recibo histórico de la entrega anterior: **web 05c91a00c2a2a6c991ef9f9710454e487eae90dc**, ambas CI SUCCESS (Security and build39342910137 e Isolated school flows39342910106), Vercel **dpl_FeTTFyaaS1aK7C8GH2Tzarg3tkvt READY** y epo221.edu.mx/www con SHA exacto. Revisión publicada23páginas/13recursos/0fallos; guardas privadas/APIs/logout/no-store y HEAD institucional aAPK15 PASS. Página de instalación320/390/1440: sin desborde, QR208/278/280px dentro de tarjeta, axe seleccionado0 y runtime0. Dos mensajes de consola por ancho corresponden a prefetch /cookies y /privacidad bloqueado por el instrumento; HEAD real de ambas200 y logo200. No se afirma consola0. **APK1.4.0/code15 publicado**: fuente69c93029e816165fbb578d722e85af2c8efaf45e,18/18 pruebas nativas nuevas y limpieza PASS,71,536,713bytes/SHA256cff50e4927e8961f36b07aba3d508a56584c40b4476cd1c79042ea10a730bef0 verificados públicamente. Fuente y cierre documental móvil6774c2c4bf50919300d9644e914ae05df696ed0f tienen ambasCI SUCCESS; el último sólo cambia4documentos. Code10 se conserva como reversión. Este recibo final sólo edita AGENTS/roadmap: no cambia producto ni requiere otro APK/OTA. Los bloques anteriores fechados conservan su alcance histórico.

## Siete mejoras y exámenes nativos — entrega del19oct

| Frente | Resultado comprobado | Alcance y pendiente |
| --- | --- | --- |
| 1. Avisos | Acuse explícito, error/reintento y adjunto privado; descargar no marca lectura | Web/RNWeb y APK15 aislados; sin escrituras de QA alojadas |
| 2. Chats | Acuses sólo del hilo/cuenta visibles, suspendidos durante guía/background; envío único | Ambos chats con ayuda tocable fuera de StatusBar en API24/29 |
| 3. Borradores | Tareas/mensajes por cuenta, aviso al salir y restauración temporal | En memoria: no sobreviven cierre completo, no sustituyen entrega |
| 4. Archivos privados | Selección nativa, entrega con archivo, descarga autorizada y URI con permiso/readback diferido | Migración escolar20261019185038 aplicada una vez; readiness200true/anon401 |
| 5. Accesibilidad móvil | Fuente1.3 y TalkBack real de fuente oficial firmado QA, foco/acción/TTS y guía por rol | Emuladores; audio físico/gestos/ARM/iOS/Android16 runtime pendientes |
| 6. Sitio público | Navegación/recursos/PDF y estados seleccionados axe/teclado/tamaños, fechas civiles corregidas | No certifica PDF/UA ni WCAG; datos oficiales y p75 requieren validación institucional/de campo |
| 7. CI y recuperación | Suites aisladas web/móvil y recuperación local con Auth/TOTP/RLS/Storage, CI programada | Auth/infraestructura alojados, custodia externa y RPO/RTO institucionales pendientes |
| Exámenes nativos | Alumno: preview sin intento, inicio, autosave, reanudar mismo intento y entregar; API/UI ocultan nota cuando corresponde | SELECT histórico propio de examen_intentos.calificacion requiere migración compatible; personal usa portal |

Conector Supabase sigue sin acceso al escolar; vía alternativa expresamente autorizada de sesión autenticada de navegador confirmó proyecto, catálogos, migración y asesores. Asesor UI:0errores/20advertencias/3info anunciados; revisión acotada de buckets/helpers internos, sin revocar funciones usadas por RLS. No es certificación integral. Cuota compartida StorageSizeExceeded: promedioorganización2.395GB/1GB; escolar0.073GB; gracia termina **27oct2026**. El titular debe resolver capacidad o aprobar presupuesto antes de esa fecha; no se contrató ni borró otro proyecto. Auth402/429 conserva sesión cifrada para reintentar y bloquea acceso, sin resolver esa cuota.

Guías por rol y recomendaciones Google Authenticator ya disponibles. Las reglas operativas de cierre, aprobaciones, custodia y publicaciones oficiales siguen sujetas a responsables escolares. No se atribuye ausencia absoluta de bugs ni cumplimiento normativo completo a estas pruebas. Los bloques fechados anteriores siguientes son historia.

Nota histórica del 2026-10-07, antes de publicar code8: asistente visual vestido por rol y guía secuencial introducción→controles→siguiente módulo implementados en web y app vigente; recomendaciones y tiendas oficiales Google Authenticator añadidas. Guía pública11 módulos y RN Web de todos los roles pasan. Fuente móvil e32b936 publicada en Git/CI success; APK code8 solicitado una sola vez (EAS e1347938-eed4-4934-adab-561741c78807), pendiente QA nativo antes de distribución/OTA. Descarga code7 sigue vigente hasta terminar esa comprobación. Web final, rutas compartidas, compilación y estado de despliegue se registrarán a continuación en AGENTS.md. Se conservan los pendientes institucionales y límites de verificación descritos abajo.

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

## Continuidad operativa — recibo histórico2026-10-16 (actualizado en el estado del19oct arriba)

1. Simulacro integral local PostgreSQL17.11 PASS con Auth/TOTP originales, revocación, relaciones/RLS y bytes Storage públicos/privados. Respaldo real de aplicación y copia cifrada local íntegra/reciente PASS hoy. Siguen pendientes Auth alojado/infraestructura, custodia externa y objetivos institucionales RPO/RTO. Se utilizó Docker propio; no se contrató la rama cotizada anteriormente.
2. Android1.3.0/code10 publicado y verificado: TLS público real/API24, acceso/MFA/guía/sesión/logout, recuperación503 y actualización original8→10 sin borrar datos PASS. Code9 retenido por dos defectos reproducidos;8 conservado como anterior. Android físico ARM, actualización desde1.0 e iOS no están probados. QR antiguos directos al objeto Supabase1.0 deben sustituirse por /app-movil/descargar.
3. Compatibilidad PostgreSQL alojado y nuevos asesores requieren acceso vigente del conector, actualmente denegado. No usar versión histórica como confirmación actual ni actualizar infraestructura sin recuperación/compatibilidad comprobadas.
4. La escuela debe confirmar información editorial, aviso, contacto, retención, fotografías y custodios. Operación permite responsables/evidencias/fechas y aprobación con MFA, sin convertir propuestas en aprobación oficial.
5. Suite E2E y medición cliente se amplían en entorno aislado, con lector de pantalla y p75 de campo aún pendientes. Los resultados automatizados no certifican WCAG/legal ni ausencia absoluta de bugs.

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

Distribución concluida: web d2d7d887 READY/CI success con alias institucional; redirect307/no-store a code8, descarga completa bytes/hash y página390px sin errores/desbordes PASS. OTA Android/preview/runtime1.2 grupo b95afc93-c578-41ad-bf01-9f46ba32a5fa/update01a117c2-8c62-75d8-b886-58013cf0ab7f recibida sobre instalador originalcode7 PASS: catálogo94pasos, avatar/alcance, todos14controles deInicio antes deClases, Anterior/logout y limpieza exacta. Sin diagnóstico/runtime1.0/iOS ni cambio de accesos reales. Los pendientes restantes de esta sección conservan su alcance.

## Siete frentes — actualización 2026-10-07

1. Recuperación integral: laboratorio Supabase gratuito con esquema completo, sin expedientes. Contraseña, MFA original, sesiones antiguas revocadas, relaciones, RLS y hash de archivos públicos y privados pasan. Lectura privada permitida al dueño y denegada a otro alumno con sesión nueva. Sigue pendiente el respaldo real de Auth del proveedor, su custodia y la validación de RPO/RTO. Ver full-recovery-lab.md.
2. Login móvil: CURP legacy, correo y contraseña exacta implementados; corregido desborde de pantalla. RN Web, siete roles, MFA y 220 explicaciones pasan. Nuevas cuentas conservan correo individual. Fuente funcional d9c1b9c; CI móvil f4c9601 completa success, incluido el backend desechable. Android administrado comprobó CURP hasta Inicio y la guía hasta siguiente/anterior; prueba integral del APK firmado en curso antes de distribución.
3. Android code9: candidato único 67894704-572d-486a-8380-b65d3a1fb76b terminado; paquete, firma original, runtime, tres ABI, hash y bundle de producción comprobados. QA autónoma pendiente; code8 sigue aprobado. Expo Go es prueba administrada, no instalación del APK. Android físico ARM, actualización desde1.0 e iOS requieren evidencia externa. Simulador remoto EAS no disponible en la cuenta.
4. Operación institucional: ocho propuestas por área para calendarios, formatos, contactos y políticas, con huellas de fuentes y contenido. Sólo admin/director con MFA aprueban; historial protegido. Cambios o vencimiento dejan pendiente la revisión sin bloquear la publicación. Las semillas no son aprobaciones oficiales. Base e interfaz390 pasan; migración aplicada.
5. Consentimiento separa mapa y analítica. web-vitals oficial agrega cohortes sin identificadores ni parámetros de URL en nueve rutas públicas; p75 aproximado por intervalo desde20 muestras, retención30 días y panel con MFA. SQL, permisos, cohortes, retención, LCP real y retirada pasan. Se revisaron/corrigieron 34 estados públicos; la configuración publicada reveló contraste2.96 del menú móvil, corregido y comprobado en producción10b931d a7.31 y9.41 sin JavaScript. Ocho estados interactivos finales, consentimiento y retirada PASS, sin escrituras de QA en producción. Faltan tráfico consentido suficiente, lector de pantalla e INP/CLS nativos; no inventar percentiles.
6. Suite integral del driver PASS contra Supabase local: recuperación integral, flujos académicos, financieros, APIs móviles, navegador, operación institucional, permisos y retención de métricas, 34 estados axe/teclado, consentimiento y quince estados del mapa. Cuentas/archivos/fila de configuración sintéticos propios limpiados; servidor y volúmenes propios detenidos. CI Docker/Xvfb también success en b26188f y10b931d; Security and build success y10b931d READY con aliases institucionales. Build final optimizado PASS en una salida local nueva para evitar cachés OneDrive. Pruebas Android posteriores usan otro laboratorio propio, que debe limpiarse al concluir.
7. Dirección, Control Escolar, TI y Finanzas propuestas como áreas responsables. Procedimientos, custodia, retención y continuidad editables y aprobables con MFA. Inventario alojado17.6.1.104 y laboratorio17.11 comprobados; sin actualización alojada ni contratación. La revisión diaria conserva avisos sólo de cambios importantes. Ver AGENTS.md e institutional-operation-guide.md.

## Compatibilidad del proveedor — 2026-10-14

[Retirada anunciada de cuatro suites TLS1.2 CBC](https://supabase.com/changelog/cbc-tls-ciphers-deprecated), no antes del 10 de noviembre. Conexión Node con GCM/TLS1.3 y certificado validado pasa; no hay fallo actual reproducido. Añadir a QA pendiente del APK una comprobación de negociación moderna en Android API24, sin cuentas de producción, antes de esa fecha. No sustituye pruebas nativas, no exige cambiar SDK y no acredita compatibilidad de todos los dispositivos.


## Revision material 2026-10-15

Prioridad alta: produccion 10b931d usa Next16.3.8 y App Router/Server Actions, dentro del rango afectado por GHSA-p3m5-59mp-jv5r (14oct). Aviso oficial: https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r . Siguiente paso fuera del heartbeat de lectura: actualizar Next16.4.1, revisar React/ReactDOM19.3.1, ejecutar tipos/build/suite aislada MFA/roles/flujos y verificar despliegue. Audit web0 no invalida el aviso nuevo; no se enviaron payloads de explotacion. Avisos criticos adicionales en https://github.com/vercel/next.js/releases/tag/v16.4.1 : no use-cache encontrado; lock sharp0.35.5 ya cumple mitigacion SVG. No afirmar RCE reproducida.

Asesores Supabase: dos lecturas rechazadas por permiso (-32600). Revisar/reautorizar conector y repetir metadatos/asesores; ultimo resultado14oct es historico. CI web/movil y navegacion publica siguen correctos, code8 publicado/code9 candidato. Sin codigo, instalaciones, fixtures, commit/push ni despliegue en esta revision. Intentos anteriores de anexar por apply_patch y PowerShell no persistieron; este proceso comprueba lectura inmediatamente despues de append.


## Entrega autorizada de los siete frentes — 2026-10-16

1. Parche: Next16.4.2, React/ReactDOM19.3.1 y SupabaseJS2.117.3 preparados; guard explícito contra versiones vulnerables, audit0, lint/tipos y build optimizado134páginas PASS. La alerta de producción se cierra sólo al confirmar despliegue del commit nuevo.
2. Asesores Supabase: acceso continúa denegado por el conector (-32600). Requiere reautorizar conexión; no se eludió el permiso ni se presenta el resultado histórico como vigente.
3. Móvil: code9 exacto firmado permanece candidato mientras termina QA nativa aislada con TLS moderno. Descarga8 y OTA anterior preservadas hasta PASS y publicación comprobada.
4. Recuperación: simulacro integral local17.11 repetido PASS (Auth original/TOTP, revocación, RLS, Storage público/privado y hash). Respaldo real autorizado de aplicación70tablas/7342filas/8archivos, cifrado y copia local offline íntegra/reciente PASS. No incluye Auth alojado, recuperación de infraestructura, custodia externa o RPO/RTO aprobados.
5. Contenido público: checklist de ciclo/contacto/guía/PDF vigente y selección del ciclo activo, sin afirmar que valores presentes equivalen a aprobación. No se publicaron fechas, requisitos ni contactos inventados.
6. Accesibilidad y velocidad: axe Operación390 y checklist390/1440 PASS; finalización oficial LCP/INP/CLS nativa de navegador con navegación normal y POST interceptados PASS. Regresión pública final en nueva versión en curso. Cohorte real/p75, lector de pantalla y contenido accesible de cada PDF siguen pendientes.
7. Operación: datos/evidencias faltantes y revisión próxima visibles; editar exige guardar antes de aprobar. MFA, roles, huellas, versión, historial y continuidad pública PASS local. Áreas propuestas siguen editables y no son aprobaciones institucionales.

La compilación final incluye reparación comprobada del sombreado HTMLFormElement.id por un campo hidden homónimo. No modifica permisos, calendario académico ni esquema alojado. Estado exacto de Git/CI/despliegue y pruebas restantes se registra en AGENTS.md al entregar.


Regresión final de la entrega16oct PASS: suites académica/financiera/API móvil, navegador original completo con MFA/PDF/subida/examen/contraseña y cleanup;34estados públicos axe/teclado, consentimiento con LCP/INP/CLS nativos y mapa15, con limpieza propia. Se prepara publicación web validada; code9 y cadena TLS mínima Android continúan separados hasta sus resultados.


## Cierre de métricas y comprobación de frescura — 2026-10-18

CI2379904 terminó Security and build SUCCESS, pero Isolated school flows falló al capturar únicamente LCP en el último probe. Antes pasaron recuperación, servicios académicos/financieros/móviles, navegador privado completo, operación, SQL/HTTP métricas y34estados públicos; cleanup del laboratorio PASS. El código del collector y probe era idéntico al108b759 que tuvo ambas suites SUCCESS. No se atribuye esta intermitencia a una regresión demostrada de los flujos escolares.

La revisión encontró además un defecto real: guardar preferencias con analítica true→true invalidaba los observers, pero enabled/pathname no cambiaban y React no rearmaba el efecto. Ahora sólo un guardado confirmado por lectura posterior incrementa metricsRevision. Se mantiene invalidación síncrona ANTES de escribir, aborto de envíos, bloqueo persistente tras retirada fallida, controles de ruta/consulta/consentimiento y deduplicación por documento; foco/timer sin cambio no reinician medición. No cambia sesión, permisos, formularios académicos ni aplicación móvil.

verify-public-metrics-client ejecuta los handlers JSX reales con hooks/cookies/biblioteca simulados: dependencias del efecto, true→true recupera INP/CLS sin duplicar LCP, retiro antes de persistencia, almacenamiento bloqueado, unmount/import tardío/generación reemplazada, ruta privada y parámetros PASS. Es unidad simulada explícita, no evidencia de Web Vitals reales.

verify-metrics-consent-browser captura ahora los POST mediante HTTP local antes del backend, independientemente del routing de Playwright al destruir el documento. MetricsProxy ligado a127.0.0.1/puerto aleatorio transmite GET/HEAD sólo a rutas públicas del origen fijo, sólo cookie de consentimiento, sin autorización/sesión/set-cookie y plazo20s. POST exacto /api/public/metricas válido≤4096bytes termina204 local; otros métodos/orígenes/redirecciones fallan cerrados. Modo reverse para origenHTTPS; forward mantiene origenHTTP loopback del laboratorio. Para Next dev, la única excepción CONNECT vuelve al parser del propio helper y sólo permite upgrade HMR exacto y acotado: no crea túnel TCP al upstream. HTTP ordinario/TLS/otros destinos rechazados, WS sin cookies/auth y con accept validado; cierre retira sockets/timers.

Prueba real completa de navegador contra fuente nueva en Next3004 PASS: v1/rechazo/caducidad/mapa exclusivo no envían, aceptación separada, guardado true→true conserva un único LCP y completa INP/CLS oficiales al navegar normalmente (hidden nativo), retirada/reload y almacenamiento bloqueado con foco/timer no envían. Cero POST de métricas llegaron al backend, terceros bloqueados, sin cuentas/fixtures/expedientes. Diagnósticos de focus emulation/minimización no lograron ocultar la pestaña en este host y no se usaron como PASS; el proxy sólo resuelve la captura del keepalive real, sin fabricar métricas, eventos ni visibilidad. La hidratación Next dev exigió su HMR local, cubierto por helper; ensayo final usa componentes reales.

npm run test:metrics (incluye contratos reales reverse/forward/HTTP/WS/CONNECT/límites/timeout20s/cleanup), lint global, typecheck --incremental false, cookies/SSR/guide-controls y diffcheck PASS. El último cambio es acotado a consentimiento, medición y pruebas; la distribución móvil ea16/funcional46cdb7c permanece sin cambios y ambas suites móviles SUCCESS. Commit/push y CI/despliegue de esta corrección se comprobarán por SHA antes del cierre final.

Comprobación remota18oct23:00:27.996UTC:8manifiestos completos, más reciente createdAt autenticado2026-10-18T05:45:29.742Z,17.25h dentro36h; AES-GCM/esquema PASS. Una lectura de listado y una descarga cifrada,0escrituras/restauraciones/cuentas; sin inspeccionar registros ni descargar archivos referenciados. No acredita integridad completa de esa copia ni origen de cron, custodia externa o recuperación alojada. El respaldo manual/simulacro del16-17oct conservan su alcance histórico.


## Recibo final de la corrección validada — 2026-10-18

Fuente funcional webf752114352aa7039fb5f4bbd3d67557c71e84d8d push confirmado: Security and build e Isolated school flows SUCCESS a23:10UTC (incluye suite integral local limpia, recuperación, servicios, navegador, operación,34estados públicos, métricas oficiales y mapa). Vercel dpl_FkTWahN1kLf7V6Qv3j7yDrTFLi25 READY/SHA exacto/alias epo221.edu.mx,www,epo221.vercel.app. Navegación publicada13rutas200/h1,2guardas307/login/no-store, CSP/DENY/HSTS y descargaGET/HEAD307/no-store→APK1.3.0/code10 PASS. Agregado error/fatal30m de ese despliegue sin grupos; no equivale a monitorización indefinida.

Smoke DIRECTO https://epo221.edu.mx a23:12:42UTC PASS: LCP oficial, guardar true→true sin duplicar LCP, rechazo y reload sin nuevos envíos. Cada POST se interceptó antes del servidor,0mutaciones; sin cuentas/fixtures. Recibo agregado ignorado .qa/published-metrics-direct-proof.json. El experimento reverseHTTPS→HTTP obtuvo0LCP aunque no tuvo rechazos ni errores de página, mientras URL directa y laboratorio/CI pasan; la causa de esa diferencia de entorno no quedó probada y NO se marca PASS ni regresión del producto. Por eso el probe de ciclo completo ahora exige HTTPloopback explícito ANTES de abrir Chrome, sin credenciales/path/query extra;4casos negativos PASS. Helper reverse conserva sólo sus contratos HTTP unitarios, no promesa de equivalencia de navegador con HTTPS real. El contexto/protocolo/CSP de publicación se comprueban directamente.

Este recibo sólo cambia documentación y el guard de destino del ensayo; la aplicación sigue funcionalmente idéntica a f752114. Móvil ea16e1a5c0672d04b254b0e8624df8c9504c134d ambas suites SUCCESS, APK original10/funcional46cdb7c intactos. Árboles Git limpios antes del recibo; Next propio46064→41944 detenido tras comprobar comando/parent/puerto3004, ya sin listener. Chrome/proxies de los ensayos cerrados en finally. LaboratorioDocker/Android/CAQA/reverses/firewall/llaves temporales ya retirados; custodia cifrada/APK original conservados. No nueva cuenta, fixture, mutación escolar o contratación en producción.

Se mantienen pendientes externos del cuadro de siete frentes: conector Supabase sin acceso a asesores actuales, Auth/infraestructura alojados/copia externa/RPO-RTO, contenido/políticas y responsables institucionales, lectores/PDF/p75 de campo y ARM físico/upgrade1.0/iOS. Los avisos móviles sin parche son de herramientas, trazados sin afirmar ausencia absoluta del APK; no se aplicó downgrade o audit fix forzado. El verificado respaldo remoto del18oct y el simulacro integral local tienen alcances separados. No se certifica ausencia absoluta de bugs o conformidad legal.


## Calidad pública y CI semanal — 2026-10-19

Auditor GET/HEAD acotado, cuatro PDF derivados con Title y paridad visual exacta, y simulacro aislado semanal implementados; alcance y pruebas en AGENTS.md. Publicación/CI/chequeo de variantes en navegador pendientes de recibo. Métricas sintéticas Lighthouse mediana90/LCP2473ms no sustituyen p75 de campo. Formato reinscripción vigente aprobado y lector de pantalla permanecen abiertos. Nuevas mejoras nativas y su migración se entregan por separado; reconectar Supabase escolar, porque el conector actual sólo muestra un proyecto ajeno.


## Siete mejoras y exámenes nativos — 2026-10-19

Avisos confirmados, chats visibles, borradores por cuenta, archivos nativos, accesibilidad/guía, auditoría/PDF públicos y CI semanal implementados. Fuente móvil1.4.0 en rama candidata; RNWeb aprendizaje+todosroles y APIs/SQL local PASS con limpieza. APKreal/API24/29/503/upgrade/TalkBack pendientes de recibo, descarga10 preservada. Exámenes web/nativos usan entrega90kUTF8 sólo cambios pendientes y lotes para respuestas largas; no amplían tiempoSQL. Nueva mutación móvil falla cerrada503 mientras readinessSQL no sea true; migración alojada y asesores requieren reconectar Supabase escolar. NotaAPI ocultada no equivale a revocar SELECTdirecto histórico de calificación propia; ese ajuste global sigue pendiente. Detalle, riesgos concretos y resultadosenAGENTS.


Navegador privado completo contra build optimizado final PASS y limpieza PASS (19oct); contratos/servicios/estáticos finales PASS. Backend nuevo se puede publicar con guard readiness503 hasta migración escolar autorizada. APK11 continúa en cola, sin publicación ni prueba Android atribuida. Detalle del recibo y límites en AGENTS.md.


## Activación y riesgo de cuota — 2026-10-19

Migración20261019185038 ya aplicada al Supabase escolar mediante sesión autenticada autorizada: cuatroguardas, service-only, historial1 y RESTready200true/anon401 verificados. Se cierra bloqueo de activación SQL, no la QA/distribución de APK final. Web b8e0ba8 publicado READY y auditoría23páginas/13recursos sinfallos; buildseguridad CI PASS, integral pendiente de recibo.

**Prioridad operativa: antes del27oct2026.** Organización compartida Free en gracia por StorageSizeExceeded: promedio2.395GB/1GB; filtroEPO sólo0.073GB. Restricción anunciada puede causar402 a todos los proyectos. Titular debe resolver consumo compartido o aprobar un plan con costo explícito; no se contrataron planes ni borraron datos. Captura/UI y metadatos sustentan el hallazgo; no atribuir el exceso a las mejoras escolares. Asesores actuales0errores/20warnings/3info requieren revisión contextual; no revocar indiscriminadamente helpersRLS.

Fuente funcional webb8e0ba8 cierra ambasCI con SUCCESS, incluido simulacro integral aislado+cleanup. Publicación institucional y activaciónSQL confirmadas. Continúa candidato Android final; descarga10 conservada hasta su QA.


## Resiliencia de sesión frente a cuota — 2026-10-19

Defecto reproducido en SDK SSR: refresh expirado402/429 podía borrar cookie; el proxy también cerraba sesión por error transitorio de RPC. Se implementa transporte limitado al Auth configurado,503 cerrado/reintento sin borrar sesión y retiro local sólo ante invalidez comprobada. Auth10s/proxy8s son presupuestos de aplicación; archivos/REST fuera proxy mantienen tiempos existentes. Contratos de fuente real y SSR SDK sintético PASS; sin cuentas/red/esquema. Publicación y CI del commit nuevo requieren recibo independiente; Next local vivo sigue en build anterior. Esto reduce pérdidas de sesión, pero NO resuelve la cuota compartida/gracia27oct ni autoriza acceso durante caída; continúa decisión del titular descrita arriba. APK final y recuperación alojada conservan sus pendientes separados.

Revisión previa a publicar: errores de permisos PostgREST403/42501 se separan de Auth403; los primeros devuelven503 sin cerrar sesión. Se requiere recibo del build fresco posterior a esta corrección, no el intermedio de calentamiento.


**Cierre local durante indisponibilidadAuth (19oct):** /api/logout POST same-Origin + Fetch-Metadata,303/login/no-store y retiro exacto de cookies/chunks del proyecto antes de revocación global best-effort (JWT existente,2s/abort,redirect:error,sin refresh/getUser). Cuatroformularios y actionlegacy reutilizados; proxy sólo permite esta ruta POST y503ofrece salida local explícita. Contratos reales sintéticos/146guardas/test:security/lint/tipos PASS, sin red/fixtures. Revocación remota no garantizada siAuth/token fallan; navegador fresco y despliegue porSHA requieren recibo posterior.


Recibo final Auth/logout19oct: build optimizado nuevo157s/0warnings y436archivos con huella d0940a857412ce1729c4c007c5be7760961131e75947dc04cd671745257fc23d idéntica antes/después. Flujos originales completosPASS; añadido503simulado falló inicialmente por interferencia delSW (comando65507exit1, cleanupPASS), causa comprobada anónimamente. ContextoQAseparado sinSW preserva originales: focal62455PASS/cleanup, unGET503HTML simulado desde proxy real yPOSTlogoutREAL303→loginGET200, Authchunksfuera/consentigual.0cuentas/exámenes/ciclos sintéticos residuales. Producto no cambió para corregir instrumento. Detalles y límites enAGENTS; publicación/CI del commit nuevo pendiente de recibo root, cuota27oct yAPK final no se resuelven con estas pruebas.


## Recibo remoto de resiliencia y activación — 2026-10-19

Web eca3d08ce30f917996c0ee52e3dd297ea4b31dc7: ambasCI SUCCESS, Vercel READY/aliasinstitucional exacto,23páginas/13recursos sinfallos y guardas/logout anónimos PASS. Se cierra el pendiente de publicación del arreglo Auth402/429/logout; la cuota compartida antesdel27oct sigue siendo decisión del titular. Readiness SQL escolar200true/anon401 reconfirmado mediante SDK oficial. APK13 compilado con fuente51a436e y firmaoriginal, QAAndroid en curso; descarga10 conservada. No trasladar resultados RNWeb o pruebas nativas parciales a aprobación de la distribución.


## Fechas civiles y compatibilidad de hora móvil — 2026-10-19

Corregidas11presentaciones web en8páginas: SQLDATE ya no se transforma en instante medianoche y se evita mostrar el día anterior. Helper estrictoUTC conserva los formatos de ciclos, historial, álbumes y bitácora; pago usa literal como su página existente. Seguridad146, pruebas con4zonas horarias, tipos y lint PASS; sin cambios de datos/consultas/timestamptz. Detalle enAGENTS. Publicación del nuevo commit requiere recibo porSHA.

En APK13 se confirmó hora+1h por TZDBantigua con SQL/UI sincronizados y fecha civil2008-03-15→14mar por ejecución de fuente. Se retiene13sinpublicar. Fuente móvil3704a8b26f6fa5bb50333d26dcca511dbab5da79 aplica sóloformato: UTC−6 después de última transición2022, reglas históricas anteriores y día civil intacto. Unidades/SDK/guías/tipos PASS; nueva compilación14 solicitada una única vez con Free9/15Android y estimado0. Export/RNWeb fresco y pruebas reales del artefacto14 siguen pendientes; descarga10 permanece aprobada.


## Recibo publicado de fechas civiles y candidato móvil15 — 2026-10-19

Web e5efc13b7a56b83535a660dfe218b1f37eadebcb en main/origin: Security and build39331964506 e Isolated school flows39331964595 SUCCESS. Build local optimizado131s/sinwarnings y navegador integral original EXIT0/cleanupPASS sobre437archivos funcionales/huella11394d57381aa857503ab82b0f7f929aee275c217f96ac6467d11fd8740a3f4c idéntica antes/después. Vercel dpl_FsJWaKGPLSnKrsYCEqEnvhSPBceB READY y dominios institucionales vinculados al SHA exacto; auditoría23páginas/13recursos sinfallos, guardasprivadas307/no-store, APIs401 y GETlogout405 PASS. Recibo ignorado .qa/e5efc13-publication-proof.json. Se cierra publicación del arreglo civil; no se deduce ausencia absoluta de errores de este smoke anónimo.

APK14/fuente3704a8b queda supersedido por defecto real del objetivo táctil Ayuda de los chats: centro dentro StatusBar, sólo funcionaba punto inferior. Fuente móvil69c93029e816165fbb578d722e85af2c8efaf45e mueve exclusivamente ayuda debajo del encabezado en ambos chats, con prueba JSX negativa previa/positiva y suite/tipos/lint PASS. EAS15 ed1a2b3c-d84c-49e8-b76c-3dca0c137c4d solicitado una vez, versión/runtime1.4.0, código15; Free10/15Android antes de solicitud y estimado0. Descarga pública conserva code10 hasta pruebas nuevas del APK15 exacto y cleanup. Pruebas históricas parciales13/14 nunca acreditan15 ni autorizan su distribución.
