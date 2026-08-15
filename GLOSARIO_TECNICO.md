# Glosario técnico — Sistema EPO 221

> Extraído de `README.md` y `MANUAL_COMPLETO.md`. Pensado para que cualquier persona sin formación en programación entienda de qué se habla en la documentación del sistema.

---

## 1. Stack y tecnologías (las "piezas" con las que está construido el sistema)

| Término | Definición |
|---|---|
| **Stack** | El conjunto de tecnologías/herramientas que se usan juntas para construir el sistema (como decir "de qué materiales está hecho el edificio"). |
| **Frontend** | La parte del sistema que el usuario ve y con la que interactúa en el navegador: pantallas, botones, formularios. |
| **Backend** | La parte del sistema que no se ve: donde se guardan los datos, se validan permisos y se procesan las reglas de negocio. |
| **Next.js** | El "motor" con el que está construido el sitio web. Es un framework (conjunto de herramientas ya armadas) sobre React que permite construir páginas rápidas y organizadas. |
| **App Router** | La forma en que Next.js organiza las páginas del sitio según la estructura de carpetas (cada carpeta = una sección de la URL). |
| **React** | Biblioteca de programación con la que se arman las pantallas del sistema en piezas reutilizables llamadas "componentes" (como piezas de LEGO). |
| **TypeScript** | Una versión de JavaScript (el lenguaje de programación de las páginas web) que obliga a especificar qué tipo de dato es cada cosa, para detectar errores antes de que el sistema falle. |
| **Tailwind CSS** | Herramienta para darle estilo visual (colores, tamaños, espacios) al sitio, usando "clases" cortas en vez de escribir hojas de estilo largas. |
| **shadcn/ui** | Colección de componentes visuales ya diseñados (botones, tarjetas, menús) que se usan como base para no diseñar todo desde cero. |
| **PostCSS / Autoprefixer** | Herramientas internas que procesan los estilos visuales para que se vean bien en todos los navegadores. |
| **Framer Motion** | Biblioteca que se usa para crear animaciones (por ejemplo, que un texto aparezca suavemente al hacer scroll). |
| **Componente** | Una pieza de interfaz reutilizable (por ejemplo, el botón de "Cerrar sesión" o la tarjeta de una noticia) que se puede usar en varias pantallas sin volver a construirla. |
| **Server Component** | Un componente que se genera en el servidor (la computadora que atiende las peticiones) antes de enviarse al navegador del usuario — más rápido y más seguro porque no expone lógica sensible. |
| **Client Component** ("`use client`") | Un componente que se ejecuta en el navegador del usuario, necesario cuando hay interacción (clics, formularios que cambian en vivo). |
| **Hook** (`useState`, `useTransition`, etc.) | Una función especial de React que permite a un componente "recordar" información o reaccionar a eventos (por ejemplo, saber si un formulario se está enviando). |

---

## 2. Backend, base de datos y Supabase

| Término | Definición |
|---|---|
| **Supabase** | El servicio que funciona como "backend" completo del sistema: guarda todos los datos, gestiona quién puede iniciar sesión y almacena archivos. Es como el motor detrás de la aplicación. |
| **PostgreSQL (Postgres)** | El tipo de base de datos que usa Supabase. Es donde literalmente viven todas las tablas: alumnos, calificaciones, mensajes, etc. |
| **Base de datos** | El lugar organizado en tablas donde se guarda toda la información permanente del sistema (equivalente digital a un archivero enorme). |
| **Tabla** | Una "hoja de cálculo" dentro de la base de datos, con columnas fijas (ej. la tabla `alumnos` tiene columnas como nombre, matrícula, correo). |
| **Columna** | Un campo específico de una tabla (ej. la columna `email` guarda el correo de cada alumno). |
| **Fila / Registro** | Un elemento individual dentro de una tabla (ej. un alumno específico es una fila de la tabla `alumnos`). |
| **PK (Primary Key / llave primaria)** | El identificador único de cada fila en una tabla — como el número de expediente que nunca se repite. |
| **FK (Foreign Key / llave foránea)** | Una columna que "apunta" a otra tabla para relacionar información (ej. en `alumnos`, la columna `perfil_id` apunta a la tabla `perfiles`). |
| **UUID** | Un código único generado automáticamente (una cadena larga de letras y números) que se usa como identificador de cada registro, en vez de un número simple. |
| **Tabla pivote / tabla puente** | Una tabla que conecta a otras tablas entre sí. Ej. `asignaciones` conecta materia + grupo + profesor + ciclo en una sola combinación. |
| **Enum** | Una lista fija de valores permitidos para un campo (ej. el `rol` de un usuario solo puede ser `alumno`, `profesor`, `admin`, `staff` o `director`, nada más). |
| **JSONB** | Un tipo de columna que permite guardar datos con estructura flexible (como una mini lista de información dentro de una sola celda), útil cuando el contenido varía. |
| **Trigger** | Una regla automática que se ejecuta sola cuando pasa algo en la base de datos (ej. al capturar una calificación, un trigger recalcula automáticamente el promedio final). |
| **Función SQL / RPC** | Una "receta" guardada dentro de la base de datos que hace un cálculo o proceso específico y se puede llamar desde el sistema (ej. la función que agrega los resultados de evaluación docente). |
| **SECURITY DEFINER** | Una configuración especial de una función de base de datos que le permite ejecutarse con permisos elevados de forma controlada, sin exponer datos que no debería. |
| **Vista (View) / Vista materializada** | Una "fotografía" pre-calculada de datos que combinan varias tablas, para que el sistema no tenga que recalcular todo cada vez que alguien la consulta (ej. la vista que arma el estado de cuenta de un alumno). |
| **Migración** | Un archivo que registra un cambio hecho a la estructura de la base de datos (agregar una tabla, una columna, etc.), para poder aplicar los mismos cambios en otro lugar de forma ordenada. |
| **Schema** | El "plano" completo de cómo están organizadas todas las tablas y sus relaciones. |
| **Seed** | Datos de ejemplo o iniciales que se cargan a la base de datos para dejarla lista para usarse (ej. crear el primer usuario administrador). |
| **Bucket** | Un espacio de almacenamiento para archivos (fotos, PDFs, documentos) dentro de Supabase Storage — como una carpeta especial en la nube. |
| **Query / consulta** | Una petición de datos hecha a la base de datos (ej. "dame todos los alumnos del grupo 1°A"). |
| **CRUD** | Siglas de Crear, Leer (Read), Actualizar (Update) y Borrar (Delete) — las cuatro operaciones básicas que se pueden hacer sobre cualquier dato. |
| **Soft delete (borrado suave)** | En vez de eliminar un registro para siempre, se marca con una fecha en la columna `deleted_at` para "ocultarlo" sin perder la información, por si se necesita recuperar. |
| **Backup** | Una copia de seguridad de toda la base de datos, para poder recuperar la información si algo sale mal. |
| **PITR (Point-In-Time Recovery)** | Función que permite restaurar la base de datos exactamente como estaba en un momento específico del pasado (no solo el backup más reciente). |

---

## 3. Autenticación, seguridad y permisos

| Término | Definición |
|---|---|
| **Autenticación** | El proceso de verificar que un usuario es quien dice ser (iniciar sesión con correo y contraseña). |
| **Sesión** | El periodo en que un usuario permanece "reconocido" por el sistema después de iniciar sesión, sin tener que volver a escribir su contraseña en cada página. |
| **Cookie de sesión** | Un pequeño archivo que el navegador guarda para recordar que el usuario ya inició sesión. |
| **Middleware** | Una capa de revisión que se ejecuta antes de mostrar cualquier página privada, para verificar si el usuario tiene sesión activa y permiso de entrar. |
| **RLS (Row Level Security / Seguridad a nivel de fila)** | Un sistema de reglas dentro de la base de datos que controla, fila por fila, quién puede ver o modificar cada dato — por ejemplo, que un alumno solo pueda ver sus propias calificaciones y no las de otros. |
| **Policy (política de RLS)** | Una regla específica de RLS (ej. "el alumno puede leer su propia fila si `perfil_id` coincide con su usuario"). |
| **Service role / Service role key** | Una llave especial de acceso que "salta" (bypass) las reglas de RLS, usada solo en procesos internos y controlados del servidor (nunca expuesta al usuario). |
| **Bypass** | Saltarse una restricción de forma controlada y justificada (ej. el service role hace bypass de RLS para tareas administrativas). |
| **Anon key (llave anónima)** | La llave pública que usa el sistema para hablar con Supabase respetando siempre las reglas de RLS — la que usa cualquier usuario normal. |
| **Hash (MD5, etc.)** | Una "huella digital" irreversible que se genera a partir de un dato (ej. se usa un hash para saber si un alumno ya votó en una evaluación docente, sin poder rastrear qué votó exactamente). |
| **Anonimato verificable** | Que un sistema pueda comprobar que nadie votó dos veces, sin que nadie —ni siquiera el administrador— pueda saber qué votó cada persona. |
| **Magic link** | Un enlace especial enviado por correo que permite iniciar sesión o restablecer la contraseña sin necesidad de escribirla, válido solo por un tiempo limitado. |
| **Signed URL (URL firmada)** | Un enlace temporal y seguro para descargar un archivo privado (como una foto o PDF), que deja de funcionar después de cierto tiempo (en este sistema, 1 hora). |
| **Auditoría** | Un registro de quién hizo qué acción y cuándo dentro del sistema, para poder revisar el historial si algo se necesita investigar. |
| **CRON_SECRET** | Una clave secreta que usan los procesos automáticos internos del sistema para identificarse entre sí, evitando que alguien externo los ejecute sin permiso. |

---

## 4. Infraestructura, despliegue y funcionamiento técnico

| Término | Definición |
|---|---|
| **Hosting** | El servicio donde "vive" el sitio web y queda accesible por internet las 24 horas. |
| **Vercel** | La plataforma de hosting que aloja este sistema y lo actualiza automáticamente cada vez que se sube un cambio nuevo. |
| **Deploy / Despliegue** | El proceso de publicar una nueva versión del sistema para que quede disponible en internet. |
| **Producción** | La versión del sistema que está publicada y en uso real (a diferencia de una versión de prueba en la computadora del desarrollador). |
| **Repositorio (repo)** | El lugar donde se guarda y se lleva el historial de todo el código del sistema (en este caso, en GitHub). |
| **GitHub** | El servicio donde se almacena el código fuente del sistema y su historial de cambios. |
| **Git / Commit / Push** | Git es la herramienta que registra el historial de cambios del código; un "commit" es un cambio guardado con una descripción; un "push" es subir esos cambios al repositorio. |
| **Variables de entorno** | Datos de configuración sensibles (claves, contraseñas, URLs) que se guardan fuera del código, para no exponerlos públicamente. |
| **`.env` / `.env.local`** | El archivo donde se guardan las variables de entorno en la computadora de desarrollo (nunca se sube a GitHub por seguridad). |
| **API** | Una "puerta" por la que un sistema recibe peticiones y devuelve información, generalmente usada para conectar dos sistemas entre sí (ej. la API que genera un PDF). |
| **Endpoint** | Una dirección específica de una API a la que se le puede pedir algo concreto (ej. `/api/kardex/[alumnoId]` genera el kardex de un alumno). |
| **Route handler** | El código que atiende una petición hecha a un endpoint. |
| **Runtime (`nodejs`)** | El entorno en el que se ejecuta cierto código del servidor — se especifica cuando una tarea (como generar un PDF) necesita más capacidad de la que corre normalmente en el navegador. |
| **Cron / Cron job** | Una tarea que el sistema ejecuta automáticamente en un horario fijo, sin que nadie tenga que hacerla manualmente (ej. todos los días a las 6 AM se calcula el riesgo académico de los alumnos). |
| **PWA (Progressive Web App)** | Una configuración que permite que el sitio web se pueda "instalar" en el teléfono como si fuera una aplicación normal, con ícono en la pantalla de inicio. |
| **Service Worker** | Un pequeño programa que corre en segundo plano en el navegador y permite que la PWA funcione, entre otras cosas, sin conexión a internet (de forma limitada). |
| **Manifest (manifest.json)** | El archivo de configuración que le dice al navegador cómo debe verse la app cuando se instala (nombre, ícono, colores). |
| **CDN** | Una red de servidores distribuidos que entregan archivos (como una librería externa) más rápido, sin tener que instalarlos localmente. |

---

## 5. Patrones de programación usados en el proyecto

| Término | Definición |
|---|---|
| **Server Action** | Una función especial de Next.js que permite que un formulario en el navegador ejecute código directamente en el servidor (por ejemplo, guardar una calificación) sin tener que armar una API aparte. |
| **`revalidatePath()`** | Una instrucción que le dice al sistema "actualiza esta página con los datos más recientes" después de guardar un cambio. |
| **Payload** | El conjunto de datos que se envía o recibe en una operación (ej. todos los campos que se mandan al crear un alumno nuevo). |
| **Props** | La información que un componente de React recibe desde "afuera" para saber qué mostrar (ej. el nombre del alumno que debe mostrar una tarjeta). |
| **State (estado)** | La información que un componente "recuerda" mientras el usuario interactúa con él (ej. si un menú está abierto o cerrado). |
| **Slug** | La parte de una URL que identifica un contenido específico de forma legible (ej. en `/publico/noticias/nueva-beca-2026`, "nueva-beca-2026" es el slug). |
| **CMS (Content Management System / Sistema de gestión de contenido)** | La parte del panel de administración donde el personal puede editar textos, noticias, imágenes, etc. sin tocar código. |
| **Dashboard** | La pantalla principal de resumen que ve cada usuario al entrar, con las estadísticas y accesos más importantes para su rol. |
| **Sidebar** | El menú lateral fijo desde donde se navega entre las secciones del sistema. |
| **Topbar** | La barra superior de la pantalla con el saludo, notificaciones y acceso al perfil. |
| **Badge** | Una pequeña etiqueta visual, normalmente con un número o color, que indica un estado (ej. "3" en la campana de notificaciones no leídas). |
| **Toggle** | Un interruptor de encendido/apagado en un formulario (ej. activar o desactivar que un aviso sea obligatorio). |
| **Drag & drop** | Arrastrar un archivo con el mouse y soltarlo en una zona de la pantalla para subirlo, en vez de usar el botón tradicional de "Examinar archivo". |

---

## 6. Documentos, PDFs y exportación de datos

| Término | Definición |
|---|---|
| **PDF server-side** | Un PDF que se genera directamente en el servidor (no en la computadora del usuario), lo que lo hace más consistente y seguro. |
| **`@react-pdf/renderer`** | La herramienta que usa el sistema para construir los documentos PDF (boletas, kardex, constancias). |
| **Kardex** | Documento con el historial académico completo de un alumno, desde que ingresó hasta la fecha. |
| **Boleta** | Documento con las calificaciones del ciclo escolar en curso. |
| **Constancia de servicio** | Documento oficial que certifica la carga horaria (materias y horas) que imparte un profesor. |
| **Comprobante de pago** | Documento que certifica que un pago fue registrado, con folio, monto y fecha. |
| **CSV** | Un formato de archivo de texto simple para tablas de datos (como un Excel simplificado), usado para importar o exportar información masivamente. |
| **XLSX** | El formato de archivo de Excel, usado para plantillas de carga masiva y exportes de reportes. |
| **iCalendar (ICS)** | Un formato estándar de archivo de calendario que permite importar los eventos institucionales a apps como Google Calendar u Outlook. |

---

## 7. Términos institucionales y académicos (del glosario propio del manual)

| Término | Definición |
|---|---|
| **EPO 221** | Escuela Preparatoria Oficial No. 221 "Nicolás Bravo". |
| **CCT** | Clave de Centro de Trabajo — el identificador oficial de la escuela ante la SEP (en este caso, `15EBH0409B`). |
| **SEIEM** | Servicios Educativos Integrados al Estado de México — la instancia estatal que regula y da seguimiento a la escuela. |
| **BG** | Bachillerato General — el tipo de plan de estudios que ofrece la escuela. |
| **Parcial** | Cada uno de los tres periodos de evaluación en los que se divide un semestre. |
| **Extraordinario** | Examen especial para acreditar una materia que fue reprobada en el semestre. |
| **Orientador** | Un docente designado como responsable de acompañar académica y disciplinariamente a un grupo específico. |
| **Tutor** | El padre, madre o responsable legal del alumno, con quien el sistema se comunica para temas académicos y de riesgo. |
| **Asignación** | La combinación única de una materia + un grupo + un profesor + un ciclo escolar — es la unidad sobre la que giran tareas, exámenes y calificaciones. |
| **Inscripción** | El registro que vincula a un alumno con un grupo durante un ciclo escolar específico. |
| **Ciclo escolar** | El periodo lectivo completo (ej. "2025-2026"), del cual solo uno puede estar activo a la vez. |
| **Generación** | El grupo de alumnos que ingresaron juntos a la escuela (cohorte), ej. "2025-2028". |
| **Campo disciplinar** | Una de las grandes áreas del plan curricular nacional (Matemáticas, Ciencias Sociales, Ciencias Experimentales, etc.) a la que pertenece cada materia. |
| **Planeación didáctica** | El plan de clase que cada docente entrega por parcial, describiendo qué y cómo va a enseñar. |
| **Solicitud de revisión** | La petición formal de un alumno para que se revise una calificación con la que no está de acuerdo. |
| **Reconocimiento** | Una mención positiva que un docente otorga a un alumno destacado, visible en su kardex. |
| **Reporte de conducta** | Un registro (positivo o negativo) sobre el comportamiento de un alumno, gestionado entre el docente y el orientador. |
| **Riesgo académico** | Una clasificación automática (bajo/medio/alto/crítico) que el sistema calcula para detectar alumnos que podrían necesitar apoyo. |
| **Score de riesgo** | El puntaje numérico (0 a 100) que determina el nivel de riesgo de un alumno, calculado por un proceso automático diario. |

---

## 8. Siglas y acrónimos técnicos usados en el manual

| Sigla | Significado |
|---|---|
| **CRUD** | Crear, Leer, Actualizar, Borrar (Create, Read, Update, Delete) |
| **RLS** | Row Level Security (Seguridad a nivel de fila) |
| **PK / FK** | Primary Key / Foreign Key (llave primaria / llave foránea) |
| **UUID** | Universally Unique Identifier (identificador único universal) |
| **API** | Application Programming Interface (interfaz de programación de aplicaciones) |
| **CDN** | Content Delivery Network (red de entrega de contenido) |
| **PWA** | Progressive Web App (aplicación web progresiva) |
| **CMS** | Content Management System (sistema de gestión de contenido) |
| **PITR** | Point-In-Time Recovery (recuperación a un punto específico en el tiempo) |
| **ICS** | iCalendar (formato estándar de archivos de calendario) |
| **CSV** | Comma-Separated Values (valores separados por comas) |
| **XLSX** | Formato de archivo de Microsoft Excel |
| **JSONB** | JSON Binary — formato de datos flexible almacenado en la base de datos |
| **RPC** | Remote Procedure Call (llamada a un procedimiento remoto — en este caso, una función guardada en la base de datos) |

---

*Documento generado a partir de `README.md` y `MANUAL_COMPLETO.md` del repositorio del Sistema EPO 221.*
