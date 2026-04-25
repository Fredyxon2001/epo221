# Bitácora de desarrollo — Sistema Escolar EPO 221 "Nicolás Bravo"

**Periodo cubierto:** Abril 2026
**Plantel:** Escuela Preparatoria Oficial No. 221 "Nicolás Bravo" — Tecamachalco, Puebla
**CCT:** 15EBH0409B
**Repositorio:** https://github.com/Fredyxon2001/epo221
**URL producción:** https://epo221.vercel.app
**Stack:** Next.js 14 (App Router) + Supabase (PostgreSQL + Storage + Auth) + Tailwind CSS + react-pdf
**Proyecto Supabase ID:** `hvycaqghrkvspkzouape`
**Proyecto Vercel:** `nicolas-bravo-221epo`

---

## Tabla de contenido

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura general](#2-arquitectura-general)
3. [Bloque 1 — Cimientos (previo)](#3-bloque-1--cimientos-previo)
4. [Bloque 2 — Tareas, Kardex, Portafolio, Extraordinarios](#4-bloque-2--tareas-kardex-portafolio-extraordinarios)
5. [Bloque 3 — Exámenes, Chat grupal, Tutorías](#5-bloque-3--exámenes-chat-grupal-tutorías)
6. [Bloque 4 — Evaluación docente, Constancia, Planeaciones](#6-bloque-4--evaluación-docente-constancia-planeaciones)
7. [Bloque 5 — Detección de riesgo + Correos a tutores](#7-bloque-5--detección-de-riesgo--correos-a-tutores)
8. [Mejoras transversales — Conversación en solicitudes](#8-mejoras-transversales--conversación-en-solicitudes)
9. [Migraciones de base de datos aplicadas](#9-migraciones-de-base-de-datos-aplicadas)
10. [Buckets de storage](#10-buckets-de-storage)
11. [Crons y tareas programadas](#11-crons-y-tareas-programadas)
12. [Variables de entorno](#12-variables-de-entorno)
13. [Roles, permisos y RLS](#13-roles-permisos-y-rls)
14. [Módulos por rol](#14-módulos-por-rol)
15. [Estructura del proyecto](#15-estructura-del-proyecto)
16. [Despliegue](#16-despliegue)
17. [Operación y mantenimiento](#17-operación-y-mantenimiento)
18. [Pendientes y próximos pasos](#18-pendientes-y-próximos-pasos)

---

## 1. Resumen ejecutivo

Durante este mes se construyó e integró un sistema escolar institucional completo para la **EPO 221**, desplegado en producción y operativo en `epo221.vercel.app`. El sistema cubre las cuatro audiencias principales del plantel — **dirección/administración, docentes, alumnos y tutores** — con módulos académicos, administrativos, de comunicación y de retroalimentación.

### Bloques entregados

| Bloque | Tema | Estado |
|---|---|---|
| 1 | Auth, password reset, PWA, calendario, avisos, conducta | ✅ Producción |
| 2 | Tareas en línea, kardex PDF, portafolio, recuperación/extraordinarios | ✅ Producción |
| 3 | Exámenes en línea, chat grupal, directorio tutores, agenda tutorías | ✅ Producción |
| 4 | Evaluación docente anónima, constancia de servicio, planeación con versionado | ✅ Producción |
| 5 | Detección temprana de riesgo, resumen semanal por correo a tutores | ✅ Producción |
| Extra | Conversación con archivos en solicitudes de revisión | ✅ Producción |

### Métricas del trabajo

- **Tablas nuevas creadas:** 14 (eval_docente_periodos, eval_docente_respuestas, planeaciones, riesgo_snapshots, correo_log, examenes, examen_preguntas, examen_intentos, examen_respuestas, chat_grupal_mensajes, tutorias_horarios, tutorias_citas, solicitudes_mensajes, además de tareas/entregas_tarea/portafolio del Bloque 2 cuando no existían).
- **Buckets de storage configurados:** 5 (tareas, planeaciones, chat-grupal, portafolio, solicitudes — algunos preexistentes, otros nuevos).
- **Migraciones SQL aplicadas:** 4 grandes (bloque3_examenes_chat_tutorias, bloque3_storage_buckets, bloque4_eval_docente_planeacion, bloque5_riesgo_y_correos, solicitudes_mensajes_thread).
- **Funciones RPC con SECURITY DEFINER:** 1 (`eval_docente_agregado` para anonimato de evaluación docente).
- **Crons programados en Vercel:** 2 (calcular-riesgo diario, resumen-semanal lunes).
- **Rutas nuevas Next.js:** ~60+ páginas y route handlers.

---

## 2. Arquitectura general

### Capas

```
┌──────────────────────────────────────────────────────┐
│  Cliente (navegador / PWA)                           │
│  - Componentes React (server + client)               │
│  - Tailwind para estilo institucional verde/dorado   │
│  - Service Worker (PWA) para offline básico          │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│  Next.js 14 App Router (Vercel)                      │
│  - Server Components (queries directas a Supabase)   │
│  - Server Actions (mutaciones)                       │
│  - Route Handlers /api/* (PDFs, crons, descargas)    │
│  - Middleware (auth check + redirect)                │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│  Supabase                                            │
│  - PostgreSQL con RLS exhaustivo                     │
│  - Storage (5 buckets con RLS por path)              │
│  - Auth (email/password + reset por correo)          │
│  - Edge Functions (no usadas; toda la lógica en NJS) │
└──────────────────────────────────────────────────────┘
```

### Patrones principales

- **Server actions con shape `{ ok?, error?, id? }`** — toda mutación devuelve estado para que los formularios cliente muestren mensajes con `useTransition`.
- **`createClient()` (sesión usuaria) vs `adminClient()` (service role)** — uso del segundo solo cuando se necesita bypass de RLS (uploads, crons, notificaciones cruzadas).
- **Storage path convention**: `<entity_id>/<uuid>.<ext>` con RLS basada en `split_part(name, '/', 1)` — alumno solo ve lo suyo, profesor ve lo de sus asignaciones.
- **Notificaciones**: `INSERT INTO notificaciones` desde cualquier action que cambie estado relevante para otro usuario; el Topbar las consume vía `getNotificaciones()`.
- **PDFs**: render lado servidor con `@react-pdf/renderer` en route handlers `/api/...` con `runtime: 'nodejs'` y `dynamic: 'force-dynamic'`.

---

## 3. Bloque 1 — Cimientos (previo)

Este bloque ya existía al inicio del mes; se documenta para contexto.

### Funcionalidades

- **Autenticación**: registro, login, password reset por correo (Supabase Auth).
- **PWA**: `manifest.json`, service worker básico, instalable en móvil.
- **Avisos**: anuncios institucionales con confirmación de lectura.
- **Calendario**: eventos institucionales filtrables por rol.
- **Reportes de conducta**: bandeja para profesor (reportar) y orientador (atender).

### Tablas claves preexistentes

`perfiles`, `alumnos`, `profesores`, `grupos`, `materias`, `asignaciones`, `inscripciones`, `calificaciones`, `ciclos_escolares`, `parciales`, `avisos`, `confirmaciones_avisos`, `eventos_calendario`, `reportes_conducta`, `notificaciones`, `mensajes_hilos`, `mensajes`, `solicitudes_revision`, `pagos`, `conceptos_pago`, `sitio_config`.

---

## 4. Bloque 2 — Tareas, Kardex, Portafolio, Extraordinarios

### 4.1 Tareas en línea

Permite al docente publicar tareas con fecha límite y al alumno entregar archivos.

**Tablas:** `tareas`, `entregas_tarea`
**Bucket:** `tareas` con RLS por path `<asignacion_id>/...`

**Profesor:**
- `/profesor/tareas` — listado de tareas creadas
- `/profesor/tareas/nueva` — formulario con título, instrucciones, parcial, puntos, permite archivos, fecha apertura/entrega, cierra estricto, rúbrica opcional
- `/profesor/tareas/[id]` — detalle con lista de entregas, calificación inline por alumno

**Alumno:**
- `/alumno/tareas` — tareas activas con badge de "entregada/pendiente"
- `/alumno/tareas/[id]` — detalle + formulario de entrega (`EntregarTareaForm`) que sube archivo al bucket
- Validaciones: si `cierra_estricto = true` y la fecha pasó → bloquea

**Notificaciones:**
- Al crear tarea → notifica a todos los alumnos del grupo
- Al entregar → notifica al docente
- Al calificar → notifica al alumno

**Archivos:** `src/app/profesor/tareas/{actions.ts, page.tsx, nueva/page.tsx, nueva/NuevaTareaForm.tsx, [id]/page.tsx, [id]/CalificarEntregaForm.tsx}` y simétrico en alumno.

### 4.2 Kardex PDF

Documento institucional con historial académico completo del alumno.

**Componente:** `src/lib/pdf/Kardex.tsx`
**Endpoint:** `/api/kardex/[alumnoId]` — protegido por sesión + permiso (admin/staff/director ven cualquiera; alumno solo el propio).

**Contenido del PDF:**
- Encabezado institucional con CCT y branding verde/dorado
- Datos del alumno (nombre, CURP, matrícula, generación, contacto, tutor)
- Sección por ciclo · semestre con tabla de asignaturas (P1, P2, P3, Ext1, Ext2, Final)
- Resumen de promedio general, materias aprobadas, % de avance, reconocimientos, reportes de conducta
- Historial de conducta (últimos 15 reportes)
- Firma de Control Escolar y Dirección
- Footer fijo con paginación

### 4.3 Portafolio de evidencias

Repositorio de evidencias del alumno (proyectos, trabajos destacados) que el docente puede comentar.

**Tabla:** `portafolio_evidencias`
**Bucket:** `portafolio`

**Alumno:**
- `/alumno/portafolio` — galería de sus evidencias
- Formulario `SubirEvidenciaForm` con título, descripción, asignatura, archivo
- Botón de eliminar propia evidencia

**Profesor:**
- `/profesor/portafolio` — evidencias de sus alumnos por grupo
- `ComentarEvidenciaForm` para feedback escrito

### 4.4 Recuperación y Extraordinarios

Flujo formal de solicitud → aprobación → registro de calificación de extraordinario.

**Alumno:**
- `/alumno/extraordinarios` — lista de sus solicitudes con estado
- `SolicitarExtraordinarioForm` — escoge materia con calificación final < 6, motivo, ciclo

**Admin:**
- `/admin/extraordinarios` — bandeja de solicitudes pendientes
- `ProcesarExtraordinarioForm` — aprueba/rechaza, asigna folio (E1/E2), registra calificación final

---

## 5. Bloque 3 — Exámenes, Chat grupal, Tutorías

### 5.1 Exámenes en línea

Sistema completo de exámenes con preguntas cerradas (auto-calificadas) y abiertas (calificación manual).

**Tablas creadas (migración `bloque3_examenes_chat_tutorias`):**
- `examenes` (id, asignacion_id, titulo, instrucciones, fecha_apertura, fecha_cierre, duracion_min, intentos_permitidos, total_puntos)
- `examen_preguntas` (examen_id, tipo: opcion_multiple|verdadero_falso|abierta, enunciado, opciones jsonb, respuesta_correcta, puntos)
- `examen_intentos` (examen_id, alumno_id, iniciado_at, entregado_at, tiempo_restante_seg, calificacion, estado: en_curso|entregado|calificado)
- `examen_respuestas` (intento_id, pregunta_id, respuesta, puntos_obtenidos)

**Profesor:**
- `/profesor/examenes` — listado con conteo de intentos
- `/profesor/examenes/nuevo` — crear examen base
- `/profesor/examenes/[id]` — agregar preguntas (form dinámico que cambia según tipo), eliminar, calificar respuestas abiertas

**Alumno:**
- `/alumno/examenes` — exámenes disponibles del periodo
- `/alumno/examenes/[id]` — `PresentarExamen.tsx`:
  - Inicia intento, guarda hora de inicio
  - **Countdown timer** que persiste tiempo restante en BD cada 30 seg
  - Auto-guarda cada respuesta en cuanto el alumno selecciona/escribe
  - Auto-entrega cuando el countdown llega a 0
  - Al entregar, calificación automática de cerradas; abiertas quedan en pending

### 5.2 Chat grupal por asignación

Mensajería tipo grupo de WhatsApp dentro de cada asignación (todos los del grupo + el docente).

**Tabla:** `chat_grupal_mensajes` (asignacion_id, autor_id, autor_tipo, texto, adjunto_url/nombre/tipo, created_at)
**Bucket:** `chat-grupal`

**Componente reutilizable:** `src/components/chat/ChatGrupal.tsx` (renderiza burbujas) + `ChatGrupalForm.tsx` (input + adjuntar)

**Acceso:**
- `/profesor/chat` — listado de sus asignaciones
- `/profesor/chat/[asignacionId]` — chat
- `/alumno/chat` — listado de chats de sus grupos
- `/alumno/chat/[asignacionId]` — chat

### 5.3 Directorio de tutores con WhatsApp

Vista para que el docente contacte fácilmente a tutores de sus alumnos.

**Ruta:** `/profesor/tutores`
**Funcionalidad:**
- Lista alumnos de sus grupos con datos de tutor (nombre, parentesco, teléfono, email)
- **Botón WhatsApp** que arma `https://wa.me/52<10digitos>?text=...` con plantilla
- Botones `tel:` y `mailto:` directos
- Filtro por grupo

### 5.4 Agenda de tutorías

Sistema de horarios fijos del docente + citas que el alumno puede solicitar.

**Tablas:** `tutorias_horarios` (profesor_id, dia_semana, hora_inicio, hora_fin, sala, recurrente), `tutorias_citas` (horario_id, alumno_id, fecha, motivo, estado)

**Profesor:**
- `/profesor/tutorias` — define horarios disponibles + ve citas solicitadas
- `NuevoHorarioForm`, `EliminarHorarioBtn`, `ProcesarCitaForm` (aceptar/rechazar)

**Alumno:**
- `/alumno/tutorias` — ve horarios disponibles de sus profesores
- `AgendarCitaForm` — solicita cita en horario disponible con motivo

---

## 6. Bloque 4 — Evaluación docente, Constancia, Planeaciones

### 6.1 Evaluación docente anónima

Sistema donde alumnos evalúan a sus profesores en múltiples dimensiones, manteniendo anonimato pero impidiendo doble voto.

**Tablas (migración `bloque4_eval_docente_planeacion`):**

```sql
eval_docente_periodos (
  id, ciclo_id, nombre, instrucciones,
  abierta_desde, abierta_hasta,
  dimensiones jsonb,  -- [{clave, texto}]
  escala_max int (default 5),
  activa, created_by
)

eval_docente_respuestas (
  id, periodo_id, asignacion_id,
  alumno_hash text NOT NULL,  -- MD5 anónimo
  respuestas jsonb,
  comentario text,
  UNIQUE(periodo_id, asignacion_id, alumno_hash)
)
```

**Mecanismo de anonimato:**
- El alumno_hash se calcula como `md5("${alumno_id}::${periodo_id}::${asignacion_id}")` en el server action
- La constraint UNIQUE impide que el mismo alumno evalúe dos veces la misma asignación en el mismo periodo
- En la BD nadie puede ver quién votó qué — solo el hash

**RPC con SECURITY DEFINER:** `eval_docente_agregado(p_profesor_id, p_periodo_id)` — devuelve por asignación: materia, grupo, total respuestas, promedios jsonb por dimensión, comentarios array. Bypassa RLS de forma segura porque solo agrega.

**Admin** (`/admin/eval-docente`):
- `NuevoPeriodoForm` con preset de 7 dimensiones por defecto (dominio, claridad, puntualidad, respeto, retroalimentación, recursos, evaluación)
- Lista de periodos con conteo de respuestas + botón cerrar

**Alumno** (`/alumno/eval-docente`):
- Lista periodos abiertos
- Por cada (periodo × asignación) renderiza `ResponderEvalForm` con radios estilo píldora 1..N
- Detecta evaluaciones ya respondidas vía hash y oculta el form

**Profesor** (`/profesor/eval-docente`):
- Llama al RPC y muestra promedios por materia/grupo
- Comentarios anónimos en cajitas con borde verde a la izquierda

### 6.2 Constancia de servicio

PDF oficial con la carga horaria del docente para trámites administrativos.

**Componente:** `src/lib/pdf/ConstanciaServicio.tsx`
**Endpoint:** `/api/constancia/[profesorId]?ciclo_id=...` — protegido (propio docente o admin/staff/director)

**Contenido del PDF:**
- Encabezado institucional + folio único `CS-<RFC>-<YYYY>`
- Cuerpo formal: "HACE CONSTAR que el/la C. ..."
- Tabla con asignaturas, grupo, horas/semana
- Cálculo: horas/semana ≈ `Math.round(horas_semestrales / 18)`
- Total de horas semanales
- Espacios para firma de Director y Control Escolar

**Página:** `/profesor/constancia` — lista ciclos disponibles con botón "📄 Descargar PDF" por cada uno

### 6.3 Planeación didáctica con versionado

Flujo de subida-revisión-aprobación de planeaciones, con versión incremental por (asignación × parcial).

**Tabla:**
```sql
planeaciones (
  id, asignacion_id, parcial, titulo, contenido,
  archivo_url, archivo_nombre,
  version int (auto-increment lógico),
  estado text CHECK (estado IN ('borrador','enviada','aprobada','rechazada')),
  observaciones_revisor, revisada_por,
  created_at, updated_at,
  UNIQUE(asignacion_id, parcial, version)
)
```

**Bucket:** `planeaciones` (50 MB max)

**Profesor** (`/profesor/planeaciones`):
- `NuevaPlaneacionForm` — selecciona asignación, parcial 1-3, título, contenido (textarea), archivo opcional, checkbox "enviar a revisión" (si no, queda borrador)
- Acción `guardarPlaneacion` calcula `version = max(version) + 1` por (asignación, parcial)
- Historial con badges de estado (gris/ámbar/verde/rosa) y botón descarga firmada
- No se pueden borrar planeaciones aprobadas

**Admin** (`/admin/planeaciones`):
- Filtros por estado (enviada por defecto)
- `RevisarPlaneacionForm` — observaciones + botones "✅ Aprobar" / "❌ Rechazar"
- Notifica al docente vía tabla `notificaciones`

---

## 7. Bloque 5 — Detección de riesgo + Correos a tutores

### 7.1 Motor de detección temprana de riesgo

Sistema **rule-based determinista** (sin LLM) que combina factores medibles en un score 0-100 con razones explicables.

**Tablas (migración `bloque5_riesgo_y_correos`):**

```sql
riesgo_snapshots (
  id, alumno_id, ciclo_id,
  score smallint CHECK (BETWEEN 0 AND 100),
  nivel CHECK (IN ('bajo','medio','alto','critico')),
  factores jsonb,        -- [{clave, etiqueta, peso, detalle}]
  recomendacion text,
  generado_por text,     -- 'cron_reglas' | 'manual_admin'
  created_at
)

correo_log (
  id, tipo, destinatario, asunto,
  referencia_id, estado CHECK (IN ('enviado','error','skipped')),
  error, created_at
)
```

**Motor** (`src/lib/riesgo/score.ts`) — combina 5 factores:

| Factor | Detección | Peso |
|---|---|---|
| Reprobadas | `promedio_final < 6` en alguna materia | hasta 40 (15 c/u) |
| Parcial bajo | algún parcial < 6 (alerta temprana) | hasta 20 (7 c/u) |
| Faltas críticas | total > 20 | 25 |
| Faltas altas | total entre 11-20 | 12 |
| Conducta reiterada | ≥3 reportes negativos en 60 días | 15 |
| Conducta leve | 1-2 reportes negativos en 60 días | 6 |
| Tareas incompletas | <60% de entregas | 15 |
| Adeudo financiero | ≥2 pagos pendientes | 8 |

**Niveles por score:**
- 0-24: **bajo** (sin acción urgente)
- 25-49: **medio** (seguimiento)
- 50-74: **alto** (intervención)
- 75-100: **crítico** (intervención urgente)

**Recomendación generada** combina las acciones según factores presentes (canalizar a tutoría, citar tutor, intervención de orientación, plan de pagos, etc.)

### 7.2 Cron `/api/cron/calcular-riesgo`

- **Schedule:** diario 6:00 AM (`0 6 * * *` en `vercel.json`)
- **Auth:** `Authorization: Bearer ${CRON_SECRET}`
- **Comportamiento:**
  1. Obtiene ciclo activo
  2. Llama `calcularRiesgoCiclo()` para todos los alumnos inscritos
  3. Inserta snapshots en `riesgo_snapshots`
  4. Para alumnos en nivel `critico`: agrupa por orientador del grupo y notifica con `🚨 N alumno(s) requieren intervención urgente`

**Acción manual:** `/admin/riesgo` con botón "🔄 Recalcular ahora" para forzar recomputo sin esperar al cron.

### 7.3 Dashboard de riesgo

Ruta: `/admin/riesgo?nivel=critico|alto|medio|bajo|todos`

- Tarjetas con distribución total por nivel
- Filtros pestaña
- Tabla de alumnos ordenada por score descendente con:
  - Nombre + matrícula + tutor
  - Badge de nivel y score
  - Chips por factor (etiqueta + peso, hover muestra detalle)
  - Recomendación generada en cursiva

### 7.4 Correo transaccional con Resend

**Módulo:** `src/lib/email/send.ts`
**Función:** `enviarCorreo({ tipo, destinatario, asunto, html, texto?, referencia_id? })`

**Comportamiento:**
- Si **NO** hay `RESEND_API_KEY` configurada → registra como `skipped` en `correo_log` (modo dry-run, ideal para pruebas sin gastar)
- Detecta duplicados en últimos 7 días para el mismo `tipo`+`destinatario` → marca `skipped` con error `duplicate_within_week`
- Si Resend devuelve error → registra `error` con mensaje
- Plantilla HTML institucional `envolverEmailHtml({ titulo, cuerpo, ctaLabel?, ctaUrl? })` con branding verde/dorado

### 7.5 Cron `/api/cron/resumen-semanal`

- **Schedule:** lunes 14:00 (`0 14 * * 1`)
- **Auth:** mismo CRON_SECRET
- **Comportamiento:**
  1. Toma todos los alumnos con `tutor_email` no nulo
  2. Por cada alumno calcula:
     - Promedio ponderado de calificaciones del ciclo
     - Faltas acumuladas
     - Reportes de conducta últimas 2 semanas
     - Snapshot de riesgo más reciente (últimos 14 días)
  3. Construye HTML personalizado con:
     - Saludo al tutor
     - Indicador de riesgo coloreado por nivel
     - 3 stat cards (promedio, faltas, materias)
     - Tabla de calificaciones por materia (P1, P2, P3, Final con rojo si <6)
     - Lista de incidencias de conducta recientes
  4. Envía vía Resend (o queda skipped sin API key)

### 7.6 Bitácora de correos

Ruta: `/admin/correos`
- Tarjetas con conteos enviado/error/skipped
- Tabla de últimos 200 envíos con fecha, tipo, destinatario, asunto, estado, error

---

## 8. Mejoras transversales — Conversación en solicitudes

Después del despliegue de los 5 bloques se detectó que en `solicitudes_revision` los usuarios solo podían intercambiar 1 mensaje (motivo + respuesta) y luego no podían continuar la conversación ni cerrar.

**Migración:** `solicitudes_mensajes_thread`

```sql
solicitudes_mensajes (
  id, solicitud_id, autor_id, autor_tipo,
  texto, adjunto_url/nombre/tipo/tamano,
  created_at
)
```

**RLS:**
- **Read:** alumno dueño + profesor de la asignación + admin/staff/director
- **Insert:** mismo set, pero solo si la solicitud NO está cerrada

**Acciones (`src/app/solicitudes/thread-actions.ts`):**
- `enviarMensajeSolicitud(fd)` — sube archivo opcional al bucket `solicitudes` vía adminClient, inserta mensaje, actualiza `estado` (alumno → `abierta`, profesor → `respondida`), notifica a la contraparte
- `cerrarSolicitudThread(fd)` — cualquier rol puede cerrar
- `reabrirSolicitudThread(fd)` — cualquier rol puede reabrir

**Componente:** `src/components/solicitudes/Conversacion.tsx`
- Renderiza burbujas tipo chat (mías a la derecha verde, otras a la izquierda blanco)
- Caja de texto + input file (15 MB max)
- Botones "✉️ Enviar" + "🔒 Cerrar"
- Si está cerrada muestra estado + botón "🔓 Reabrir"

**Integración:** `/alumno/solicitudes` y `/profesor/solicitudes` muestran la conversación bajo el motivo/respuesta originales.

---

## 9. Migraciones de base de datos aplicadas

Todas se aplicaron vía MCP de Supabase al proyecto `hvycaqghrkvspkzouape`.

### 9.1 `bloque3_examenes_chat_tutorias`

Crea: `examenes`, `examen_preguntas`, `examen_intentos`, `examen_respuestas`, `chat_grupal_mensajes`, `tutorias_horarios`, `tutorias_citas`. Activa RLS con políticas por rol.

### 9.2 `bloque3_storage_buckets`

Crea bucket `chat-grupal` con RLS por path basada en `split_part(name, '/', 1) = asignacion_id`.

### 9.3 `bloque4_eval_docente_planeacion`

Crea: `eval_docente_periodos`, `eval_docente_respuestas`, `planeaciones`. Crea bucket `planeaciones` (50 MB). Crea función SECURITY DEFINER `eval_docente_agregado`.

### 9.4 `bloque5_riesgo_y_correos`

Crea: `riesgo_snapshots`, `correo_log`. Índices para query por nivel y por fecha.

### 9.5 `solicitudes_mensajes_thread`

Crea: `solicitudes_mensajes` con RLS de lectura/escritura.

---

## 10. Buckets de storage

| Bucket | Path convention | Usado en |
|---|---|---|
| `tareas` | `<asignacion_id>/<uuid>.<ext>` | Entregas de tareas |
| `solicitudes` | `<solicitud_id>/<uuid>.<ext>` | Adjuntos de solicitudes y mensajes de conversación |
| `portafolio` | `<alumno_id>/<uuid>.<ext>` | Evidencias |
| `chat-grupal` | `<asignacion_id>/<uuid>.<ext>` | Adjuntos en chat grupal |
| `planeaciones` | `<asignacion_id>/<uuid>.<ext>` | Planeaciones didácticas |

Todos usan `createSignedUrl()` con TTL de 1 hora cuando se renderiza, y `adminClient()` para uploads (bypassa RLS de forma controlada en server actions).

---

## 11. Crons y tareas programadas

Configurados en `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/calcular-riesgo", "schedule": "0 6 * * *" },
    { "path": "/api/cron/resumen-semanal", "schedule": "0 14 * * 1" }
  ]
}
```

Ambos requieren header `Authorization: Bearer ${CRON_SECRET}` para ejecutar. Vercel agrega ese header automáticamente cuando dispara el cron, usando la variable de entorno `CRON_SECRET` del proyecto.

---

## 12. Variables de entorno

Configuradas en Vercel (Production + Preview + Development):

| Variable | Tipo | Propósito |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | publica | Endpoint Supabase del cliente |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publica | Anon key para queries con RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | secreta | Service role para bypass de RLS en actions |
| `NEXT_PUBLIC_APP_URL` | publica | URL base del sitio |
| `NEXT_PUBLIC_APP_NAME` | publica | Nombre de la app |
| `NEXT_PUBLIC_ESCUELA_CCT` | publica | CCT institucional |
| `CRON_SECRET` | secreta | Auth header para crons |
| `RESEND_API_KEY` | secreta (opcional) | Activa correos reales; sin esto modo dry-run |
| `CORREO_REMITENTE` | publica (opcional) | Ej. `EPO 221 <no-reply@dominio>` |

---

## 13. Roles, permisos y RLS

### Enum `rol_usuario`

`alumno`, `profesor`, `admin`, `staff`, `director`

### Layouts protegen rol

- `/alumno/*` — requiere `getAlumnoActual()` o redirect a `/login`
- `/profesor/*` — requiere `rol IN ('profesor','admin','staff')`
- `/admin/*` — requiere `rol IN ('admin','staff')`
- `/director/*` — requiere `rol = 'director'`

### Patrón RLS común

```sql
-- Lectura: dueño o admin
USING (
  perfil_id = auth.uid()
  OR EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol IN ('admin','staff','director'))
)

-- Escritura: solo dueño con check
WITH CHECK (
  perfil_id = auth.uid()
)
```

Para storage, se usa `split_part(name, '/', 1)` para extraer el `<entity_id>` del path y validar pertenencia.

---

## 14. Módulos por rol

### 14.1 Alumno (`/alumno/*`)

**Académico:**
- Inicio (dashboard con calificaciones, próximas tareas, avisos)
- Mi horario
- Calificaciones (con botón "solicitar revisión")
- Boleta
- Kardex (PDF)
- Tareas
- Exámenes
- Portafolio
- Extraordinarios
- Chat de clase
- Tutorías
- **Evaluar docentes** (Bloque 4)
- Mis solicitudes (con conversación nueva)
- Mensajes
- Avisos
- Calendario

**Administrativo:**
- Estado de cuenta
- Mi ficha

### 14.2 Profesor (`/profesor/*`)

**Docencia:**
- Inicio
- Mis grupos
- Mi horario
- Orientación (si es orientador)
- Alumnos en riesgo
- Reportar conducta
- Bandeja conducta

**Herramientas:**
- Tareas
- Exámenes en línea
- Portafolio
- Rúbricas
- Chat de clase
- Directorio tutores
- Mis tutorías
- **Planeaciones** (Bloque 4)
- **Mi evaluación** (Bloque 4)
- **Constancia de servicio** (Bloque 4)
- Mensajes
- Avisos
- Calendario
- Solicitudes
- Mi perfil

### 14.3 Admin / Staff (`/admin/*`)

**Resumen:** Panel

**Personas:** Alumnos, Profesores

**Académico:** Grupos, Materias, Asignaciones, Horarios, Calificaciones, Ciclos, Parciales, **Planeaciones** (Bloque 4), **Evaluación docente** (Bloque 4)

**Analítica:** Generaciones, Alertas, **Detección de riesgo** (Bloque 5), **Correos a tutores** (Bloque 5)

**Finanzas:** Pagos, Conceptos, Extraordinarios

**Difusión:** Noticias, Convocatorias, Anuncios internos, Avisos con lectura, Calendario, Sitio público

**Sistema:** Auditoría

---

## 15. Estructura del proyecto

```
sistema/
├── src/
│   ├── app/
│   │   ├── alumno/
│   │   │   ├── layout.tsx
│   │   │   ├── tareas/, examenes/, portafolio/, extraordinarios/
│   │   │   ├── chat/, tutorias/
│   │   │   ├── eval-docente/
│   │   │   ├── solicitudes/        ← con conversación nueva
│   │   │   └── ...
│   │   ├── profesor/
│   │   │   ├── layout.tsx
│   │   │   ├── tareas/, examenes/, portafolio/, rubricas/
│   │   │   ├── chat/, tutores/, tutorias/
│   │   │   ├── eval-docente/, planeaciones/, constancia/
│   │   │   ├── solicitudes/        ← con conversación nueva
│   │   │   └── ...
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── extraordinarios/, eval-docente/, planeaciones/
│   │   │   ├── riesgo/, correos/
│   │   │   └── ...
│   │   ├── eval-docente/actions.ts        ← server actions compartidas
│   │   ├── planeaciones/actions.ts        ← server actions compartidas
│   │   ├── solicitudes/thread-actions.ts  ← server actions compartidas
│   │   ├── chat-grupal/actions.ts         ← server actions compartidas
│   │   ├── tutorias/actions.ts            ← server actions compartidas
│   │   └── api/
│   │       ├── kardex/[alumnoId]/route.ts
│   │       ├── boleta/[alumnoId]/route.ts
│   │       ├── constancia/[profesorId]/route.ts   ← Bloque 4
│   │       ├── comprobante/[pagoId]/route.ts
│   │       ├── export/...
│   │       └── cron/
│   │           ├── calcular-riesgo/route.ts        ← Bloque 5
│   │           └── resumen-semanal/route.ts        ← Bloque 5
│   ├── components/
│   │   ├── privado/        (UI compartida: Card, PageHeader, Topbar, etc.)
│   │   ├── chat/ChatGrupal.tsx
│   │   ├── solicitudes/Conversacion.tsx   ← nueva
│   │   └── mensajes/Adjunto.tsx
│   ├── lib/
│   │   ├── supabase/server.ts, admin.ts, browser.ts
│   │   ├── pdf/Kardex.tsx, Boleta.tsx, ConstanciaServicio.tsx ← nueva
│   │   ├── riesgo/score.ts                ← Bloque 5
│   │   ├── email/send.ts                  ← Bloque 5
│   │   ├── queries.ts (helpers DB)
│   │   ├── alertas.ts (motor de alertas institucionales)
│   │   ├── notificaciones.ts
│   │   ├── mensajes.ts
│   │   └── saludo.ts
│   └── middleware.ts
├── supabase/
│   ├── schema.sql, seed.sql, storage.sql, views.sql
│   └── bootstrap_admin.sql
├── vercel.json   ← incluye crons
├── package.json
├── tailwind.config.ts
└── BITACORA_DESARROLLO.md  ← este documento
```

---

## 16. Despliegue

### 16.1 GitHub

- Repo creado: https://github.com/Fredyxon2001/epo221
- Branch principal: `main`
- Inicialización de git en raíz `sistema/` con `.gitignore` que excluye `node_modules/`, `.next/`, `.env*`, `tsconfig.tsbuildinfo`, `playwright-report/`, `.vercel/`
- Primer commit: "Initial commit: EPO 221 sistema escolar completo (Bloques 1-5)"
- Integración Vercel: auto-deploy en cada push a `main`

### 16.2 Vercel

- Proyecto: `nicolas-bravo-221epo`
- Team: `alfredoteran-1742s-projects`
- Producción: `epo221.vercel.app`
- Aliases: `nicolas-bravo-221epo-alfredoteran-1742s-projects.vercel.app`, `…-git-main-…`
- Build automático en push a `main`
- Variables de entorno todas configuradas (incluida `CRON_SECRET` agregada via API)

### 16.3 Flujo de actualización

```bash
cd sistema/
# editar archivos
git add -A
git commit -m "feat: descripcion"
git push origin main
# Vercel detecta y despliega en ~1-2 min
```

---

## 17. Operación y mantenimiento

### 17.1 Monitoreo

- **Logs en vivo:** Vercel → Project → Logs
- **Bitácora de correos:** `/admin/correos`
- **Bitácora de alertas institucionales:** `/admin/alertas`
- **Dashboard de riesgo:** `/admin/riesgo`

### 17.2 Backups

- Supabase realiza backups automáticos (Point-In-Time Recovery 7 días en plan Pro, daily en plan Free)
- Para exportes manuales: `pg_dump` desde el dashboard de Supabase o `/admin/export/...`

### 17.3 Tareas periódicas

| Tarea | Frecuencia | Responsable |
|---|---|---|
| Activar nuevo ciclo escolar | Inicial cada semestre | Admin |
| Crear grupos del ciclo | Inicio de semestre | Admin |
| Subir asignaciones (materia × grupo × profesor) | Inicio de semestre | Admin |
| Inscribir alumnos | Inicio de semestre | Admin |
| Capturar parciales | Mitad y fin de cada parcial | Profesor |
| Abrir periodo de evaluación docente | Una vez por parcial | Admin |
| Revisar planeaciones | Continuo | Admin/Director |
| Revisar dashboard de riesgo | Semanal | Admin/Orientación |

### 17.4 Cómo agregar un nuevo módulo

1. Si requiere tabla → migración vía `mcp__supabase__apply_migration`
2. Si requiere bucket → `apply_migration` con `INSERT INTO storage.buckets` + RLS
3. Crear `actions.ts` en `src/app/<area>/<modulo>/`
4. Crear `page.tsx` con server component
5. Crear forms en client components (`'use client'`)
6. Agregar entrada en el `groups` array del layout correspondiente

---

## 18. Pendientes y próximos pasos

### Operacionales

- ⚠️ **Revocar tokens compartidos en chat** (3 PATs de GitHub + 1 token de Vercel) — pendiente de confirmación
- 📨 **Crear cuenta en Resend.com** y agregar `RESEND_API_KEY` para activar correos reales (sin esto el envío queda como `skipped`)
- 🌐 **Verificar dominio en Resend** para enviar desde `no-reply@epo221.edu.mx` o similar
- 🏷️ **Apuntar dominio propio** (ej. `sistema.epo221.edu.mx`) en Vercel → Settings → Domains

### Funcionales (futuras iteraciones)

- IA generativa para sugerir intervenciones personalizadas en casos críticos (Anthropic API)
- Notificaciones push web (Web Push API)
- App nativa con React Native compartiendo backend Supabase
- Dashboard analítico tipo BI con métricas de aprovechamiento por grupo/generación
- Integración con SAID (Sistema de Administración Institucional Docente del Estado de México)
- Módulo de bibliotecas / préstamo
- Inscripciones en línea con flujo de pago integrado (Stripe / OpenPay)

### Mejoras de UX

- Modo oscuro
- Buscador global (Cmd+K)
- Exportar tablas a Excel desde cualquier listado
- Historial de cambios visible (auditoría) por entidad

---

## Cierre

El sistema cubre todas las operaciones críticas del plantel para el ciclo 2025-2026 y queda listo para uso en producción. La arquitectura modular y las migraciones documentadas permiten incorporar nuevas funcionalidades sin romper lo existente. La detección temprana de riesgo y los correos automáticos a tutores cierran el ciclo de retroalimentación familia-escuela, que era el objetivo institucional principal.

— **Fin del documento**
