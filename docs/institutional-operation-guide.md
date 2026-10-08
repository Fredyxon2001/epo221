# Guía de revisión institucional — propuesta para las áreas

Preparada el 7 de octubre de 2026. Este documento es una guía de trabajo; no contiene acuerdos aprobados, nombres de responsables ni fechas oficiales nuevas. Las fichas de `/admin/operacion` empiezan pendientes. La escuela debe confirmar quién tiene atribuciones para autorizar cada procedimiento.

## Cómo registrar una revisión

1. Abre **Operación institucional** desde Administración, Dirección o el panel del sitio público. El acceso exige la seguridad de la cuenta y MFA.
2. Selecciona el tema y consulta el contenido enlazado. Confirma el área responsable; usa denominaciones de áreas, sin nombres, CURP, expedientes ni datos sensibles.
3. Registra el ciclo cuando corresponda, el folio o referencia del procedimiento y su alcance. Un enlace HTTPS es opcional; no convierte un documento externo en evidencia revisada automáticamente.
4. Escribe la fecha en que efectivamente se revisó y la próxima revisión acordada. La periodicidad inicial de 90 días es una propuesta editable, no una obligación aprobada. No registres una revisión futura como realizada.
5. Pulsa **Guardar borrador** y comprueba la confirmación. Esto deja pendiente la ficha y conserva el historial anterior.
6. Administración o Dirección con MFA revisan la ficha guardada, confirman la casilla y pulsan **Aprobar ficha guardada con MFA**. Staff prepara borradores, pero no puede aprobar. Debe existir folio y un procedimiento de al menos 30 caracteres; la próxima revisión tiene que quedar dentro de la periodicidad y no estar vencida.
7. Consulta el estado y el historial. Una modificación de la ficha, contenido público o páginas de privacidad/cookies exige revisar nuevamente. Si cambió la versión mientras trabajabas, recarga antes de volver a aprobar.

## Propuestas por área

| Tema | Área propuesta, editable | Evidencia que debe confirmar la escuela |
| --- | --- | --- |
| Publicaciones | Dirección / Control Escolar | Fuente y revisión de portada, oferta, noticias, páginas y contacto; retirar afirmaciones sin sustento y comprobar lo publicado |
| Calendario y formatos | Control Escolar | Ciclo aplicable, fechas aprobadas, convocatoria, requisitos y versión de cada formato; comprobar PDF/DOCX y recorrido web/móvil |
| Privacidad | Dirección | Aviso integral, responsable institucional y canal de atención confirmado; revisión especializada del marco aplicable |
| Fotografías | Dirección | Referencia a autorizaciones custodiadas, alcance de difusión y procedimiento de retiro; revisar los álbumes antes de publicar |
| Recuperación MFA | TI / Dirección | Verificación de identidad, autorización, folio, revocación de sesiones y recuperación del último acceso administrativo |
| Retenciones | Dirección / Control Escolar / Finanzas | Categorías documentales, fundamento, plazos, restricciones y disposición autorizada; conservación de evidencia cuando proceda |
| Continuidad | TI / Dirección | Copia cifrada, custodia de claves, alcance de recuperación y resultado del simulacro; RPO/RTO acordados |
| Contacto | Control Escolar | Teléfono, correo, horario y canal real de trámites publicados; comprobar que el área puede atenderlos |

Estos ejemplos no asignan personas ni autorizan tratamientos, publicaciones o eliminación de archivos. Conserva las evidencias en el repositorio institucional autorizado; la ficha puede llevar su folio sin copiar datos personales.

## Continuidad y mantenimiento

En continuidad, **RPO** expresa cuántos minutos de datos se acepta perder y **RTO** el tiempo objetivo para recuperar servicio. Se registran de forma independiente; no se deducen de una tarea diaria ni de un ensayo rápido. Sus valores deben acordarse después de medir un simulacro y revisar recursos. Registra el resultado observado por separado, incluidos errores y funciones pendientes.

Para actualización de PostgreSQL y recuperación consulta [el plan de mantenimiento](postgres-maintenance-plan.md) y [operación de seguridad](security-operations.md). El ensayo integral aislado pasó los controles documentados de Auth/MFA, archivo, sesiones y RLS; no equivale a recuperación de producción ni aprobación institucional. No uses el servidor de lectura pública para cuentas de prueba ni restaures sobre producción.

## Qué significa el estado

| Estado | Lectura práctica |
| --- | --- |
| Pendiente | Borrador, datos incompletos, huella no disponible o contenido distinto del revisado; debe revisarse antes de dar la ficha por vigente |
| Vigente | Aprobación registrada, contenido comparado coincidente y plazo vigente; no certifica cumplimiento legal ni consentimientos individuales |
| Vencido | Ya pasó la fecha acordada para revisar; actualizar evidencia y volver a aprobar |

El estado no bloquea el sitio público. Las huellas cubren los conjuntos públicos que muestra cada ficha y las fuentes de privacidad/cookies en la compilación. No revisan por sí mismas contratos, autorizaciones de fotografías, contenido remoto detrás de un enlace, procedimientos internos o resultados de simulacros. Cambios de fuentes en desarrollo requieren reiniciar Next; en producción requieren nueva compilación. La guía acompaña cada control por rol y no ejecuta operaciones por el usuario.

## Evidencia técnica del módulo

Probe `verify-operation-isolated.cjs --browser` PASS en el Supabase propio55431/web3004: acceso por rol/MFA, borrador de Staff, aprobación de Dirección, rechazo de huella/versión manipulada y revisión futura, historial protegido, y contenido publicado accesible aunque su revisión quede pendiente. Navegador visible390px confirmó aprobación y guardado reales, huella de fuentes, ausencia de pageerrors/desbordes y limpieza de los datos sintéticos. Un primer recorrido agotó60s durante la compilación inicial de desarrollo; el probe ahora permite180s de navegación y reintenta una revisión si cambia el contenido por una prueba simultánea. No fue una aprobación real ni una prueba de todos los trámites institucionales.
