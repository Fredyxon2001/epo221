# Mantenimiento PostgreSQL y recuperación — plan propuesto

Preparado el 7 de octubre de 2026. No representa una ventana aprobada ni una actualización ejecutada. Inventario coordinado de metadatos: proyecto alojado **17.6.1.104**; laboratorio aislado **17.11.0.004**. No se ha actualizado producción ni confirmado la disponibilidad de17.11 para ese proyecto. El simulacro integral local pasó el alcance descrito más abajo; completar la preparación del entorno alojado y la evidencia institucional antes de programar mantenimiento real.

## Referencia de versión

PostgreSQL publicó 17.11 el 13 de agosto de 2026 con correcciones de seguridad y funcionamiento. Para un servidor ya en 17.x, PostgreSQL no exige dump/restore por el cambio menor, pero advierte ajustes para decodificación lógica, revisión de cifrado PGP afectado y posible reindexación de `btree_gist`/`ltree`. Revisar también cambios anteriores si se parte de una versión previa a 17.6. Esto no sustituye el procedimiento del proveedor. [Notas oficiales 17.11](https://www.postgresql.org/docs/17/release-17-11.html).

TI puede inventariar mediante consultas de lectura autorizadas, sin conexiones ni resultados con secretos en los documentos:

```sql
SHOW server_version;
SELECT extname, extversion FROM pg_extension ORDER BY extname;
SELECT plugin, count(*) FROM pg_replication_slots GROUP BY plugin;
```

Comparar la versión efectiva del servidor, herramientas de respaldo/restauración y extensiones con lo que ofrece Supabase. Verificar compatibilidad y advertencias del proceso administrado; registrar duración estimada, condiciones de interrupción, copia previa y procedimiento de recuperación. No sustituir manualmente imágenes o binarios del proyecto alojado. [Actualizaciones administradas](https://supabase.com/docs/guides/platform/upgrading).

El inventario coordinado no detectó `ltree`, índices `gistfloat`, estimadores personalizados ni funciones PGP del esquema público en los supuestos revisados. Esta observación acota algunas verificaciones; no descarta otras correcciones de17.11 ni certifica toda la infraestructura. No ejecutar reindexaciones o limpiezas preventivas sin identificar objetos afectados.

## Responsabilidades y decisión

| Área propuesta | Preparación que debe quedar documentada |
| --- | --- |
| TI | Inventario, compatibilidad, ensayo aislado, copia cifrada, verificación de integridad y mediciones de recuperación |
| Control Escolar | Impacto sobre inscripciones, ciclos, calificaciones, calendario y entrega de documentos |
| Finanzas | Impacto sobre pagos, conciliaciones y comprobantes; conservación de evidencia |
| Dirección | Alcance, ventana, responsables por área, RPO/RTO y comunicación institucional autorizada |

No hay una fecha propuesta automáticamente. Elegir la ventana a partir del calendario real y la duración medida. Un retorno a la versión anterior puede requerir restauración en otro destino compatible; no prometer un downgrade inmediato ni reanudar producción con una copia cuya integridad no se haya demostrado.

## Alcance del respaldo integral

La copia de tablas y bytes de aplicación existente no incluye por sí sola todos los componentes del servicio. El respaldo de base de datos de Supabase contiene metadatos de Storage, pero no los bytes de los objetos; deben conservarse y comprobarse separadamente. Confirmar los respaldos realmente disponibles en el plan vigente sin asumir copias administradas, PITR o una contratación nueva. [Respaldos de Supabase](https://supabase.com/docs/guides/platform/backups).

| Componente | Evidencia necesaria para recuperación |
| --- | --- |
| Base de datos | Esquema y datos, funciones/RPC, triggers, RLS, grants, vistas, extensiones, secuencias y migraciones del corte |
| Auth | Usuarios, contraseñas y factores MFA bajo cifrado/custodia; login posterior, AAL2 y sesiones antiguas revocadas |
| Storage | Buckets y políticas, manifiesto, bytes, tamaño y hash; prueba de acceso propio/ajeno y documentos privados/públicos |
| Infraestructura | Configuración Auth/SMTP/OAuth, cron, dominios, variables, credenciales, llaves y responsables de custodia, fuera de Git |
| Web y móvil | Fuente/versiones y artefactos verificables; firma Android, keystore custodiado y assets externos publicados |

Una copia de esquema o un manifiesto no demuestra recuperación de estos componentes. Transferir configuración y datos entre proyectos necesita pasos adicionales y verificación específica de Auth/Storage. [Guía oficial de respaldo y restauración](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

El diagnóstico local encontró que el rol `postgres` del laboratorio no era propietario de tablas internas de Storage, como `vector_indexes`; restaurar todo el servicio necesita respetar sus propietarios y privilegios. El ensayo utiliza exclusivamente `supabase_admin` del contenedor propio para esa operación. Esto no otorga privilegios equivalentes en producción: claves API/service_role no son credenciales superuser de PostgreSQL. Para las tablas internas alojadas se requiere el procedimiento y respaldo del proveedor, con custodia y permisos confirmados. No conceder nuevos privilegios al proyecto real para imitar el laboratorio.

El archivo nativo del ensayo contiene los esquemas `public`, `auth` y `storage`; el manifiesto conserva por separado el inventario de extensiones, sus versiones y esquemas. La infraestructura de extensiones compatible debe existir previamente en el destino. No restaurar el esquema de extensiones como si fuera contenido escolar ni ejecutar `DROP EXTENSION` para resolver dependencias: hooks y objetos como GraphQL pueden vivir fuera del archivo de aplicación y pertenecer al proveedor. Comparar el inventario antes de restaurar y detener la prueba si falta compatibilidad; el archivo no reemplaza esa infraestructura.

## Criterios de prueba antes de aprobar la ventana

Ejecutar primero en el stack propio de pruebas con datos sintéticos, sin conexión de escritura a producción. Custodiar las claves fuera de la copia; mantener dumps, hashes de contraseñas, secretos MFA y bytes sensibles cifrados y sin logs. Registrar versiones, alcance y errores; un fallo de restauración deja la prueba pendiente, aunque la copia se haya descifrado correctamente.

La evidencia debe demostrar recuperación de relaciones y secuencias, login y MFA, rechazo de sesiones previas, RLS por rol, acceso a archivos y funcionamiento de RPC/acciones. Recorrer además web y móvil para las funciones afectadas: acceso, cambio inicial de contraseña, tareas/avisos, archivos, pagos y control de ciclos usando registros sintéticos. Medir tiempo real, último corte recuperable y recursos; compararlos con objetivos institucionales todavía por acordar. Eliminar sólo los recursos temporales propios y comprobar su limpieza.

No cambiar producción hasta resolver fallos del ensayo y tener un plan concreto revisable. Después del mantenimiento comprobar versión efectiva, permisos, avisos del proveedor y flujos críticos antes de dar servicio por restablecido. Conservar evidencia del resultado y registrar la revisión en `/admin/operacion`; su aprobación no ejecuta el mantenimiento.

## Resultado del laboratorio coordinado

El simulacro integral sobre17.11.0.004 pasó recuperación de la contraseña de una cuenta sintética, TOTP original, archivo con hash coincidente, rechazo de sesiones previas y RLS de inscripciones propias/ajenas. El destino fue exclusivamente el stack propio de pruebas, conservando infraestructura de extensiones compatible y el inventario separado. Los errores anteriores de propiedad/restauración se diagnosticaron antes de declarar este resultado; no usar el éxito del cifrado como sustituto del restore.

Esta evidencia no demuestra restauración del proyecto alojado, entrega de sus credenciales de base de datos, custodia independiente, correo/OAuth externo, recuperación de dominios ni cumplimiento de RPO/RTO institucionales. Tampoco valida cada expediente o dispositivo físico. Las comprobaciones web/móvil después de la restauración y sus resultados finales se registran por separado en `AGENTS.md` y el orquestador de pruebas aisladas.
