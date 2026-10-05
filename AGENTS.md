# Instrucciones para agentes — EPO 221

## Reglas de continuidad

- Documentar aquí cada cambio de código solicitado por el usuario: alcance, motivo, comprobaciones y limitaciones. Claude importa este archivo mediante `CLAUDE.md`.
- Next.js **14.2.15**, React 18, TypeScript, Supabase SSR **0.5.x**. No trasladar APIs de Next 15/16 o Supabase SSR recientes sin comprobar compatibilidad con las versiones instaladas.
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
