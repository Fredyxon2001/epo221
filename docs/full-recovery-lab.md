# Recuperación integral aislada

El laboratorio gratuito reconstruye el esquema de la aplicación desde metadatos: tablas, relaciones, vistas, funciones, triggers, permisos y políticas RLS/Storage. No copia expedientes ni cuentas reales. Supabase aporta sus servicios Auth y Storage. El baseline no es una migración de producción y nunca debe ejecutarse sobre un proyecto alojado.

## Repetición

Instalar dependencias con `npm ci` y Docker. Ejecutar `npm run test:isolated`. La suite crea exclusivamente `epo221-isolated`, utiliza API loopback55431 y web3004, aplica el baseline y las migraciones posteriores a20261007030624, ensaya recuperación y recorre flujos escolares. Al terminar elimina sólo sus propios servicios y volúmenes. No necesita secretos de GitHub/Vercel/Supabase alojado. CI utiliza una pantalla virtual para los recorridos de navegador.

Para una revisión manual: `node scripts/isolated-stack.cjs --start`, `node scripts/run-isolated.cjs -- scripts/apply-isolated-schema.cjs`, luego `node scripts/run-isolated.cjs -- scripts/verify-full-recovery.cjs --isolated`. Finalizar con `node scripts/isolated-stack.cjs --stop`. No ejecutar la restauración mientras otro proceso use las cuentas sintéticas del laboratorio.

## Alcance del respaldo

El simulacro captura `public`, `school_private`, `auth` y `storage` mediante pg_dump formato custom, y los bytes de archivos sintéticos. Hashes de contraseñas y secretos MFA quedan en memoria y en un archivo AES-GCM cifrado bajo `.qa/recovery/`, nunca en texto plano ni en Git. Se verifican autenticación con contraseña, factor TOTP original, relaciones de inscripción, exclusión de otro alumno y hashes de archivos. Se eliminan sesiones restauradas para impedir reutilizar JWT anteriores al incidente. El inventario de extensiones acompaña el manifiesto; las extensiones y la infraestructura compatible deben existir previamente en el destino.

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


## Recuperación remota sin contratar servicios — 2026-10-19

La petición actual limita el presupuesto a cero. El repositorio web es público y el workflow existente Isolated school flows utiliza ubuntu-24.04 estándar. Ese runner remoto ejecuta la misma recuperación integral y los flujos web/móviles sintéticos sin secretos alojados. El recibo .qa/recovery/synthetic-full-proof.json se escribe sólo después de verificar la restauración Y la limpieza de fixtures; al empezar se retira exclusivamente el recibo anterior para no publicar un PASS obsoleto. En GitHub se añade el JSON permitido al Job Summary existente; no se suben dump, archivo cifrado, contraseñas, secreto TOTP, bytes de archivos ni expedientes, y no se añadió almacenamiento de artifacts ni runner de pago. execution distingue github-hosted-runner de local-or-other-runner; sourceCommit y githubRunId sólo admiten SHA/ID con formato estricto.

La copia nativa ahora incluye el esquema privado del lector de notas. Tras restaurar se comprueban función, vista security_invoker/security_barrier y ausencia del grant directo de calificacion; los flujos posteriores comprueban realmente SQL/PostgREST oculto/publicado, roles y corrección docente. Mantiene el factor TOTP original y revoca sesiones restauradas. La duración del ensayo sintético no es el RTO de la escuela. productionRestore/providerManagedRestore permanecen false aunque el runner esté alojado en GitHub.

Bloqueos del proveedor verificados en la sesión autorizada de Supabase: Free no incluye backups gestionados ni Restore to new project; la cuenta llegó a2proyectos Free activos y no admite un tercero. La organización fuente zxpfcrsoodidanxjusxi sigue con gracia hasta27oct2026 por Storage promedio2.398GB/1GB; filtro EPO221 confirma0.074GB. Se creó EPO 221 Escolar, educativa/Free0, adlsffglirueecfdmjts, con el mismo único Owner y0proyectos. Supabase rechaza transferir EPO221 a Free mientras la fuente esté en gracia/restringida; NO se transfirió, contrató, pausó ni eliminó otro proyecto ni sus archivos. Captura ignorada C:/Users/Public/epo221-verification/supabase-free-transfer-blocked.png. Ese destino queda preparado para cuando el titular resuelva el exceso en la fuente; no se debe presentar como un proyecto de recuperación operativo.

El simulacro remoto gratuito verifica portabilidad del software y recuperación sintética, y conserva estos límites. Recuperar el Auth/infraestructura reales del proyecto gestionado, una copia externa institucional y RPO/RTO aprobados siguen pendientes. No usar el backup REST de aplicación como supuesto backup de Auth, ni restaurar o introducir fixtures sobre producción para simularlo.

Referencias oficiales vigentes: [respaldos Supabase](https://supabase.com/docs/guides/platform/backups), [transferencias y requisitos](https://supabase.com/docs/guides/platform/project-transfer), [facturación GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [vistas invocadoras PostgreSQL17](https://www.postgresql.org/docs/17/sql-createview.html).

### Recibo remoto comprobado19oct

[Run39360725548](https://github.com/Fredyxon2001/epo221/actions/runs/39360725548), job118426024762 y source0811d8f98dda68cb51195003df732e3a7b0647d0: SUCCESS. RECOVERY_RECEIPT poscleanup recuperado de logs y cotejado con SHA/run/runneralojado/PG17.11; contraseña+MFAoriginales, sesionesviejasrevocadas, propiedad/RLS, bytesStorage y nuevoslector/grantsPASS. Duración9433ms sólo de fixtures sintéticos; no RTO escolar. Se verificó también conclusiónsuccess de la suite completa, no sólo la emisión de unJSON previo a cleanup. Recibo ignorado .qa/free-recovery-0811d8f98dda-proof.json y JobSummary sin secretos/dumps/artifacts. productionRestore=false/providerManagedRestore=false; la restauración física del proyecto escolar sigue bloqueada dentro del presupuesto0.

Respaldo real de aplicación previo al cierreSQL20oct02:35UTC:70tablas/7378filas/8archivos/488029bytes cifrados, copia local e integridadPASS. No incluye Auth/MFA/infraestructura y no prueba custodiaexterna. FaseB alojada activa y comprobada sin leer filas escolares; detalle en AGENTS. No contratar servicios ni afirmar que la orgeducativaFree vacía es unDR operativo.
