# Revisión y correcciones de seguridad — EPO 221

Fecha: 2026-10-05. Alcance: repositorio sistema, Supabase de EPO 221 y Vercel. No acredita cumplimiento jurídico integral ni cubre React Native.

## Hallazgos corregidos

| Hallazgo | Estado |
| --- | --- |
| SEC-01: autorización insuficiente | 142 acciones autorizan antes de operar; 115 páginas privadas verifican identidad antes de consultar. Rutas API y recursos comprueban rol, contraseña, MFA y pertenencia al registro/grupo. |
| SEC-02: claves iniciales y entregas | Claves individuales de 18 caracteres y cambio obligatorio; reimportaciones preservan cuentas. Entregas AES-GCM, descarga única y caducidad 24 h. Cero claves antiguas coincidían con hashes actuales; se retiró el legado en claro sin reset masivo. |
| SEC-03: dependencias | Next 16.3.8, React 19.3.0, SSR 0.12.7 y Tailwind 4.3.3. Auditoría final de producción/desarrollo: cero vulnerabilidades conocidas. |
| SEC-04: redirecciones | Destinos locales permitidos; pruebas de URLs externas, dobles barras, backslash, normalización y controles. |
| SEC-05: build y tipos | Opciones de omisión retiradas, errores previos resueltos, checks satisfactorios y workflow CI sin secretos. La protección de rama requiere configuración independiente. |
| SEC-06: datos y Storage | Migraciones aplicadas: grants de RPC/vistas, search_path, RLS de alcance/sesión/MFA, directorio docente sin RFC/contactos y protección de columnas de examen. Gate de sesión en Storage. |
| SEC-07: operación | TOTP privilegiado, sesiones revocables, límites distribuidos, origen en mutaciones, cron/webhook con secretos, auditoría redactada, CSP con nonce, fuentes/QR propios, HSTS y respaldo cifrado diario. |

## Evidencia

- Lint, TypeScript, build y pruebas aisladas de seguridad/cookies/PWA pasaron.
- Fixtures Auth de alumno, profesor, finanzas y admin comprobaron lectura propia y rechazo de expedientes ajenos, escalamiento de rol, claves de respuesta, AAL1 privilegiado, TOTP AAL2, cambio inicial y revocación inmediata. Limpieza confirmada: cero perfiles/cuentas sintéticas restantes.
- Respaldo inicial: 63 tablas, 4,845 registros y ocho archivos; segundo después de migraciones: 63 tablas, 4,853 registros y ocho archivos. Cifrado, validación en tablas temporales y archivos descifrados comprobados. Copia cifrada local; no demuestra recuperación nativa completa ni sincronización OneDrive finalizada.
- Primera versión READY y promovida al dominio: login/privacidad/cookies 200; admin sin sesión 307; API privada y cron sin autorización 401. CSP con nonce, HSTS y no-store. Navegador: login con clave individual, cero scripts externos, contacto sin iframe antes del consentimiento. Favicon 404 preexistente.
- Consultar Git/Vercel para el commit y despliegue definitivos; push no acredita despliegue.
- Entrega funcional verificada: f503ec3, Vercel dpl_49ZFyE4aim4vnVa2ULg6Eqg81W7N READY con el commit en metadata y aliases del dominio. Cron autorizado respondió 200/ok y verificó 63 tablas/4,853 registros/8 archivos. Push pendiente de autenticación GitHub; origin/main todavía conservaba el commit anterior al comprobarlo.

## Pendientes y avisos reales

La revisión posterior de flujos encontró y reparó efectos en consultas de docentes/constancias, Finanzas, mutaciones de tareas/exámenes y archivos grandes. Se añadieron RPC transaccionales para exámenes/pagos, permisos de Storage por recurso, carga privada con ticket HMAC y controles de temporizador/borradores/calificación. Pruebas de acciones reales, Supabase y navegador con cuentas desechables documentadas en `docs/flow-verification.md`; no se modificaron expedientes reales. La autenticación Git se resolvió y `origin/main` se comprobó en `1507e7d`, por lo que la nota anterior de push pendiente es histórica. Verificar el nuevo hash y despliegue para la entrega de estas reparaciones.

- RLS sin políticas en security_rate_limits es cierre intencional: acceso solo del servicio. [Referencia](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Helpers SECURITY DEFINER de pertenencia/estado propio permanecen invocables por quienes los usan en políticas. Se retiró acceso anónimo a helpers privados. es_admin conserva acceso para políticas de contenido público y devuelve exclusivamente el booleano del llamador. No habilita escritura privilegiada. [Referencia](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Protección nativa de contraseñas filtradas sigue desactivada y requiere Pro según [Supabase](https://supabase.com/docs/guides/auth/password-security). El proyecto consultado es Free; no se contrató un plan. Confirmar mínimo nativo de contraseña, correo de recuperación, SSL DB y MFA de propietarios del dashboard. La validación 12–128 de la aplicación no configura Auth.
- Institución: aprobar avisos, contacto ARCO/Unidad de Transparencia, fundamentos, documento de seguridad/riesgos, responsables, retención, incidentes, fotografías de menores y contratos/proveedores. /privacidad indica expresamente el aviso pendiente; PRIVACY_NOTICE_URL enlaza el aprobado. No se inventaron autoridades ni autorizaciones.
- Operación: custodiar claves fuera del respaldo, confirmar sincronización de copia independiente, separar Supabase de pruebas, configurar alertas, respaldo nativo y simulacro integral de Auth/esquema/infraestructura, renovación TLS y protección de rama. No se obtuvieron credenciales PostgreSQL ni se activaron servicios de pago.
- Revisar clientes móviles antes de conectarlos al nuevo MFA/RLS.

Procedimientos y límites: docs/security-operations.md. Inventario y borrador institucional: docs/privacy-institutional-draft.md. Las tablas temporales no verifican todas las FK ni continuidad operacional. Los controles de archivos no son un antivirus.

La política de cookies y los controles técnicos no reemplazan revisión jurídica institucional conforme a la [ley general vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf) y disposiciones aplicables a la escuela.
