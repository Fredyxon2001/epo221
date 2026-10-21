# Integridad y custodia de respaldos

Actualizado el 2026-10-16. Estos controles mejoran la copia de aplicación y no equivalen a restaurar el proyecto alojado.

## Verificación implementada

El cron conserva los manifiestos anteriores hasta descargar de Storage el manifiesto recién creado y comparar íntegramente los bytes cifrados. Un error de lectura, ausencia o corrupción impide ejecutar la retención; el endpoint conserva su respuesta de error500. Los archivos se siguen autenticando con AES-256-GCM y comparando sus bytes originales al generarlos.

La copia local revisa también archivos cifrados que ya existen: tamaño y SHA-256 después de descifrar en memoria. Antes se omitían por existir, lo que podía ocultar una copia incompleta o corrupta. El manifiesto local se escribe al final, cuando todos sus archivos están disponibles y verificados. No se borra ni sobrescribe automáticamente un archivo local que falló: preservar evidencia y reponerlo desde una fuente verificada.

## Comprobación sin red

Desde el repositorio, con Node y dependencias instaladas:

```text
node scripts/verify-backup-custody.cjs --snapshot=snapshots/AAAA-MM-DDTHH-mm-ss-sssZ.json.gz.enc --max-age-hours=36
```

Reemplazar el nombre por el manifiesto cifrado real; no por un archivo JSON descifrado. Por defecto revisa el directorio ignorado security-backups. Para una copia institucional en otra ubicación, pasar --directory=RUTA dentro de comillas según la terminal.

BACKUP_ENCRYPTION_KEY debe estar disponible mediante el gestor de secretos o entorno del proceso. Este comprobador no carga .env.local ni utiliza credenciales de Supabase; no poner la clave en argumentos, historial, Git, capturas o registros. Las pruebas automatizadas usan datos sintéticos. La ejecución operativa autorizada al final de este documento verificó la copia cifrada real en memoria, sin imprimir registros.

El comprobador autentica el manifiesto, valida referencias por hash, rechaza rutas fuera de la custodia incluso mediante enlaces, lee únicamente sus archivos cifrados y verifica tamaño/hash en memoria. No accede a Internet, no restaura, no genera texto plano y no imprime nombres de archivos escolares, registros, claves o endpoints.

Códigos de salida:

- 0: integridad completa y antigüedad dentro del umbral solicitado.
- 2: integridad completa pero antigüedad superior al umbral; revisar la ejecución del cron y la transferencia a custodia.
- 1: configuración ausente, copia incompleta/corrupta, clave incorrecta o entrada inválida; revisar la copia antes de considerarla recuperable.

La salida contiene sólo estado, antigüedad, umbral y totales agregados. El umbral36h es una propuesta técnica para detectar retrasos de un cron diario; no es un RPO institucional aprobado. El valor se calcula desde la fecha declarada del manifiesto, no acredita puntualidad del proveedor ni sincronización de OneDrive. No se configuraron envíos a terceros. Un operador puede incorporar el código de salida a su monitor institucional aprobado.

## Qué sigue pendiente para recuperación alojada

| Evidencia necesaria | Responsable propuesto | Estado |
| --- | --- | --- |
| Reautorizar el conector Supabase con permiso suficiente para asesores/metadatos del proyecto correcto | Propietario de Supabase/TI | Lectura denegada -32600 el16oct; no se eludió por CLI ni otra credencial |
| Respaldo nativo recuperable que incluya Auth, factores MFA y esquema/configuración necesarios | Propietario de Supabase/TI | No verificado en el servicio alojado |
| Copia independiente de los bytes de Storage y del APK aprobado, con hashes | TI/custodio de continuidad | La validación sintética no acredita una copia externa real |
| Custodia independiente de clave de respaldo, identidad de firma Android y configuración del proveedor | Dirección/TI | Requiere responsables institucionales y acceso comprobado |
| Restauración en destino aislado compatible, revocación de sesiones antiguas y pruebas web/móvil | TI/Control Escolar/Finanzas | Laboratorio local histórico aprobado; prueba alojada pendiente |
| RPO, RTO y procedimiento de autorización de recuperación | Dirección | Propuesta pendiente de aprobación |

No usar una clave service_role como sustituto de una credencial nativa para exportar Auth. No restablecer la contraseña de base de datos ni habilitar servicios de pago para resolver esta limitación sin una decisión concreta del propietario. No restaurar sobre producción como simulacro.

Supabase especifica que el respaldo de la base contiene metadatos de Storage, no sus objetos. Su guía de migración distingue configuración, extensiones, personalizaciones de Auth/Storage y transferencia de archivos. Seguir esas instrucciones con acceso autorizado en un destino de pruebas; revisar la disponibilidad del plan real antes de prometer respaldo administrado.

## Verificación de esta entrega

node scripts/verify-backup-integrity.cjs: PASS con datos y clave exclusivamente sintéticos. Comprueba persistencia antes de retención, fallo de lectura/corrupción sin borrado antiguo, caché local corrupta por tamaño/hash, ciphertext alterado, clave incorrecta, truncamiento, manifiesto inválido, archivos faltantes, límites de antigüedad y salida sin contenidos. La prueba elimina sus propios archivos temporales. La suite integral y el despliegue coordinados se registran en AGENTS.md.

Fuentes oficiales consultadas el16oct2026: [respaldos](https://supabase.com/docs/guides/platform/backups), [respaldo y restauración con CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [conector MCP y autenticación](https://supabase.com/docs/guides/ai-tools/mcp), [tokens con alcance limitado](https://supabase.com/changelog/scoped-personal-access-tokens-ga).


## Crear una copia nueva es una operación distinta

node scripts/backup-security.cjs --create genera una nueva copia en el servicio y aplica la retención existente antes de conservarla cifrada localmente. Sin --create falla antes de cargar el entorno o conectarse. Este guard no cambia el cron autenticado.

La creación puede transferir de nuevo los archivos de Storage, incluido un APK histórico, y consumir cuota/espacio del plan existente. Confirmar ventana y destino institucional antes de usarla; no confundir con el comprobador offline. Ante un fallo no repetir automáticamente ni contratar otro plan. Esta operación no exporta Auth ni acredita custodia fuera del equipo.


## Ejecución del 16 de octubre de2026

Respaldo real autorizado de aplicación PASS:70tablas,7342filas,8archivos; snapshot cifrado486969bytes y archivos originales45191862bytes. Copia cifrada local y comprobación offline de cada tamaño/hash/AES-GCM PASS, reciente bajo36h. Sin restaurar producción ni divulgar registros. La clave la proporciona el llamador en memoria; el comprobador no carga entorno. Este resultado sigue excluyendo Auth/infraestructura del proveedor y custodia externa.


La retención automática existente de siete días corresponde a manifiestos remotos. Los objetos cifrados por hash y las copias locales no se purgan automáticamente; su custodia y eliminación necesitan una política institucional y comprobar que ninguna copia conservada los necesita. No se añadió un borrado general de archivos. Los APK publicados en GitHub se custodian además con sus originales y hashes; no entran automáticamente en el respaldo Storage.


## Transferencia portátil sin crear respaldos — 21 de octubre de 2026

La CLI scripts/transfer-backup-custody.cjs separa dos operaciones explícitas. --fetch-latest lee el último manifiesto ya existente del proyecto escolar y sus archivos cifrados; no crea copias remotas, sube archivos, aplica retención ni restaura. --export funciona sin red y copia sólo ciphertext a un directorio nuevo fuera del workspace, con permiso privado del usuario/SYSTEM en Windows y comprobación independiente antes de emitir recibo. Rechaza destino existente, anidado, rutas/enlaces fuera de custodia, clave equivocada, corrupción, archivos faltantes, tamaños excesivos y antigüedad mayor a36h. No sustituye copias locales corruptas automáticamente.

Ejemplo PowerShell, desde sistema, usando el entorno servidor ya autorizado y sin incluir claves en argumentos:

~~~powershell
node --env-file=.env.local scripts/transfer-backup-custody.cjs --fetch-latest --directory=security-backups
node --env-file=.env.local scripts/transfer-backup-custody.cjs --export --directory=security-backups --snapshot=snapshots/AAAA-MM-DDTHH-mm-ss-sssZ.json.gz.enc --destination=R:/EPO221/custodia-nueva
node --env-file=.env.local scripts/verify-backup-custody.cjs --directory=R:/EPO221/custodia-nueva --snapshot=snapshots/AAAA-MM-DDTHH-mm-ss-sssZ.json.gz.enc
~~~

Sustituir el manifiesto y destino por los reales; el directorio padre debe existir, el destino debe ser nuevo y el medio autorizado. Para la exportación offline basta BACKUP_ENCRYPTION_KEY provisionada en el proceso; no requiere service_role ni cargar .env.local. Mantener la clave por un canal independiente. El recibo sólo contiene hash del manifiesto cifrado, totales y alcance; no la clave ni registros. La herramienta no declara que una ruta externa sea otro dispositivo o custodia externa.

Ejecución real autorizada21oct: lectura de snapshots/2026-10-21T05-45-29-745Z.json.gz.enc; ocho archivos/45,191,862bytes originales verificados con AES-GCM/tamaño/SHA256. Exportación privada a C:/Users/Public/epo221-custody-20261021 y segundo verificador offline PASS, manifiesto cifrado SHA256 d136919a8ac375f009dd49d8ba8897f427f9bdb14923848c21512581e7450655. Es el mismo equipo: offsiteCustodyVerified=false, authRecovered=false y providerRecovered=false. No se generó respaldo nuevo ni retención alojada. La antigüedad se evalúa al ejecutar, no permanece vigente por esta nota.

Prueba durable: node scripts/verify-portable-custody.cjs, incluida en test:security; datos y claves sintéticos, limpieza sólo de su temporal propio. La restauración Auth/infraestructura alojados, destino independiente y RPO/RTO institucionales siguen abiertos. El presupuesto sigue en cero.
