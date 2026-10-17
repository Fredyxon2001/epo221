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


## Enlace local comprobado — 2026-10-16

Docker Desktop publicó inicialmente API/DB en0.0.0.0 yIPv6 pese a que la red tenía host_binding_ipv4=127.0.0.1. La guía oficial recomienda esa opción, pero no se puede usar como prueba suficiente del enlace real. El arranque ahora inspecciona los puertos publicados y fija explícitamente127.0.0.1 sólo en los contenedores propios de API/DB cuando hace falta. Conserva Config, healthcheck, volúmenes con nombre y configuración local del gateway en memoria; no cambia Docker global, firewall, redes ajenas ni proveedor alojado. Una recreación fallida deja contenedores detenidos y conserva sus volúmenes.

status/environment fallan antes de proporcionar credenciales de ensayo si el inventario DB/API no tiene únicamente puertos loopback esperados. El guard rechaza IPv4/IPv6 global, puerto inesperado, contenedor/proyecto ajeno y contenedor detenido. Las pruebas sintéticas verifican estas fronteras y la conservación de configuración. Readback real de esta entrega: API127.0.0.1:55431 yDB127.0.0.1:55432 healthy, volumen propio conservado. Los contenedores antiguos detenidos de esta corrección se retiraron sin borrar volúmenes. La recuperación integral coordinada se registra en AGENTS.md al concluir.

Fuentes oficiales: [desarrollo local](https://supabase.com/docs/guides/local-development), [reporte de enlace en Docker Desktop](https://github.com/supabase/supabase/issues/51027). No inferir aislamiento por mostrar localhost en la URL del cliente.


Repetición2026-10-16 con los puertos corregidos: PASS en PostgreSQL17.11 para contraseña Auth, factor y secreto TOTP originales, sesiones previas revocadas, relaciones de inscripción, separación entre alumnos, lectura privada del dueño permitida/ajena denegada y hash de archivos restaurados. Funciones/triggers/grants recuperados; cleanup de cuentas/filas/archivos sintéticos PASS. El laboratorio continúa disponible para las siguientes pruebas coordinadas; apagar sólo sus servicios al finalizar toda la verificación. No se restauró producción ni se acreditó respaldo Auth alojado.
