# Preparación del contenido público y revisiones institucionales

Implementación del 16 de octubre de 2026. Esta pantalla ayuda a encontrar pendientes; no acredita aprobación, exactitud editorial ni cumplimiento jurídico.

## Antes de publicar

En **Sitio público** aparece una comprobación de cuatro categorías con enlace directo al editor correspondiente:

- Un único ciclo activo, que por sí solo no anuncia inscripciones.
- Teléfono, correo y horario de atención registrados. El área debe comprobar que funcionan.
- Guía publicada del ciclo activo con sus tres secciones propias y sin conservar los párrafos de orientación inicial.
- Todos los documentos publicados y marcados vigentes para ese ciclo con enlace PDF admitido. DOCX sigue disponible como complemento.

«Registrado, revisar» indica presencia de datos; no significa que el equipo haya llamado, revisado un documento, aprobado requisitos o certificado accesibilidad. La comprobación no abre archivos remotos, no publica datos ni cambia ciclos. La consulta usa la identidad y permisos del operador; ante error o resultado truncado se muestra que no se pudo comprobar. Los conteos del CMS también avisan cuando fallan, sin afirmar «Todo listo».

El enlace de contacto lleva al bloque Contacto del editor mediante un ancla propia, con margen para la cabecera fija.

El editor de guías abre primero el ciclo activo cuando no se elige uno. La selección explícita de un histórico se conserva y muestra una advertencia. Web y app continúan consultando las mismas guías publicadas; no se sustituyen sus textos ni se crean requisitos, contactos o fechas oficiales.

## Evidencia y aprobación

Operación institucional muestra los datos que faltan en la ficha guardada antes de aprobar: referencia de al menos tres caracteres, procedimiento de al menos treinta, fechas realizadas y vigentes dentro de la periodicidad y, en continuidad, objetivos RPO/RTO válidos. Cuando una revisión vigente vence hoy o en los próximos siete días se muestra un recordatorio en la ficha, con días del calendario sin desfases por zona horaria.

Editar el borrador deshabilita la aprobación de esa ficha y anuncia «Hay cambios sin guardar». Guardar una nueva versión recupera la aprobación disponible. El aviso es conservador: incluso si se vuelve a escribir el valor anterior, se debe guardar o recargar antes de aprobar. Los borradores siguen guardándose normalmente; no se ejecuta una aprobación al editar ni guardar.

Esta protección cliente evita confundir el formulario editado con la versión guardada. La base de datos sigue comprobando rol, MFA, versión, huellas y condiciones de aprobación. Sin JavaScript se conservan ambos formularios y su advertencia; la protección de cambios sin guardar requiere hidratación, y las comprobaciones de servidor siguen siendo obligatorias.

## Accesibilidad y verificación

Los avisos de edición se anuncian mediante una región de estado; las categorías y los datos faltantes usan encabezados y listas semánticas. Los enlaces nuevos admiten objetivos táctiles de al menos44px. El borrador y la aprobación continúan como formularios separados, sin anidar formularios. No se añaden consultas por cada pulsación, observadores, analítica o dependencias cliente.

- `node scripts/verify-public-readiness.cjs`: PASS para orientación inicial/completa, ciclos histórico/activo/ambiguo, contacto vacío, documentos ajenos/no publicados/no vigentes, PDF no admitido o ausente, selección explícita, plazos inclusivos, año bisiesto y límites RPO/RTO.
- `node scripts/verify-operation-governance.cjs`: PASS de estados/huellas/fechas y referencias.
- ESLint de los archivos TS/TSX modificados: PASS.
- El probe existente `verify-operation-isolated.cjs --browser` se amplió para comprobar aprobación deshabilitada al editar, rehabilitada tras guardar y las cuatro categorías del panel. El laboratorio actualizado pasó y se detalla al final; no ejecutar contra producción.

La revisión React conserva las consultas en servidor y en paralelo, sin nuevas dependencias; el cliente recibe solo los formularios ya autorizados y el identificador del formulario. El estado de edición se reinicia con la versión del registro.

La prueba automatizada de teclado/axe no sustituye NVDA/Narrador/TalkBack ni revisión de PDF. No se han aprobado datos institucionales ni creado cuentas reales con estos cambios.

Referencias oficiales consultadas: [W3C: notificaciones de formularios](https://www.w3.org/WAI/tutorials/forms/notifications/) y [React: formularios](https://react.dev/reference/react-dom/components/form).

## Finalización nativa de métricas — 16 de octubre de 2026

Un navegador Chromium propio a390px abrió Contacto de producción con consentimiento sintético exclusivamente de analítica. Todos los métodos distintos de GET/HEAD quedaron bloqueados; los POST al colector se validaron con el parser del proyecto y se respondieron en el navegador con204, sin alcanzar el servidor.

Se abrieron y cerraron las preferencias mediante clic real y se navegó normalmente a Cookies. La navegación del documento saliente produjo dos observaciones de ciclo de vida con `hidden:true` e `isTrusted:true`. La biblioteca oficial envió las tres métricas LCP, INP y CLS en tres solicitudes escalares interceptadas, sin errores de página ni escrituras de base de datos. No se alteraron DOM, valores métricos, propiedades de visibilidad ni se despacharon eventos artificiales.

El límite anterior provenía de esta sesión de escritorio, que conserva ambas pestañas visibles incluso al minimizar la ventana mediante CDP. El probe `verify-metrics-consent-browser.cjs` ahora usa una recarga normal como alternativa cuando no logra ocultar la pestaña. Exige las tres métricas y al menos un evento de visibilidad oculto nativo; elimina la inserción de un bloque DOM que utilizaba el ensayo anterior. Mantiene casos de rechazo, versión1, caducidad, permisos independientes, retirada y almacenamiento bloqueado.

Esta prueba demuestra finalización y entrega cliente interceptada. No aporta una cohorte de visitantes, no guarda datos RUM ni acredita p75 de campo, rendimiento de la app privada, experiencia con lector de pantalla o compatibilidad de todos los dispositivos.

## Resultado del laboratorio actualizado — 16 de octubre de 2026

Servidor propio `http://localhost:3004`, Supabase propio `http://127.0.0.1:55431`, Next16.4.2/React19.3.1. El guardián aislado rechazó destinos alojados antes de crear datos.

`node scripts/run-isolated.cjs -- scripts/verify-operation-isolated.cjs --browser` terminó con código0 y limpieza PASS. Comprobó:

- Base de datos: identidad/rol/MFA, borrador de Staff, aprobación de Dirección, huella/versión manipuladas o antiguas, revisión futura rechazada, historial protegido y continuidad del contenido público.
- Navegador: aprobación real de la ficha, cambio de área y guardado real como borrador; la aprobación queda deshabilitada tras editar y vuelve a estar disponible después de guardar una nueva versión.
- Axe en la sección de operación a390px y en el nuevo panel de preparación a390/1440px: cero infracciones seleccionadas. No hubo errores de página ni desbordes.
- Las cuatro categorías se mostraron sin «Todo listo» ficticio. El enlace Contacto abrió la sección real y su campo de correo.
- Cuentas sintéticas, cambios de ficha e historial del ensayo limpiados y navegador propio cerrado.

La primera verificación de la guardia descubrió un fallo del código nuevo antes de publicarse: un input oculto llamado `id` oculta la propiedad nativa `HTMLFormElement.id`. La comparación ahora usa `getAttribute('id')`, con captura de eventos `input` y `change`. Un diagnóstico fresco confirmó el sombreado, el handler actualizado y el estado deshabilitado después de completar el campo y de escribir con teclado, sin errores; el probe final completo pasó después de esa corrección. Referencia: [HTML Standard, formularios y propiedades por nombre](https://html.spec.whatwg.org/multipage/forms.html#the-form-element).

La unidad de preparación también comprueba valores nulos/ausentes/no textuales de adaptadores como pendientes y las explicaciones existentes de guía para contacto, guía escolar, formatos y revisión institucional. Se añadió únicamente la explicación puntual que faltaba para Contacto del editor. Los otros controles conservan sus explicaciones existentes.

La regresión pública final se completó en esta nueva versión del servidor propio3004, secuencialmente y con cierre de cada Chromium antes del siguiente:

- `node scripts/run-isolated.cjs -- scripts/verify-public-axe.cjs`: exit0, las13rutas a390/1440 y los ocho estados de menú/guía overview/coach/preferencias suman34estados; cero infracciones axe seleccionadas, errores de página, desbordes o escrituras. Salto al contenido, Tab/Enter/Escape, foco y dos opciones de consentimiento independientes PASS.
- `node scripts/run-isolated.cjs -- scripts/verify-metrics-consent-browser.cjs`: exit0, versión1/rechazo/caducidad/mapa exclusivo, medición exclusiva, LCP/INP/CLS oficiales con ciclo de vida oculto nativo mediante navegación normal, retirada/reload y almacenamiento bloqueado con foco/timer PASS. POST interceptados; cero escrituras de métricas y terceros bloqueados.
- `node scripts/run-isolated.cjs -- scripts/verify-cookie-map-isolated.cjs`: exit0, quince estados SSR/noJS/cliente del mapa y preferencias PASS, incluida invalidación previa a hidratación, retirada, persistencia, foco/timer y reintento tras almacenamiento bloqueado. El wrapper creó únicamente el singleton de configuración de mapa ficticio en la base local vacía y comprobó eliminación exacta de esa fila y sus dos auditorías sintéticas; ninguna cuenta creada, ningún registro previo modificado y ninguna escritura alojada. Las solicitudes de métricas y Google se interceptaron.

No hubo nuevos cambios de producto durante esta repetición ni se relajaron aserciones. Todos los navegadores propios quedaron cerrados. Este resultado verifica la nueva versión en el laboratorio; el coordinador debe confirmar Git/CI y la publicación correspondiente por separado. NVDA/Narrador/TalkBack, calidad de accesibilidad de los archivos, aprobación institucional y una cohorte real de campo siguen pendientes.
