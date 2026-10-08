# Recuperación integral aislada

El laboratorio gratuito reconstruye el esquema de la aplicación desde metadatos: tablas, relaciones, vistas, funciones, triggers, permisos y políticas RLS/Storage. No copia expedientes ni cuentas reales. Supabase aporta sus servicios Auth y Storage. El baseline no es una migración de producción y nunca debe ejecutarse sobre un proyecto alojado.

## Repetición

Instalar dependencias con `npm ci` y Docker. Ejecutar `npm run test:isolated`. La suite crea exclusivamente `epo221-isolated`, utiliza API loopback55431 y web3004, aplica el baseline y las migraciones posteriores a20261007030624, ensaya recuperación y recorre flujos escolares. Al terminar elimina sólo sus propios servicios y volúmenes. No necesita secretos de GitHub/Vercel/Supabase alojado. CI utiliza una pantalla virtual para los recorridos de navegador.

Para una revisión manual: `node scripts/isolated-stack.cjs --start`, `node scripts/run-isolated.cjs -- scripts/apply-isolated-schema.cjs`, luego `node scripts/run-isolated.cjs -- scripts/verify-full-recovery.cjs --isolated`. Finalizar con `node scripts/isolated-stack.cjs --stop`. No ejecutar la restauración mientras otro proceso use las cuentas sintéticas del laboratorio.

## Alcance del respaldo

El simulacro captura `public`, `auth` y `storage` mediante pg_dump formato custom, y los bytes de archivos sintéticos. Hashes de contraseñas y secretos MFA quedan en memoria y en un archivo AES-GCM cifrado bajo `.qa/recovery/`, nunca en texto plano ni en Git. Se verifican autenticación con contraseña, factor TOTP original, relaciones de inscripción, exclusión de otro alumno y hashes de archivos. Se eliminan sesiones restauradas para impedir reutilizar JWT anteriores al incidente. El inventario de extensiones acompaña el manifiesto; las extensiones y la infraestructura compatible deben existir previamente en el destino.

La cuenta `supabase_admin` de este contenedor permite restaurar las tablas internas propiedad del proveedor. No equivale a una clave `service_role` ni debe asumirse disponible en producción. Las extensiones administradas se conservan, porque sus hooks pueden depender de otros esquemas. La prueba espera Auth **y** Storage después de reiniciarlos; esperar sólo Auth produjo una respuesta502 transitoria de Storage.

## Evidencia y límites

2026-10-07: ensayo con PostgreSQL17.11 PASS para contraseña, MFA, revocación de sesiones, inscripciones, separación de alumnos y bytes de Storage; limpieza exacta PASS. También se restauró un archivo privado de portafolio: el alumno dueño pudo leerlo y otro alumno, autenticado nuevamente después de restaurar, tuvo acceso denegado. La suite integral repitió esta recuperación antes de los flujos escolares y terminó correctamente.

El laboratorio no acredita recuperación de producción ni tiempos RPO/RTO institucionales. El respaldo REST existente no contiene hashes/secretos de Auth. La recuperación real requiere copia nativa del proveedor, custodia de secretos/configuración, archivo independiente de todos los objetos de Storage y un destino aislado compatible. Actualmente no hay credencial nativa de base de datos disponible para exportar Auth de producción; no se debe sustituir esa ausencia con expedientes o contraseñas inventadas. Una actualización alojada de PostgreSQL requiere ventana, respaldo real recuperable y plan de rollback.

Los endpoints/configuración de la aplicación móvil se generan sólo para el laboratorio y no se distribuyen por EAS Update, APK ni tiendas. Expo Go prueba ejecución administrada del código; no acredita firma, instalación autónoma, OTA o actualización física del APK.

Fuentes: [desarrollo local](https://supabase.com/docs/guides/local-development), [respaldos](https://supabase.com/docs/guides/platform/backups), [actualizaciones](https://supabase.com/docs/guides/platform/upgrading).
