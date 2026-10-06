# Instrucciones para agentes — EPO 221

## Reglas de continuidad

- Documentar aquí cada cambio de código solicitado por el usuario: alcance, motivo, comprobaciones y limitaciones. Claude importa este archivo mediante `CLAUDE.md`.
- Stack actual: Next.js **16.3.8**, React **19.3.0**, Tailwind **4.3.3**, TypeScript y Supabase SSR **0.12.7**. APIs de `cookies`, `headers`, `params` y `searchParams` son asíncronas. El middleware actual es `src/proxy.ts`.
- Nunca imprimir ni guardar credenciales, cookies de sesión, archivos `.env.local` o datos personales de alumnos en documentación o artefactos.
- Mantener los créditos institucionales y de desarrollo existentes.

## 2026-10-05 — Cookies, sesiones y seguridad

### Implementación

- `src/components/CookieConsentProvider.tsx`: preferencias globales desde el layout raíz, en páginas públicas y privadas; aceptar/rechazar opcionales con la misma presentación; configuración granular, retirada y acceso permanente. Cookie propia `epo221-cookie-consent`, versión 1, caducidad de 180 días, `Path=/`, `SameSite=Lax`, `Secure` cuando el navegador usa HTTPS. No guarda datos personales. Si el navegador impide guardarla, se muestra aviso y los opcionales permanecen bloqueados. Se relee al recuperar foco y cada minuto para caducidad y cambios en otras pestañas.
- `src/lib/cookie-consent.ts`: validación estricta de decisión, versión y fecha; consentimientos vencidos, corruptos o futuros no habilitan terceros. Solo autoriza embeds de Google Maps HTTPS en hosts y rutas permitidos.
- Se comprobó con una consulta de lectura a `sitio_config` el formato del mapa existente (`/maps?...&output=embed`) y se admite junto a `/maps/embed`, manteniendo los hosts permitidos. No se alteró la base de datos.
- `src/components/ConsentMap.tsx` y `src/app/publico/contacto/page.tsx`: el iframe no existe antes del consentimiento; rechazar retira el iframe. No intenta borrar cookies del dominio de Google, que corresponde eliminar desde el navegador.
- `src/app/cookies/page.tsx`: inventario de sesión Supabase, decisión propia, mapa opcional, almacenamiento de preferencias, PWA y otros recursos externos. No sustituye el aviso institucional de privacidad ni acredita cumplimiento jurídico.
- `src/lib/supabase/cookie-options.ts`, `client.ts`, `server.ts`, `src/middleware.ts`: atributos compartidos `Path=/`, `SameSite=Lax` y `Secure` en producción. **HttpOnly sigue false porque Supabase SSR y los clientes actuales requieren acceso a los tokens desde JavaScript**; no activarlo sin migrar autenticación, acceso a datos y Realtime a servidor. Se conserva la duración predeterminada de Supabase (hasta 400 días de almacenamiento, distinta de la validez de sesión).
- Middleware: cookies renovadas pasan a la petición para Server Components y a la respuesta, incluso en redirecciones; `Cache-Control: private, no-store` para sesiones, login, logout, rutas protegidas y respuestas que escriben cookies. Se mantiene `getUser()` y la autorización existente.
- `next.config.mjs`: `nosniff`, protección de framing DENY, referrer policy y CSP parcial (`frame-ancestors`, `object-src`, `base-uri`). Esta CSP no es una política completa de scripts contra XSS; cualquier ampliación necesita comprobar fuentes, scripts Next, Supabase y recursos externos.
- `public/sw.js`: caché v3 elimina versiones previas; no precachea `/` ni `/login`, que podían contener sesiones. Offline usa HTML neutro sin datos escolares. Los recursos estáticos no se guardan si la respuesta es privada, no-store, errónea o redirigida. `public/offline.html` es la pantalla neutra nueva.
- `CLAUDE.md`: importa este archivo. En la raíz del workspace también se añadieron instrucciones de continuidad.

### Producción y pendientes

- HTTPS/TLS corresponde al dominio, no a cada página ni a cada cookie. No se emitió, instaló ni modificó ningún certificado o configuración DNS durante este cambio. El 2026-10-05 se verificó con `SslStream` y validación normal del sistema: `epo221.edu.mx`, TLS 1.3, certificado Let’s Encrypt YR2 válido del 2026-09-01 13:36 UTC al 2026-11-30 13:36 UTC. HTTP redirige 308 a HTTPS; `/login` por HTTPS devuelve 200. La renovación automática debe confirmarse en el proveedor; esta prueba no la certifica.
- No activar HSTS sin verificar primero HTTPS y la configuración de todos los dominios/subdominios implicados.
- La sesión es necesaria; rechazar opcionales nunca debe eliminar cookies Supabase ni cerrar sesión.
- Nuevos mapas, embeds, píxeles o analítica deben integrarse en el consentimiento antes de efectuar solicitudes. No añadir banners meramente decorativos que permitan cargar terceros antes de aceptar.
- Google Fonts y la imagen QR externa existente siguen descritos en la política; no se agregó analítica ni publicidad. Revisar por separado el aviso institucional y los requisitos jurídicos aplicables a esta escuela mexicana. La guía AEPD se consultó como referencia técnica, sin afirmar que su régimen aplica automáticamente.
- Retirar consentimiento detiene nuevas cargas, pero no revierte datos ya transmitidos a Google.
- La aplicación React Native y `epo221_completo.html` no se modificaron: el sitio activo identificado es `sistema/`.

### Fuentes consultadas

- https://supabase.com/docs/guides/auth/server-side/advanced-guide (cookies SSR, SameSite, HttpOnly y caché; comprobar diferencias con SSR 0.5.x).
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies
- https://www.aepd.es/guias/guia-cookies.pdf (referencia de controles de elección y bloqueo previo).

### Comprobaciones

- Las primeras ejecuciones incrementales de `npm run typecheck` devolvieron éxito. Después de iniciar Next y regenerar tipos, la comprobación completa `tsc --noEmit --incremental false` detectó errores. Una comparación con los archivos originales de HEAD confirmó errores previos en formularios de anuncios/calificaciones/profesores, directivas `@ts-expect-error`, PDFs y `admin/usuarios/actions.ts` (referencia `auth` inexistente). También se tiparon explícitamente las listas `setAll` en servidor/middleware para evitar errores de inferencia. La comprobación final no reporta errores en los archivos de este cambio; el proyecto completo sigue sin pasar TypeScript por los módulos previos. No asumir una validación global satisfactoria.
- `node scripts/verify-cookie-security.cjs`: pasó. Verifica valores corruptos/vencidos/futuros y versiones de consentimiento, URLs HTTPS permitidas y maliciosas, flags en desarrollo/producción, renovación de cookies en petición/respuesta, conservación en las redirecciones a login/cambio de contraseña/panel, no-store y reglas de caché PWA incluyendo offline sin HTML privado. Utiliza tokens sintéticos y mocks, sin cuentas reales.
- Playwright CLI: política visible y banner inicial; rechazo persistente tras recarga; mapa bloqueado al rechazar; configuración accesible con foco en encabezado; aceptar crea el iframe de la ubicación existente; retirar consentimiento elimina el iframe y recupera el bloqueo (conteo DOM final: 0 iframes). No se inició sesión con cuentas reales ni se modificaron datos escolares. Aviso previo de Framer Motion y favicon 404 en desarrollo, ajenos al cambio. Artefactos generados por CLI en `.playwright-cli/`, excluidos de Git mediante `.gitignore`; el intento de moverlos a `output/playwright/` falló por acceso al directorio en OneDrive y se preservaron los originales.
- Petición HTTP local a `/admin` sin sesión: redirección 307 a login, `Cache-Control: private, no-store`, DENY y CSP esperados.
- `git diff --check`: pasó. Se aplicó la revisión de componentes de la skill React (límites cliente/servidor, almacenamiento versionado, bloqueo previo de terceros y limpieza de listeners/timer).
- Al terminar la implementación inicial, los cambios eran locales y no se habían desplegado. El estado de publicación se registra a continuación.

### Entrega Git — 2026-10-05

- El usuario autorizó explícitamente crear el commit y hacer push de esta implementación.
- Destino: `origin/main`, repositorio `https://github.com/Fredyxon2001/epo221`. Antes de la entrega, HEAD y origin/main coincidían en `28409ac`.
- La entrega incluye los cambios de cookies/seguridad, la prueba aislada y los archivos `AGENTS.md` y `CLAUDE.md` de este repositorio. Las instrucciones de la raíz del workspace quedan fuera porque pertenecen a otro repositorio.
- Se repitieron `node scripts/verify-cookie-security.cjs` y `git diff --check`: ambas verificaciones pasaron. Continúan documentados los errores globales previos de TypeScript.
- Commit previsto: `feat(security): proteger cookies y agregar preferencias de consentimiento`. Consultar `git log` y `origin/main` para obtener el hash definitivo.
- El push puede activar la integración de despliegue del proveedor; su finalización no se confirma únicamente por el éxito de Git.

## 2026-10-05 — Revisión preliminar posterior a la publicación

- A petición del usuario, se revisaron pendientes de seguridad y cumplimiento sin modificar la lógica de la aplicación. Diagnóstico en `security_best_practices_report.md`.
- Se identificaron acciones de convocatorias y conceptos que usan `adminClient()` sin comprobar identidad/rol dentro de la acción; importaciones con contraseña temporal compartida y cambio no obligatorio; Next 14.2.15 pendiente de parches; login con destino sin restringir; errores de tipos/build y vistas SQL que requieren verificar grants/seguridad real.
- Priorizar autorización por operación y claves individuales. No reproducir contraseñas ni probar operaciones de escritura contra datos reales durante la revisión.
- Se consultaron fuentes oficiales Next/Vercel, Supabase y la ley general mexicana vigente. Vercel no estaba afectado por el bypass específico CVE-2025-29927; no inferir exposición de esta instalación por ese CVE solo por su versión.
- Verificación pública: `/cookies` en `https://epo221.edu.mx` responde 200 y muestra política/preferencias con DENY y CSP esperada. Esos elementos sí están disponibles en producción; la petición no demuestra el hash de despliegue ni valida todas las rutas.
- No se comprobaron políticas efectivas de Supabase, MFA, rate limits, respaldos o documentos institucionales externos. Distinguir ausencia en el código revisado de ausencia efectiva en infraestructura/institución.
- El reporte y esta actualización son documentación local de revisión; no incluyen correcciones nuevas ni un nuevo commit/push.

## 2026-10-05 — Implementación de todos los pendientes técnicos de la revisión

Esta sección sustituye los pendientes técnicos y las versiones de las notas históricas anteriores. El usuario autorizó implementar todas las recomendaciones y mantuvo la autorización de commit/push.

### Código y compatibilidad

- Actualización mantenida de Next/React/Supabase SSR, migración de APIs asíncronas y codemods oficiales de Next y Tailwind. Fuentes empaquetadas localmente; QR de descarga/MFA generado en servidor o navegador sin un proveedor de imágenes externo. Se conservaron créditos institucionales/de desarrollo.
- Se retiraron las opciones que ignoraban fallos de tipos y build. Se resolvieron los errores previos de formularios, PDFs, directivas obsoletas y la referencia `auth` inexistente. ESLint flat y workflow GitHub ejecutan verificaciones y auditoría de dependencias.
- `src/lib/security/access.ts`, `policy.ts`, `api-access.ts` y `resources.ts`: guardas por identidad activa, rol, contraseña inicial, MFA y pertenencia al registro/grupo. 142 acciones exportadas autorizan antes de operar; 115 páginas privadas de servidor también verifican antes de consultar datos. El layout o proxy no sustituyen la autorización dentro de una acción/página.
- Las lecturas de alumnos/docentes usan JWT y RLS; el cliente `service_role` contiene `server-only` y se reserva para operaciones comprobadas. No permitir que un identificador en URL/FormData seleccione otro expediente. Se eliminó la vinculación automática por coincidencia de nombres/correo.
- Alumnos, profesores, orientadores, finanzas y administración tienen alcances distintos. Un orientador puede consultar sus grupos; una modificación de clase exige ser su docente asignado. Validación de listas de alumnos, puntuaciones y pertenencia de pregunta/intento antes de escribir.
- Login con destinos locales permitidos, límites por IP/cuenta y recuperación por correo sin enumeración. CURP/RFC/matrícula no autorizan un restablecimiento público. Claves nuevas aleatorias de 18 caracteres y cambio obligatorio; reimportaciones conservan cuentas existentes.
- Credenciales iniciales cifradas AES-GCM, expiración 24 h, descarga única y limpieza. Se comprobó internamente que ninguna clave de la entrega antigua en claro coincidía con un hash actual; se elimina esa entrega sin reset masivo ni documentación de claves/datos personales.
- MFA TOTP obligatorio para admin/staff/director/finanzas. Factores ya registrados se verifican también para docentes/alumnos. Recuperación MFA solo por otro administrador con AAL2 y folio institucional; no sustituye la comprobación de identidad. `security_session_alive` verifica sesión Auth existente y época de restablecimiento. Reset de contraseña/MFA revoca sesiones; perfil inactivo impide acceso.
- Route Handlers privados y calendario ICS verifican sesión/rol/MFA; mutaciones verifican origen. Cron y webhook comparan secretos en tiempo constante y fallan si falta configuración. Límites distribuidos por RPC transaccional con cierre ante error.
- Validación de tamaño, extensión y firma de archivos PDF/imágenes/Office; límites y MIME de buckets. Estas comprobaciones no son un antivirus. Exámenes comprueban alumno, intento, plazo y preguntas; las claves correctas y columnas de calificación no son legibles/escribibles directamente por alumnos.
- `proxy.ts`: CSP con nonce por petición para scripts, fuentes propias y conexión acotada a Supabase; cookies renovadas preservadas, no-store privado y HSTS de un año solo para el host, sin includeSubDomains/preload. `HttpOnly` continúa false por la arquitectura SSR/browser; no cambiar aisladamente.

### Base de datos y operación

- Migraciones versionadas en `supabase/migrations/`: límites y eventos; revocación de RPC inseguras y grants de vistas; search_path fijo; RLS de alcance/sesión; bloqueo de escritura directa en columnas de examen/propuestas/entregas; directorio de docentes sin RFC/contactos privados; extensiones fuera de public; auditoría sin campos de secretos; retiro de credenciales antiguas.
- Helpers SECURITY DEFINER que devuelven exclusivamente pertenencia/estado propio requieren revisar sus grants y políticas dependientes antes de revocar EXECUTE. La alerta informativa de RLS sin políticas para `security_rate_limits` es intencional: solo servicio accede.
- Respaldos AES-256-GCM de tablas públicas de aplicación y bytes Storage en bucket privado. Cron diario autenticado 05:00 UTC, manifiestos siete días, eventos de seguridad 90 días y entregas 24 h. La retención escolar permanece sujeta al catálogo institucional; no se borraron expedientes.
- Primera verificación: 63 tablas, 4,845 registros y 8 archivos; descifrado/carga en tablas temporales con tipos/restricciones y comprobación de bytes. Copia cifrada local `security-backups/` excluida de Git. No demuestra una restauración nativa completa, claves foráneas, usuarios Auth ni sincronización OneDrive finalizada. Detalles/custodia/simulacro en `docs/security-operations.md`.
- Vercel configuró `CRON_SECRET`, `CREDENTIALS_ENCRYPTION_KEY` y `BACKUP_ENCRYPTION_KEY` como variables sensibles en producción/previews. No registrar valores. No rotar claves de cifrado sin migración de material pendiente. La configuración local de servicio queda en `.env.local`, excluido de Git.

### Privacidad y límites institucionales

- `/privacidad`, enlaces permanentes del sitio/banner y `docs/privacy-institutional-draft.md`: información del tratamiento, inventario y borrador para responsables institucionales. `PRIVACY_NOTICE_URL` admite un aviso aprobado HTTPS. No se inventó contacto de la Unidad de Transparencia, fundamento, plazos ARCO ni autorización de fotografías de menores.
- Pendientes institucionales/proveedor: aviso aprobado y contacto ARCO, documento de seguridad/riesgos con responsables, autorización de fotografías, contratos/ubicaciones/retención, medios de recuperación verificados, protección de contraseñas filtradas y mínimo nativo Auth, alertas, separación de Supabase de pruebas, custodia de claves, respaldo nativo y simulacro integral, renovación TLS confirmada y protección de rama. No se contrató ni alteró un plan de pago.
- La aplicación móvil React Native y el HTML histórico fuera de este repo no se migraron. Probar compatibilidad de cualquier cliente externo con el nuevo MFA/RLS antes de volver a publicarlo.

### Validaciones y entrega

- `npm run test:security`: 142 guardas por acción, roles/MFA/API/origen/rate limit, claves distintas, manipulación de cifrado, firmas de archivos, redirecciones/CSP y pruebas previas de cookies/PWA. Datos/tokens sintéticos.
- Navegador local con build de producción: login/contacto cargan, 15 scripts con nonce, cero scripts externos y cero iframes antes de consentimiento; solo favicon 404 preexistente. Repetir el recorrido tras publicación y distinguir estos checks de pruebas autenticadas de cada módulo.
- Las seis migraciones de este cambio se aplicaron y sus nombres/versiones locales coinciden con el registro remoto. Fixtures Auth temporales comprobaron lectura propia/ajena, escalamiento denegado, columnas protegidas, AAL1/AAL2, cambio inicial y revocación inmediata; limpieza confirmada sin cuentas/perfiles sintéticos restantes.
- Primera publicación READY promovida a `epo221.edu.mx`: login/privacidad/cookies 200, admin 307 y APIs/cron sin sesión/secreto 401. Navegador de producción: nonce en scripts, cero scripts externos, aviso de clave individual y rechazo de mapa persistente al recargar. No se detectaron secretos privados en los bundles de navegador.
- `.vercelignore` excluye variables locales, respaldos, logs y artefactos de pruebas del despliegue. Se retiró una definición duplicada de CRON_SECRET en Vercel; la publicación definitiva debe comprobar además la ejecución autorizada del respaldo.
- Lint, TypeScript, auditoría y build deben pasar antes de commit. La auditoría de dependencias actual devolvió cero vulnerabilidades. Consultar Git para el hash definitivo y Vercel para READY/alias del despliegue; un push no acredita despliegue.
- Skills aplicadas: security-best-practices, Supabase, Next upgrade/Next.js, React best practices, variables/API y despliegues Vercel, Playwright. `security_best_practices_report.md` registra el estado final y las limitaciones.
