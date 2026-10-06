# Operación de seguridad — EPO 221

Estado técnico preparado el 2026-10-05. La publicación efectiva debe comprobarse en Git y Vercel. Este documento no acredita cumplimiento jurídico.

## Accesos y recuperación

- Administración, dirección, staff y finanzas requieren contraseña configurada y TOTP con nivel AAL2. Alumnos y docentes con un autenticador registrado también deben verificarlo.
- Crear cuentas con claves individuales; entregar solo después de verificar identidad. La importación cifra la entrega, permite una descarga y caduca a las 24 horas. No reimportar para restablecer contraseñas existentes.
- Recuperación pública: enlace al buzón registrado y respuesta genérica. Una CURP, RFC o matrícula no acredita identidad. Cuando el buzón sea sintético o inaccesible, Control Escolar debe verificar identidad por su procedimiento aprobado antes del restablecimiento administrativo.
- Un administrador con MFA puede recuperar los factores de otro usuario mediante un folio institucional. Se registra el trámite y se revocan sesiones. La herramienta no realiza ni sustituye la comprobación de identidad.
- Si se pierde el último administrador, el propietario institucional del proyecto debe usar la recuperación del proveedor, verificar identidad y registrar el incidente. No habilitar un endpoint público de emergencia.
- Altas/bajas y cambio de rol requieren acceso autorizado. La sesión consulta el perfil vigente, su indicador de cambio de contraseña y la existencia de la sesión en Auth; las bajas y sesiones revocadas no deben conservar acceso con un JWT aún vigente.
- Antes de pasar cuentas a personas nuevas: restablecer contraseña, revocar sesiones y comprobar que el usuario dispone de un medio de recuperación verificado. Revisar usuarios privilegiados y grupos asignados al inicio de cada ciclo.

## Secretos y ambientes

`CRON_SECRET`, `CREDENTIALS_ENCRYPTION_KEY`, `BACKUP_ENCRYPTION_KEY` y la credencial de servidor Supabase son privadas. Vercel guarda las tres primeras como sensibles. El módulo privilegiado contiene `server-only`. Nunca incluir sus valores en Git, capturas, logs o reportes.

La copia local usa `.env.local`, excluido de Git. Custodiar la clave de respaldos en un gestor institucional separado del respaldo y limitar acceso al equipo y OneDrive. No cambiar la clave mientras haya respaldos o entregas cifradas pendientes sin migrarlos y conservar la clave anterior de forma segura.

Los previews deben usar un proyecto Supabase de pruebas con datos sintéticos. No se creó otro proyecto ni se habilitó un plan de pago. La configuración existente todavía requiere separación institucional de ambientes; no hacer pruebas de escritura sobre expedientes reales.

## Respaldos y recuperación

- Cron autenticado diario `/api/cron/seguridad` a las 05:00 UTC: limpieza de límites vencidos, eventos de seguridad de más de 90 días, entregas cifradas caducadas, respaldo y prueba de recuperación.
- Respalda tablas públicas de aplicación y bytes de Storage, cifrados con AES-256-GCM. Excluye límites/eventos de seguridad, credenciales de importación y configuración/subscripciones push. El bucket `security-backups` es privado.
- La prueba descifra y carga registros en tablas temporales con tipos y restricciones, comprueba cantidades y descifra cada archivo. No escribe sobre expedientes existentes. No comprueba todas las claves foráneas, una restauración de todo el servicio ni continuidad operacional.
- Conserva manifiestos diarios siete días. Los archivos se guardan por hash; vigilar crecimiento de archivos históricos y cuota antes de eliminar contenido referenciado por un manifiesto retenido. Nunca borrar documentos escolares para liberar cuota sin autorización.
- `node scripts/backup-security.cjs` repite la verificación y conserva solamente bytes cifrados en `security-backups/`, excluido de Git. La copia local está dentro del directorio OneDrive; confirmar sincronización y controles de acceso. Esta ejecución no comprueba que OneDrive terminó de sincronizar.
- Prueba inicial: 63 tablas, 4,845 registros y ocho archivos. Es un respaldo de aplicación; no incluye usuarios de Auth, sesiones, definición completa del esquema, configuración de infraestructura ni una copia nativa Postgres. Preparar también `supabase db dump` y respaldo del proveedor con credenciales de base de datos autorizadas, en un destino independiente, y hacer un simulacro integral en un proyecto de pruebas. El plan Free consultado no aporta respaldos diarios administrados.
- Recuperación: abrir un proyecto de pruebas, aplicar el esquema versionado, descifrar en memoria con la clave custodiada, restaurar filas en orden de dependencias y archivos en sus buckets; verificar relaciones y flujos con cuentas sintéticas. Solicitar decisión institucional de RPO/RTO antes de una sustitución de producción.

## Monitoreo e incidentes

Revisar resultados de los crons, errores 5xx, rate limits, cuotas y eventos de seguridad en Vercel/Supabase. Los límites de aplicación son distribuidos en Postgres y bloquean la operación cuando no pueden comprobarse. Verificar alertas a responsables institucionales; no se configuraron envíos nuevos a terceros ni se contrató un servicio.

Ante un incidente: registrar hora/alcance sin copiar secretos, preservar evidencia con acceso limitado, bloquear cuentas y revocar sesiones comprometidas, contener el componente afectado, rotar claves según impacto, evaluar la exposición con la Unidad de Transparencia, cumplir las comunicaciones que determine el responsable conforme a la normativa vigente, recuperar en un entorno de pruebas y registrar acciones/preventivas. No publicar datos personales ni borrar evidencia.

La retención técnica de eventos (90 días), manifiestos (7 días) y entregas (24 horas) debe aprobarse institucionalmente. No se programó eliminación del expediente académico, pagos, mensajes, reportes ni fotografías.

## Comprobaciones antes de cada publicación

Desde la reparación de flujos, las cargas pasan por `security-uploads`, bucket privado temporal, URL firmada y ticket HMAC ligado al usuario/tamaño con validez 15 minutos. El endpoint exige sesión/MFA/origen y limita a 30 cargas por usuario cada diez minutos; las acciones recuperan y validan los bytes antes de persistir. Se mantiene máximo agregado 50 MB y los límites particulares del módulo. No abrir Storage ni aumentar aisladamente Server Actions: Vercel también limita el cuerpo de funciones. Los objetos consumidos se eliminan; el cron limpia abandonados mayores de tres horas. Este bucket se excluye de copias y manifiestos del respaldo. Una carga fallida debe mostrar error, nunca confirmar un registro inexistente.

Las RPC de examen y pagos solo las ejecuta servicio tras autorización de la acción, con bloqueos transaccionales. Pagos/cargos no admiten DML directo autenticado; no restaurar ese grant para resolver una interfaz. Finanzas usa su panel/directorio mínimo, sin acceso a recuperación de claves ni expediente académico. Revisar `flow-verification.md` antes de cambiar estas fronteras.

`npm ci`, `npm run lint`, `npm run test:security`, `npm audit --audit-level=moderate`, `npm run build` y `npm run typecheck`. El workflow de GitHub utiliza claves sintéticas para compilar; nunca secretos de producción. Configurar en GitHub protección de rama y requerir ese check si el plan/permisos lo permiten; el workflow por sí solo no impide un push autorizado a main.

Comprobar login, recuperación, cookies, MFA, páginas por rol, descargas privadas y cabeceras. El CSP de scripts usa un nonce por petición; fuentes y QR se generan localmente. Revisar cada nuevo tercero antes de autorizarlo. HTTPS y HSTS se aplican al host; no se activó `includeSubDomains` ni preload.

Pendientes del proveedor: mínimo nativo de contraseña, protección de claves filtradas, configuración de correo/enlaces de recuperación, restricciones de acceso al dashboard, alertas, renovación TLS y una prueba integral de recuperación. El aviso de protección de contraseñas filtradas de Supabase continúa pendiente; no se alteró el plan Free.
