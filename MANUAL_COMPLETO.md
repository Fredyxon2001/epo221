# MANUAL COMPLETO — Sistema Escolar EPO 221 "Nicolás Bravo"

> **Versión:** 1.0 · Abril 2026
> **Plantel:** Escuela Preparatoria Oficial No. 221 "Nicolás Bravo"
> **Ubicación:** Tecamachalco, Puebla
> **CCT:** 15EBH0409B
> **URL Producción:** https://epo221.vercel.app
> **Repositorio:** https://github.com/Fredyxon2001/epo221
> **Backend:** Supabase (`hvycaqghrkvspkzouape`)
> **Hosting:** Vercel (`nicolas-bravo-221epo`)

Este documento describe **TODO** el sistema desde su origen hasta el estado actual. Cubre desde el HTML mockup inicial, la subida del logo institucional, la creación del sitio público, la autenticación, la base de datos, cada módulo administrativo/docente/alumno, los PDFs generados, los crons automáticos, la PWA, los manuales operativos por proceso, el despliegue y el mantenimiento.

---

## ÍNDICE GENERAL

### Parte I — Génesis y arquitectura
1. [Origen del proyecto y HTML inicial](#1-origen-del-proyecto-y-html-inicial)
2. [Identidad visual: logos, colores, tipografía](#2-identidad-visual)
3. [Stack tecnológico y decisiones](#3-stack-tecnológico-y-decisiones)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Variables de entorno](#5-variables-de-entorno)

### Parte II — Base de datos completa
6. [Esquema general de la BD](#6-esquema-general-de-la-bd)
7. [Tablas de identidad y personas](#7-tablas-de-identidad-y-personas)
8. [Tablas académicas](#8-tablas-académicas)
9. [Tablas de evaluación y seguimiento](#9-tablas-de-evaluación-y-seguimiento)
10. [Tablas de comunicación](#10-tablas-de-comunicación)
11. [Tablas administrativas](#11-tablas-administrativas)
12. [Tablas de contenido público](#12-tablas-de-contenido-público)
13. [Tablas de los 5 bloques](#13-tablas-de-los-5-bloques)
14. [Vistas materializadas](#14-vistas-materializadas)
15. [Buckets de storage](#15-buckets-de-storage)
16. [Funciones SQL y RPC](#16-funciones-sql-y-rpc)
17. [RLS y seguridad](#17-rls-y-seguridad)

### Parte III — Sitio público (`/publico`)
18. [Página de inicio pública](#18-página-de-inicio-pública)
19. [Navbar y accesibilidad](#19-navbar-y-accesibilidad)
20. [Noticias](#20-noticias)
21. [Convocatorias](#21-convocatorias)
22. [Oferta educativa](#22-oferta-educativa)
23. [Álbumes y galería](#23-álbumes-y-galería)
24. [Páginas dinámicas](#24-páginas-dinámicas)
25. [Descargas](#25-descargas)
26. [Contacto](#26-contacto)

### Parte IV — Autenticación y onboarding
27. [Login](#27-login)
28. [Recuperación de password](#28-recuperación-de-password)
29. [Cambiar password](#29-cambiar-password)
30. [Middleware de protección](#30-middleware-de-protección)
31. [Layouts privados](#31-layouts-privados)

### Parte V — Módulo Administración (`/admin`)
32. [Dashboard admin](#32-dashboard-admin)
33. [Gestión de alumnos](#33-gestión-de-alumnos)
34. [Gestión de profesores](#34-gestión-de-profesores)
35. [Gestión de usuarios y reset de password](#35-gestión-de-usuarios-y-reset-de-password)
36. [Grupos](#36-grupos)
37. [Materias](#37-materias)
38. [Asignaciones](#38-asignaciones)
39. [Horarios](#39-horarios)
40. [Calificaciones](#40-calificaciones)
41. [Ciclos escolares](#41-ciclos-escolares)
42. [Configuración de parciales](#42-configuración-de-parciales)
43. [Planeaciones (revisión)](#43-planeaciones-revisión)
44. [Evaluación docente (gestión)](#44-evaluación-docente-gestión)
45. [Generaciones (analítica)](#45-generaciones-analítica)
46. [Alertas institucionales](#46-alertas-institucionales)
47. [Detección de riesgo](#47-detección-de-riesgo)
48. [Bitácora de correos](#48-bitácora-de-correos)
49. [Pagos](#49-pagos)
50. [Conceptos de pago](#50-conceptos-de-pago)
51. [Extraordinarios (revisión)](#51-extraordinarios-revisión)
52. [Noticias (CMS)](#52-noticias-cms)
53. [Convocatorias (CMS)](#53-convocatorias-cms)
54. [Anuncios internos](#54-anuncios-internos)
55. [Avisos con confirmación](#55-avisos-con-confirmación)
56. [Calendario institucional](#56-calendario-institucional)
57. [Sitio público (CMS)](#57-sitio-público-cms)
58. [Auditoría](#58-auditoría)

### Parte VI — Módulo Docente (`/profesor`)
59. [Dashboard del docente](#59-dashboard-del-docente)
60. [Mis grupos](#60-mis-grupos)
61. [Vista de grupo: asistencia, bitácora, análisis](#61-vista-de-grupo-asistencia-bitácora-análisis)
62. [Reconocimientos y comparativa](#62-reconocimientos-y-comparativa)
63. [Mi horario](#63-mi-horario)
64. [Orientación grupal](#64-orientación-grupal)
65. [Alumnos en riesgo (vista docente)](#65-alumnos-en-riesgo-vista-docente)
66. [Reportar conducta](#66-reportar-conducta)
67. [Bandeja de conducta](#67-bandeja-de-conducta)
68. [Tareas (gestión docente)](#68-tareas-gestión-docente)
69. [Exámenes en línea (creación)](#69-exámenes-en-línea-creación)
70. [Portafolio (revisión)](#70-portafolio-revisión)
71. [Rúbricas](#71-rúbricas)
72. [Chat de clase](#72-chat-de-clase)
73. [Directorio de tutores](#73-directorio-de-tutores)
74. [Mis tutorías](#74-mis-tutorías)
75. [Planeaciones (subida)](#75-planeaciones-subida)
76. [Mi evaluación docente](#76-mi-evaluación-docente)
77. [Constancia de servicio](#77-constancia-de-servicio)
78. [Mensajes (docente)](#78-mensajes-docente)
79. [Avisos (docente)](#79-avisos-docente)
80. [Calendario (docente)](#80-calendario-docente)
81. [Solicitudes de revisión (docente)](#81-solicitudes-de-revisión-docente)
82. [Mi perfil](#82-mi-perfil)

### Parte VII — Módulo Alumno (`/alumno`)
83. [Dashboard del alumno](#83-dashboard-del-alumno)
84. [Mi horario (alumno)](#84-mi-horario-alumno)
85. [Mis calificaciones](#85-mis-calificaciones)
86. [Boleta](#86-boleta)
87. [Kardex (PDF)](#87-kardex-pdf)
88. [Mis tareas](#88-mis-tareas)
89. [Mis exámenes](#89-mis-exámenes)
90. [Portafolio (subida)](#90-portafolio-subida)
91. [Extraordinarios (solicitud)](#91-extraordinarios-solicitud)
92. [Chat de clase (alumno)](#92-chat-de-clase-alumno)
93. [Tutorías (solicitar cita)](#93-tutorías-solicitar-cita)
94. [Evaluar a mis docentes](#94-evaluar-a-mis-docentes)
95. [Mis solicitudes (con conversación)](#95-mis-solicitudes-con-conversación)
96. [Mensajes (alumno)](#96-mensajes-alumno)
97. [Avisos (alumno)](#97-avisos-alumno)
98. [Calendario (alumno)](#98-calendario-alumno)
99. [Estado de cuenta](#99-estado-de-cuenta)
100. [Mi ficha](#100-mi-ficha)

### Parte VIII — Módulo Director (`/director`)
101. [Resumen académico](#101-resumen-académico)
102. [Anuncios oficiales](#102-anuncios-oficiales)
103. [Solicitudes (escalamiento)](#103-solicitudes-escalamiento)

### Parte IX — Sistemas transversales
104. [Notificaciones](#104-notificaciones)
105. [Sistema de mensajes](#105-sistema-de-mensajes)
106. [Avisos institucionales](#106-avisos-institucionales)
107. [Calendario unificado](#107-calendario-unificado)
108. [Adjuntos y archivos](#108-adjuntos-y-archivos)

### Parte X — APIs, PDFs y crons
109. [PDF Boleta](#109-pdf-boleta)
110. [PDF Kardex](#110-pdf-kardex)
111. [PDF Constancia de servicio](#111-pdf-constancia-de-servicio)
112. [PDF Comprobante de pago](#112-pdf-comprobante-de-pago)
113. [API export](#113-api-export)
114. [Cron calcular riesgo](#114-cron-calcular-riesgo)
115. [Cron resumen semanal](#115-cron-resumen-semanal)
116. [Calendar ICS](#116-calendar-ics)

### Parte XI — Componentes y librerías
117. [Componentes públicos](#117-componentes-públicos)
118. [Componentes privados (UI)](#118-componentes-privados-ui)
119. [Componentes específicos](#119-componentes-específicos)
120. [Librerías de utilidades](#120-librerías-de-utilidades)

### Parte XII — PWA, despliegue y mantenimiento
121. [Configuración PWA](#121-configuración-pwa)
122. [Despliegue desde cero](#122-despliegue-desde-cero)
123. [Operaciones diarias](#123-operaciones-diarias)
124. [Procesos completos por escenario](#124-procesos-completos-por-escenario)
125. [Backup y recuperación](#125-backup-y-recuperación)

### Parte XIII — Apéndices
126. [Glosario institucional](#126-glosario-institucional)
127. [Códigos y enums](#127-códigos-y-enums)
128. [Convenciones de código](#128-convenciones-de-código)
129. [Tabla maestra de rutas](#129-tabla-maestra-de-rutas)
130. [Pendientes y roadmap](#130-pendientes-y-roadmap)

---

# PARTE I — Génesis y arquitectura

## 1. Origen del proyecto y HTML inicial

### 1.1 Punto de partida

El proyecto nació de un **mockup HTML monolítico** creado el 23 de marzo de 2026 (`epo221_completo.html`, ~85 KB), que servía como prueba visual de cómo se vería el sitio público de la preparatoria. Este archivo contenía:

- Una sola página de scroll infinito con **19 secciones**:
  1. **Hero** (cabecera con animación)
  2. **Portal** (acceso al sistema)
  3. **Calendario**
  4. **Trámites**
  5. **Inscripciones**
  6. **Oferta educativa**
  7. **Docentes**
  8. **Reglamento**
  9. **Galería**
  10. **Logros**
  11. **Egresados**
  12. **Bolsa de trabajo**
  13. **Padres de familia**
  14. **Historia**
  15. **FAQ**
  16. **Mapa**
  17. **Noticias**
  18. **Contacto**
  19. Footer

- Una **barra de accesibilidad fija superior** con botones para:
  - Aumentar/reducir tamaño de fuente
  - Activar alto contraste
  - Lector de pantalla

- Estilos CSS con variables institucionales:
  - Verde oscuro `#1a5c2e`
  - Verde medio `#2d8047`
  - Verde claro `#4caf70`
  - Dorado `#c9a227`
  - Dorado claro `#f0c84a`
  - Crema `#faf6ed`
  - Tipografías: **Playfair Display** (serif para títulos) y **DM Sans** (sans para cuerpo)

- Un navbar fijo verde con backdrop blur, borde inferior dorado, logo y menú.

### 1.2 Migración al stack Next.js + Supabase

Sobre ese mockup se construyó el sistema completo:

1. Se creó el proyecto Next.js 14 con App Router (`npx create-next-app@latest`).
2. Se conectó Supabase como backend (Postgres + Auth + Storage).
3. Se reescribió el HTML como **componentes React** modulares, conservando la identidad visual completa.
4. Se sustituyeron las secciones estáticas por **datos dinámicos** desde la BD (noticias, convocatorias, álbumes, etc., todos editables desde `/admin/publico`).
5. Se agregó un panel administrativo completo y dashboards diferenciados por rol.

El archivo HTML original sigue en la carpeta `ProyecSkul/` (un nivel arriba de `sistema/`) como referencia histórica.

### 1.3 Carga del logo institucional

El logo `Logo-EPO221.jpeg` (179 KB, aportado el 17 de abril de 2026) se procesó en dos versiones:

- **`public/img/logo-epo221.png`** — versión optimizada PNG con fondo transparente
- **`public/img/gobierno-edomex-sep.png`** + `@2x.png` — banderines institucionales SEP/Gobierno del Edo de México

Estos se sirven estáticamente desde `/img/...` en cualquier ruta del sitio.

---

## 2. Identidad visual

### 2.1 Paleta de colores

Definida en `tailwind.config.ts` y `globals.css`:

```js
colors: {
  verde: '#1a5c2e',          // Verde institucional principal
  'verde-oscuro': '#0f4233', // Headers, botones primarios
  'verde-medio': '#2d8047',  // Hovers
  'verde-claro': '#4caf70',  // Accentos, badges
  dorado: '#c9a227',         // Detalles institucionales
  'dorado-claro': '#f0c84a', // Hovers de dorado
  crema: '#faf6ed',          // Fondo principal del sitio público
}
```

Se usa también la paleta de Tailwind por defecto (`gray-*`, `rose-*`, `amber-*`, `sky-*`) para estados secundarios (alertas, errores, info).

### 2.2 Tipografía

- **Playfair Display** (700, 900) — títulos serif, encabezados nobles
- **DM Sans** (300, 400, 500, 600) — cuerpo, navegación, formularios

Cargadas vía Google Fonts en `layout.tsx` raíz.

### 2.3 Iconografía

**Emojis nativos** — el sistema usa emojis Unicode en lugar de bibliotecas de íconos para minimizar peso. Ejemplos:

- 🏠 Inicio · 📅 Calendario · 📊 Calificaciones · 📚 Materias
- 🎓 Alumnos · 👨‍🏫 Profesores · 🏫 Grupos
- 📝 Tareas · 🧪 Exámenes · 🗂️ Portafolio · 📘 Extraordinarios
- 💬 Chat · 🗓️ Tutorías · 📣 Conducta · 🚨 Alertas
- 🧭 Evaluación / Orientación · 📄 PDF · 📧 Correo
- 💰 Pagos · 🏷️ Conceptos · 💌 Mensajes · 📢 Avisos
- 🔍 Búsqueda · 🔒 Cerrar · 🔓 Reabrir · ⚠️ Advertencia · ✅ OK · ❌ Error

### 2.4 Configuración de sitio

La tabla `sitio_config` (singleton) almacena:

| Columna | Tipo | Uso |
|---|---|---|
| `nombre_escuela` | text | Aparece en headers, PDFs, correos |
| `cct` | text | Clave de Centro de Trabajo |
| `logo_url` | text | URL del logo (path en bucket o URL absoluta) |
| `direccion` | text | Para contacto y footer |
| `ciudad` | text | Para constancias y comunicaciones |
| `telefono` | text | Contacto |
| `email_contacto` | text | Para forms de contacto |
| `director_nombre` | text | Firma en constancias |
| `redes_sociales` | jsonb | Facebook, Instagram, etc. |

Editable desde `/admin/publico/config`.

---

## 3. Stack tecnológico y decisiones

### 3.1 Frontend

- **Next.js 14.2.15** (App Router, Server Components)
- **React 18.3.1**
- **TypeScript 5.5.3**
- **Tailwind CSS 3.4.4** + **PostCSS** + **Autoprefixer**
- **Framer Motion 12.38** (animaciones de entrada de páginas, transiciones)

### 3.2 Backend / Datos

- **Supabase** (PostgreSQL 15)
  - `@supabase/ssr ^0.5.0` — clientes browser/server con cookies
  - `@supabase/supabase-js ^2.45.0`
- **Storage** Supabase para archivos (5 buckets)
- **Auth** Supabase (email + password con magic link para reset)

### 3.3 Documentos

- **`@react-pdf/renderer ^4.0.0`** — render de PDFs server-side (Boleta, Kardex, Constancia, Comprobante)
- **`xlsx 0.20.3`** (CDN) — exportes a Excel en `/api/export`

### 3.4 Validación

- **Zod 3.23.8** — schemas de validación en algunos forms críticos

### 3.5 Tests

- **Playwright 1.47** — tests E2E (carpeta `tests/` no comprometida en git)

### 3.6 Hosting

- **Vercel** — deploy automático en push a `main`
- **GitHub** — repositorio fuente con auto-integración Vercel

### 3.7 Decisiones técnicas clave

1. **Server Components por defecto** — todas las páginas son async server components que hacen queries directos a Supabase. Solo se usa `'use client'` cuando hay interactividad (forms, hooks).

2. **Server Actions para mutaciones** — patron `{ ok?, error?, id? }` consistente en todos los actions, consumidos con `useTransition` desde forms cliente.

3. **RLS exhaustivo** — toda tabla tiene políticas de Row Level Security; el frontend nunca puede saltarse permisos por accidente. El service role key solo se usa en server actions controlados.

4. **Anonimato verificable** — para evaluación docente se usa hash MD5 + UNIQUE constraint, evitando que se pueda rastrear quién votó qué incluso desde el backend.

5. **Storage con path convention** — buckets organizados como `<entity_id>/<uuid>.<ext>` para que las RLS por `split_part(name, '/', 1)` funcionen elegantemente.

6. **PDFs server-side** — los PDFs se generan con `@react-pdf/renderer` en route handlers `/api/...` con `runtime: 'nodejs'` para evitar peso en cliente.

7. **Crons en Vercel** — `vercel.json` configura los crons; se autentican con `CRON_SECRET` en header.

---

## 4. Estructura de carpetas

```
ProyecSkul/                          ← carpeta padre con docs auxiliares
├── epo221_completo.html             ← mockup original
├── Logo-EPO221.jpeg                 ← logo fuente
├── 15EBH0409B_*.csv/xlsx            ← cargas iniciales SEIEM
├── REGLAMENTO ESCOLAR 2025-2026-2.docx
├── TARIFAS *.pdf
└── sistema/                         ← proyecto Next.js (desplegable)
    ├── public/
    │   ├── img/                     ← logos institucionales
    │   ├── albumes/                 ← imágenes de álbumes (si están en disco)
    │   ├── descargas/               ← documentos descargables
    │   ├── manifest.json            ← PWA
    │   └── sw.js                    ← Service Worker
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx             ← redirect a /publico
    │   │   ├── layout.tsx           ← layout raíz con fonts
    │   │   ├── globals.css
    │   │   ├── publico/             ← sitio público
    │   │   ├── login/
    │   │   ├── recuperar/
    │   │   ├── cambiar-password/
    │   │   ├── perfil/
    │   │   ├── admin/               ← módulo administración (35+ rutas)
    │   │   ├── profesor/            ← módulo docente (30+ rutas)
    │   │   ├── alumno/              ← módulo alumno (20+ rutas)
    │   │   ├── director/            ← módulo dirección
    │   │   ├── eval-docente/        ← actions compartidas
    │   │   ├── planeaciones/        ← actions compartidas
    │   │   ├── solicitudes/         ← actions compartidas
    │   │   ├── chat-grupal/         ← actions compartidas
    │   │   ├── tutorias/            ← actions compartidas
    │   │   ├── avisos/              ← rutas comunes de avisos
    │   │   ├── calendario/          ← endpoint ICS público
    │   │   └── api/                 ← route handlers
    │   ├── components/
    │   │   ├── publico/             ← navbar, hero, animaciones
    │   │   ├── privado/             ← shell, sidebar, topbar, ui kit
    │   │   ├── avisos/
    │   │   ├── calendario/
    │   │   ├── chat/
    │   │   ├── mensajes/
    │   │   └── solicitudes/
    │   ├── lib/
    │   │   ├── supabase/server.ts, admin.ts, client.ts
    │   │   ├── pdf/Kardex.tsx, Boleta.tsx, ConstanciaServicio.tsx
    │   │   ├── riesgo/score.ts
    │   │   ├── email/send.ts
    │   │   ├── alertas.ts, queries.ts, mensajes.ts, notificaciones.ts
    │   │   ├── grupos.ts, reconocimientos.ts, csv.ts, saludo.ts, auth.ts
    │   ├── middleware.ts            ← auth check global
    ├── supabase/
    │   ├── schema.sql               ← schema base
    │   ├── seed.sql                 ← datos iniciales
    │   ├── storage.sql              ← buckets + policies
    │   ├── views.sql                ← vistas materializadas
    │   └── bootstrap_admin.sql      ← admin inicial
    ├── tests/                       ← Playwright (no en git)
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    ├── next.config.mjs
    ├── vercel.json                  ← crons
    ├── .gitignore
    ├── .env.local                   ← secretos locales (NO se commitea)
    ├── .env.example                 ← template
    ├── BITACORA_DESARROLLO.md
    └── MANUAL_COMPLETO.md           ← este archivo
```

---

## 5. Variables de entorno

Configuradas en Vercel y en `.env.local` para desarrollo:

| Variable | Tipo | Quién la usa | Propósito |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública | cliente y server | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | cliente y server | Anon key, queries con RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | secreta | solo server actions / API | Service role para bypass de RLS |
| `NEXT_PUBLIC_APP_URL` | pública | meta tags, links absolutos | Ej. `https://epo221.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | pública | títulos | Nombre de la app |
| `NEXT_PUBLIC_ESCUELA_CCT` | pública | UI fallback | CCT |
| `CRON_SECRET` | secreta | crons Vercel | Auth header para los crons |
| `RESEND_API_KEY` | secreta | módulo email | Activa correos reales |
| `CORREO_REMITENTE` | pública | módulo email | Ej. `EPO 221 <no-reply@dominio>` |

> ⚠️ Nunca subir `.env.local` a git. El `.gitignore` lo excluye.

---

# PARTE II — Base de datos completa

## 6. Esquema general de la BD

La base de datos PostgreSQL en Supabase tiene **60 tablas y vistas** organizadas en 8 grupos lógicos:

1. **Identidad y personas** — perfiles, alumnos, profesores
2. **Académico** — ciclos, grupos, materias, asignaciones, inscripciones, horarios, calificaciones, parciales_config
3. **Evaluación y seguimiento** — asistencias, reportes_conducta, bitacora_clase, documentos_alumno, eval_docente_*, planeaciones, riesgo_snapshots
4. **Comunicación** — mensajes_hilos, mensajes, notificaciones, avisos, avisos_lecturas, anuncios, eventos_calendario, chat_grupal_mensajes
5. **Administrativo** — solicitudes_revision, solicitudes_mensajes, examenes_extraordinarios, pagos, conceptos_pago, cargos, audit_log, auditoria
6. **Contenido público** — noticias, convocatorias, albumes, album_fotos, paginas_publicas
7. **Bloques agregados** — tareas, entregas_tarea, examenes, examen_*, portafolio_evidencias, tutorias_horarios, tutorias_citas, rubricas, rubrica_criterios, correo_log
8. **Vistas materializadas** — vista_estado_cuenta, vista_evaluacion_general, vista_ficha_alumno, vista_historial_academico, vista_promedios_*

Adicionalmente: tablas `sitio_config`, `campos_disciplinares`.

---

## 7. Tablas de identidad y personas

### `perfiles`
Tabla maestra de usuarios autenticados. Cada registro corresponde a un `auth.users.id`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | == `auth.users.id` |
| `nombre` | text | Nombre completo o display name |
| `email` | text | Email de contacto (sincronizado con auth) |
| `rol` | enum `rol_usuario` | `alumno` / `profesor` / `admin` / `staff` / `director` |
| `avatar_url` | text | Foto de perfil (path en bucket o URL absoluta) |
| `created_at` | timestamptz | |

**RLS:** todos los autenticados pueden leer su propio perfil; admin/staff pueden leer cualquiera.

### `alumnos`
Datos demográficos y académicos de cada estudiante.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `perfil_id` | uuid FK | → `perfiles.id` |
| `curp` | enum CURP | Identificador único nacional |
| `matricula` | text UNIQUE | Matrícula institucional |
| `nombre`, `apellido_paterno`, `apellido_materno` | text | |
| `fecha_nacimiento`, `sexo` | date / char | |
| `email`, `telefono`, `direccion`, `codigo_postal`, `municipio`, `estado` | | |
| `generacion` | text | Ej. "2025-2028" |
| `escuela_procedencia`, `promedio_secundaria` | | |
| `tutor_nombre`, `tutor_telefono`, `tutor_parentesco`, `tutor_email` | | Para correos automáticos |
| `foto_url` | text | |
| `observaciones` | text | |
| `estatus` | text | `activo`, `baja`, `suspendido`, `egresado` |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | Soft delete |

### `profesores`
Datos del personal docente.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `perfil_id` | uuid FK | |
| `rfc` | text | Para constancia de servicio |
| `nombre`, `apellido_paterno`, `apellido_materno` | | |
| `email`, `telefono` | | |
| `activo` | boolean | |
| `foto_url` | text | |
| `created_at`, `deleted_at` | timestamptz | |

---

## 8. Tablas académicas

### `ciclos_escolares`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `codigo` | text | Ej. "2025-2026" |
| `periodo` | text | "2025-A", "2025-B", "2026-A" |
| `fecha_inicio`, `fecha_fin` | date | |
| `activo` | boolean | Solo uno activo a la vez |

### `grupos`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `ciclo_id` | uuid FK | |
| `grado` | smallint | 1, 2, 3 |
| `semestre` | smallint | 1-6 |
| `grupo` | smallint | 1=A, 2=B, 3=C... |
| `turno` | text | matutino/vespertino |
| `carrera` | text | (BG por defecto en EPO) |
| `orientador_id` | uuid FK | → `profesores.id` |
| `deleted_at` | timestamptz | |

### `materias`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `clave` | text | Clave SEIEM |
| `nombre` | text | |
| `semestre` | smallint | A qué semestre pertenece |
| `campo_disciplinar_id` | smallint FK | → `campos_disciplinares` |
| `tipo` | text | obligatoria/optativa |
| `horas_semestrales` | smallint | Para calcular horas/semana en constancia |
| `activo` | boolean | |

### `campos_disciplinares`
Catálogo del marco curricular nacional (Matemáticas, C. Sociales, C. Experimentales, etc.).

### `asignaciones`
**Tabla pivote** materia × grupo × profesor × ciclo. Cada combinación es una "asignación" y es la entidad sobre la que giran tareas, exámenes, calificaciones, planeaciones, etc.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `materia_id`, `grupo_id`, `profesor_id`, `ciclo_id` | uuid FK | |
| `created_at` | timestamptz | |

### `inscripciones`
Alumno × grupo × ciclo.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `alumno_id`, `grupo_id`, `ciclo_id` | uuid FK | |
| `fecha_inscripcion` | date | |
| `estatus` | text | `activa`, `baja`, `suspendida` |

### `horarios`
Horario semanal por asignación: día × hora.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `asignacion_id` | uuid FK | |
| `dia_semana` | smallint | 1=L, 2=M ... 5=V |
| `hora_inicio`, `hora_fin` | time | |
| `aula` | text | |

### `calificaciones`
Filas por (alumno, asignación). Una sola fila acumula los 3 parciales y los extraordinarios.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `alumno_id`, `asignacion_id` | uuid FK | |
| `p1`, `p2`, `p3` | numeric | Calificación de cada parcial |
| `faltas_p1`, `faltas_p2`, `faltas_p3` | smallint | |
| `e1`, `e2`, `e3`, `e4` | numeric | Extraordinarios |
| `folio_e1`, `folio_e2`, `folio_e3`, `folio_e4` | text | |
| `promedio_final` | numeric | Calculado por trigger / función |
| `capturado_por` | uuid | |
| `updated_at` | timestamptz | |

### `parciales_config`
Define cuándo abre/cierra cada parcial y reglas de captura.

### `asistencias`
Registro diario de asistencia por (alumno, asignación, fecha).

---

## 9. Tablas de evaluación y seguimiento

### `reportes_conducta`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `alumno_id`, `profesor_id` | uuid FK | |
| `tipo` | text | `negativo`, `positivo` |
| `categoria` | text | Ej. "Faltas de respeto", "Reconocimiento" |
| `descripcion` | text | |
| `fecha` | date | |
| `acciones_tomadas` | text | |
| `estado` | text | `pendiente`, `en_proceso`, `cerrado` |
| `atendido_por`, `atendido_at`, `notas_orientador` | | |

### `bitacora_clase`
Notas del docente por clase impartida (asignación + fecha).

### `documentos_alumno`
Documentos en expediente: acta, CURP, certificado de secundaria, comprobante, etc.

### `eval_docente_periodos`
Periodos de evaluación docente abiertos por administración.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `ciclo_id` | uuid FK | |
| `nombre` | text | |
| `instrucciones` | text | |
| `abierta_desde`, `abierta_hasta` | timestamptz | |
| `dimensiones` | jsonb | `[{clave, texto}, ...]` |
| `escala_max` | int | Default 5 |
| `activa` | boolean | |
| `created_by` | uuid | |

### `eval_docente_respuestas`
Respuestas anónimas de los alumnos.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `periodo_id`, `asignacion_id` | uuid FK | |
| `alumno_hash` | text | MD5 de `alumno_id::periodo_id::asignacion_id` |
| `respuestas` | jsonb | `{clave: 1..5, ...}` |
| `comentario` | text | Opcional |
| `UNIQUE(periodo_id, asignacion_id, alumno_hash)` | | Anti-doble-voto |

### `planeaciones`
Planeación didáctica con versionado.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `asignacion_id` | uuid FK | |
| `parcial` | int | 1-3 |
| `titulo`, `contenido` | text | |
| `archivo_url`, `archivo_nombre` | text | |
| `version` | int | Auto-increment lógico |
| `estado` | text | `borrador`, `enviada`, `aprobada`, `rechazada` |
| `observaciones_revisor`, `revisada_por` | | |
| `UNIQUE(asignacion_id, parcial, version)` | | |

### `riesgo_snapshots`
Snapshots históricos del motor de riesgo (Bloque 5).

---

## 10. Tablas de comunicación

### `mensajes_hilos`
Hilo de conversación entre alumno y profesor.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `alumno_id`, `profesor_id` | uuid FK | |
| `last_msg_at` | timestamptz | Para ordenar |
| `created_at` | timestamptz | |

### `mensajes`
Mensajes individuales dentro de un hilo.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `hilo_id` | uuid FK | |
| `autor_id` | uuid FK → perfiles | |
| `autor_tipo` | text | `alumno` / `profesor` |
| `cuerpo` | text | Soporta markdown ligero |
| `solicitud_id` | uuid (opcional) | Referencia a solicitud_revision |
| `leido_at` | timestamptz | NULL si no leído |
| `created_at` | timestamptz | |

### `notificaciones`
Notificaciones globales (campana en Topbar).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `perfil_id` | uuid FK | Destinatario |
| `titulo`, `mensaje` | text | |
| `url` | text | Link al recurso |
| `leida_at` | timestamptz | |
| `created_at` | timestamptz | |

### `avisos`
Avisos institucionales que requieren confirmación de lectura.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `titulo`, `cuerpo` | text | |
| `audiencia` | text | `todos` / `alumnos` / `profesores` / etc. |
| `obligatorio` | boolean | |
| `creado_por` | uuid | |
| `created_at`, `expira_at` | timestamptz | |

### `avisos_lecturas`
| Columna | Tipo | Notas |
|---|---|---|
| `aviso_id`, `perfil_id` | uuid FK | PK compuesta |
| `leido_at` | timestamptz | |

### `anuncios`
Anuncios internos (sin obligatoriedad de lectura) tipo blog.

### `eventos_calendario`
Eventos institucionales mostrados en `/calendario`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `titulo`, `descripcion` | text | |
| `inicio`, `fin` | timestamptz | |
| `categoria` | text | `academico`, `social`, `civico`, etc. |
| `audiencia` | text | |
| `color` | text | Hex para mostrar en calendar |

### `chat_grupal_mensajes`
Chat por asignación (Bloque 3).

---

## 11. Tablas administrativas

### `solicitudes_revision`
Solicitudes de revisión de calificaciones por parte del alumno.

### `solicitudes_mensajes`
Hilo de conversación dentro de cada solicitud (mejora del Bloque 5+).

### `examenes_extraordinarios`
Solicitudes de extraordinario.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `alumno_id`, `asignacion_id` | uuid FK | |
| `tipo` | text | `recuperacion`, `extraordinario_1`, `extraordinario_2` |
| `motivo` | text | |
| `estado` | text | `solicitado`, `aprobado`, `rechazado`, `aplicado` |
| `calificacion` | numeric | Una vez aplicado |
| `folio` | text | |

### `pagos`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `alumno_id` | uuid FK | |
| `concepto_id` | uuid FK | |
| `monto`, `monto_pagado` | numeric | |
| `fecha_vencimiento`, `fecha_pago` | date | |
| `estado` | text | `pendiente`, `pagado`, `vencido` |
| `metodo_pago` | text | |
| `referencia` | text | Para tracking |

### `conceptos_pago`
Catálogo de conceptos cobrables (inscripción, mensualidad, certificado, etc.).

### `cargos`
Plantillas de cargos automáticos a alumnos por concepto.

### `audit_log` y `auditoria`
Registro de acciones críticas (creación/modificación/borrado de entidades clave).

---

## 12. Tablas de contenido público

### `noticias`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text UNIQUE | URL pública: `/publico/noticias/<slug>` |
| `titulo`, `resumen`, `contenido` | text | |
| `imagen_url` | text | |
| `publicado` | boolean | |
| `fecha` | date | |
| `etiquetas` | text[] | |
| `autor_id` | uuid | |

### `convocatorias`
Estructura similar a noticias pero con `tipo`, `fecha_limite`, `pdf_url`.

### `albumes` y `album_fotos`
Galerías fotográficas. `album_fotos` tiene `album_id`, `url`, `orden`, `pie_foto`.

### `paginas_publicas`
CMS para páginas estáticas adicionales (`/publico/p/<slug>`).

---

## 13. Tablas de los 5 bloques

Resumen de tablas creadas en cada bloque (para referencia rápida):

| Bloque | Tablas |
|---|---|
| 2 | `tareas`, `entregas_tarea`, `portafolio_evidencias` |
| 3 | `examenes`, `examen_preguntas`, `examen_intentos`, `examen_respuestas`, `chat_grupal_mensajes`, `tutorias_horarios`, `tutorias_citas` |
| 4 | `eval_docente_periodos`, `eval_docente_respuestas`, `planeaciones` |
| 5 | `riesgo_snapshots`, `correo_log` |
| Extra | `solicitudes_mensajes` |

---

## 14. Vistas materializadas

Optimizan consultas pesadas que se ejecutan muchas veces (boletas, kardex, dashboards):

| Vista | Devuelve |
|---|---|
| `vista_evaluacion_general` | Por alumno: promedio general, total materias, aprobadas, % avance |
| `vista_historial_academico` | Por alumno: filas por (ciclo, semestre, materia) con todos los parciales y extraordinarios |
| `vista_estado_cuenta` | Por alumno: cargos, pagos, saldo |
| `vista_ficha_alumno` | Snapshot consolidado para Mi ficha |
| `vista_promedios_semestre` | Promedios por grupo/semestre/materia para analítica |
| `vista_promedios_anuales` | Agregado anual para reportes a SEIEM |

---

## 15. Buckets de storage

| Bucket | Contenido | Path | Max | RLS |
|---|---|---|---|---|
| `tareas` | Entregas de alumnos | `<asignacion_id>/<uuid>.<ext>` | 15 MB | Alumno propio + profesor de la asignación |
| `solicitudes` | Adjuntos de solicitudes y conversación | `<solicitud_id>/<uuid>.<ext>` | 15 MB | Alumno dueño + profesor + admin |
| `portafolio` | Evidencias del alumno | `<alumno_id>/<uuid>.<ext>` | 15 MB | Alumno propio + profesores con clases en sus grupos |
| `chat-grupal` | Adjuntos en chat de clase | `<asignacion_id>/<uuid>.<ext>` | 15 MB | Cualquier miembro del grupo |
| `planeaciones` | Planeaciones didácticas | `<asignacion_id>/<uuid>.<ext>` | 50 MB | Profesor de la asignación + admin/director |

URLs siempre se firman con `createSignedUrl(path, 3600)` para acceso temporal de 1 hora.

---

## 16. Funciones SQL y RPC

### `eval_docente_agregado(p_profesor_id uuid, p_periodo_id uuid)`
SECURITY DEFINER. Para cada asignación del profesor, devuelve:
- `asignacion_id`, `materia`, `grupo`
- `total` int — total de respuestas
- `promedios` jsonb — `{clave_dimension: promedio, ...}`
- `comentarios` text[] — array de comentarios anónimos no nulos

Bypassa RLS de forma segura porque solo agrega; nunca expone respuestas individuales.

### Triggers
- En `calificaciones`: cuando se actualizan p1/p2/p3, recalcula `promedio_final`.
- En `mensajes`: cuando se inserta uno nuevo, actualiza `mensajes_hilos.last_msg_at`.

---

## 17. RLS y seguridad

### Patrón general

Toda tabla relacionada a un usuario tiene políticas como:

```sql
-- Lectura
CREATE POLICY <tabla>_read ON <tabla> FOR SELECT TO authenticated USING (
  perfil_id = auth.uid()
  OR EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.rol IN ('admin','staff','director'))
);

-- Escritura
CREATE POLICY <tabla>_write ON <tabla> FOR ALL TO authenticated
  USING (perfil_id = auth.uid())
  WITH CHECK (perfil_id = auth.uid());
```

### Casos especiales

- **Tablas anónimas** (`eval_docente_respuestas`): nadie ve respuestas individuales excepto admin; el insert se permite a alumnos siempre que el hash sea válido.
- **Tablas multi-rol** (`mensajes`, `solicitudes_mensajes`): se valida pertenencia transitiva (alumno dueño O profesor de la asignación).
- **Storage**: políticas usan `split_part(name, '/', 1)` para extraer el `<entity_id>` del path.

### Service Role

El service role key se usa **solo** en server actions controlados (`adminClient()` en `src/lib/supabase/admin.ts`) para:
- Subir archivos a storage (bypass de policy de path)
- Insertar notificaciones cruzadas (cuando alumno notifica a profesor o vice versa)
- Cron jobs (no tienen sesión de usuario)
- Plantillas de cargos masivos

---

# PARTE III — Sitio público (`/publico`)

## 18. Página de inicio pública

**Ruta:** `/` redirige automáticamente a `/publico`
**Archivo:** `src/app/publico/page.tsx` (398 líneas)

### Composición visual (de arriba a abajo)

1. **Banner de gobierno** (`GobiernoBanner.tsx`) — barra superior con logos institucionales SEP/Edomex
2. **Navbar** (`Navbar.tsx`) — fija con logo EPO 221 + menú principal
3. **Hero principal** con `HeroCanvas.tsx` (animación de partículas en canvas)
4. **Sección Portal** — botones grandes para acceder al sistema según rol
5. **Sección Calendario** — eventos próximos
6. **Sección Trámites** — guía de trámites comunes
7. **Sección Inscripciones** — info de inscripción
8. **Sección Oferta educativa** — cards con planes de estudio
9. **Sección Docentes** — directorio resumido
10. **Sección Reglamento** — descarga del PDF oficial
11. **Sección Galería** — preview de álbumes recientes
12. **Sección Noticias** — últimas 3-4 noticias
13. **Sección Convocatorias** — convocatorias activas
14. **Sección Contacto** — formulario + datos
15. **Footer** con redes sociales (`FloatingSocial.tsx`)

### Componentes auxiliares

- `AuroraBg.tsx` — fondo con gradient animado
- `Particles.tsx` — partículas decorativas
- `Counter.tsx` — números que cuentan al hacer scroll
- `Marquee.tsx` — texto desplazable
- `Reveal.tsx` — animaciones de entrada
- `TiltCard.tsx` — cards con efecto 3D al hover
- `MagneticButton.tsx` — botones que siguen al cursor
- `ScrollProgress.tsx` — barra de progreso de scroll
- `Reloj.tsx` — reloj en vivo
- `CustomCursor.tsx` — cursor personalizado

---

## 19. Navbar y accesibilidad

**Componente:** `src/components/publico/Navbar.tsx`

### Estructura

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo EPO 221]  Inicio · Oferta · Noticias · Convocatorias  │
│                  · Galería · Contacto · [Acceder al sistema]   │
└────────────────────────────────────────────────────────────────┘
```

**Elementos:**
- Logo (clickeable → `/publico`)
- Links del menú con `NavItem.tsx` (resaltan ruta activa)
- Botón de "Acceder al sistema" → `/login`
- En móvil: hamburguesa que despliega menú vertical

### Barra de accesibilidad superior

Heredada del HTML original:
- Botón A+ / A- (zoom de fuente)
- Botón "Alto contraste"
- Tooltip con shortcuts de teclado

---

## 20. Noticias

**Listado:** `/publico/noticias` — grid de cards con imagen, título, fecha, resumen
**Detalle:** `/publico/noticias/[slug]` — artículo completo

Las noticias se editan desde `/admin/noticias` (CMS).

---

## 21. Convocatorias

**Listado:** `/publico/convocatorias` — cards con tipo (académica/cultural/deportiva), fecha límite, descripción, link a PDF descargable.

---

## 22. Oferta educativa

**Ruta:** `/publico/oferta`

Muestra los planes de estudio disponibles (Bachillerato General Estatal con sus campos disciplinares y materias).

---

## 23. Álbumes y galería

**Listado:** `/publico/albumes` — grid con cover de cada álbum
**Detalle:** `/publico/albumes/[slug]` — galería con lightbox

Editables desde `/admin/publico/albumes`.

---

## 24. Páginas dinámicas

**Ruta:** `/publico/p/[slug]`

CMS de páginas estáticas (Reglamento, Misión-Visión, Historia, etc.). Editables desde `/admin/publico/paginas`.

---

## 25. Descargas

**Ruta:** `/publico/descargas`

Repositorio de PDFs oficiales (Reglamento 2025-2026, Tarifas, Solicitud de inscripción/reinscripción, Carta compromiso).

Los archivos se sirven desde `/public/descargas/*.pdf` (estáticos en disco), o desde un bucket si están subidos vía admin.

---

## 26. Contacto

**Ruta:** `/publico/contacto`

- Formulario (nombre, email, teléfono, asunto, mensaje)
- Mapa con ubicación
- Datos institucionales (dirección, teléfono, email, redes)
- Horarios de atención

---

# PARTE IV — Autenticación y onboarding

## 27. Login

**Ruta:** `/login`
**Archivo:** `src/app/login/page.tsx` (21 líneas — solo render)
**Componente:** Form que llama a `signInWithPassword()`

### Flujo

1. Usuario captura email + password
2. Supabase valida credenciales
3. Se setean cookies de sesión vía `@supabase/ssr`
4. Redirect según rol:
   - `alumno` → `/alumno`
   - `profesor` → `/profesor`
   - `admin` / `staff` → `/admin`
   - `director` → `/director`

### Errores manejados
- Email no existe → "Credenciales inválidas"
- Password incorrecta → "Credenciales inválidas"
- Email no confirmado → mensaje específico
- Cuenta deshabilitada → mensaje específico

### Link "¿Olvidaste tu contraseña?" → `/recuperar`

---

## 28. Recuperación de password

**Ruta:** `/recuperar`

### Flujo

1. Usuario captura email
2. Action `solicitarReset(fd)` llama `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/cambiar-password' })`
3. Supabase envía correo con magic link de 1 hora
4. Usuario abre link → llega a `/cambiar-password` con sesión temporal
5. Captura nueva password → `supabase.auth.updateUser({ password })`
6. Redirect a `/login`

### Reset desde admin

`AdminResetPasswordButton.tsx` permite a admin enviar un magic link a cualquier usuario sin necesidad de que el usuario lo solicite. Llama al endpoint admin `auth.admin.generateLink({ type: 'recovery' })`.

---

## 29. Cambiar password

**Ruta:** `/cambiar-password`

Página que recibe la sesión de recuperación y permite establecer nueva password (con validaciones de longitud mínima 8, mezcla de números/letras).

---

## 30. Middleware de protección

**Archivo:** `src/middleware.ts`

```typescript
// Pseudo-código:
export async function middleware(req) {
  const supabase = createMiddlewareClient(req);
  const { data: { user } } = await supabase.auth.getUser();

  // Rutas privadas requieren sesión
  if (rutaPrivada(req.url) && !user) {
    return NextResponse.redirect('/login');
  }
  return NextResponse.next();
}
```

Protege `/admin/*`, `/profesor/*`, `/alumno/*`, `/director/*`. Las rutas `/publico/*`, `/login`, `/recuperar`, `/cambiar-password` son públicas.

---

## 31. Layouts privados

Cada módulo (admin/profesor/alumno/director) tiene su propio `layout.tsx` que:

1. Verifica sesión y rol; si no aplica, redirect.
2. Carga `getNotificaciones(user.id, 10)` para mostrar campana en Topbar.
3. Carga `sitio_config` para logo institucional en sidebar.
4. Renderiza `PrivateShell` con:
   - Sidebar con grupos de navegación
   - Topbar con saludo, foto, notificaciones, acceso a perfil/logout
   - Main con `PageTransition` (animación al cambiar de ruta)

---

# PARTE V — Módulo Administración (`/admin`)

## 32. Dashboard admin

**Ruta:** `/admin`
**Archivo:** `src/app/admin/page.tsx` (222 líneas)

### Secciones del dashboard

1. **Cards de stats principales:**
   - Total alumnos activos
   - Total profesores activos
   - Grupos del ciclo activo
   - Asignaciones del ciclo

2. **Alertas institucionales** (de `lib/alertas.ts`):
   - Asignaciones sin profesor
   - Grupos sin alumnos
   - Semestres sin grupos creados
   - Alumnos en riesgo (con materias < 7)
   - Faltas críticas (>15)

3. **Accesos rápidos** a las acciones más comunes:
   - Crear nuevo grupo
   - Subir asignación
   - Captura de calificaciones
   - Bandeja de extraordinarios

4. **Últimas noticias publicadas y avisos pendientes**

---

## 33. Gestión de alumnos

**Ruta:** `/admin/alumnos`

### Botones disponibles

| Botón | Acción |
|---|---|
| **+ Nuevo alumno** | Abre form para crear alumno con todos los campos demográficos |
| **Importar CSV** | Sube CSV con plantilla SEIEM (`15EBH0409B_*.csv`) |
| **Exportar a Excel** | Llama a `/api/export/...` |
| **Filtros** | Por grupo, generación, estatus, búsqueda por nombre/CURP/matrícula |
| Click en alumno | Va a `/admin/alumnos/[id]` |

### Detalle del alumno (`/admin/alumnos/[id]`)

- **Pestañas:** Información · Académico · Documentos · Pagos · Conducta
- **Botones:**
  - Editar datos
  - Generar boleta PDF
  - Generar kardex PDF (`/api/kardex/[id]`)
  - Reset password (envía magic link)
  - Cambiar grupo
  - Dar de baja / Reactivar
  - Ver historial completo (`/admin/alumnos/[id]/historial`)

---

## 34. Gestión de profesores

**Ruta:** `/admin/profesores`

### Botones

- **+ Nuevo profesor** — alta con email institucional, crea automáticamente perfil con rol `profesor`
- **Importar CSV** — carga masiva
- **Asignar como orientador** de un grupo
- **Editar carga horaria** — atajo a asignaciones del profesor
- **Generar constancia de servicio** — link a `/api/constancia/[id]`
- **Reset password**

---

## 35. Gestión de usuarios y reset de password

**Ruta:** `/admin/usuarios`

Vista cruzada de `auth.users` + `perfiles` para troubleshooting:
- Usuarios sin perfil
- Perfiles sin auth user (huérfanos)
- Cambiar rol
- Forzar reset de password
- Deshabilitar cuenta temporalmente

**Componente:** `AdminResetPasswordButton.tsx` — botón reutilizable que dispara la action `resetPasswordForEmail`.

---

## 36. Grupos

**Ruta:** `/admin/grupos`

### Vista lista

Tabla de grupos del ciclo activo (filtrable por turno, semestre, grado).

### Botones

- **+ Nuevo grupo** — form: ciclo, grado, semestre, letra (1=A...), turno, carrera, orientador
- **Editar grupo**
- **Eliminar (soft delete)** — solo si no tiene inscripciones activas
- **Boletas masivas del grupo** — `/admin/grupos/[id]/boletas` genera PDF con boletas de todos los alumnos del grupo

### Detalle del grupo (`/admin/grupos/[id]`)

- Lista de alumnos inscritos
- Lista de asignaciones (materia + profesor)
- Horario semanal
- Botón "Inscribir alumnos al grupo"

---

## 37. Materias

**Ruta:** `/admin/materias`

CRUD de materias del catálogo institucional.

### Form de materia

- Clave SEIEM
- Nombre
- Semestre que cursa
- Campo disciplinar (dropdown de `campos_disciplinares`)
- Tipo (obligatoria/optativa)
- Horas semestrales
- Activo (boolean)

---

## 38. Asignaciones

**Ruta:** `/admin/asignaciones`

La tabla pivote más importante. Cada asignación = (materia, grupo, profesor, ciclo).

### Botones

- **+ Asignación individual** — escoge los 4 IDs
- **Asignar masivamente** — para un grupo, selecciona múltiples materias y asigna a profesores en batch
- **Importar CSV**
- **Filtros** — por ciclo, grupo, profesor, materia
- **Detectar conflictos** — alerta si un profesor tiene dos asignaciones en el mismo horario

---

## 39. Horarios

**Ruta:** `/admin/horarios`

Define el horario semanal de cada asignación.

### Vista

Cuadrícula L-V × horas, con drag&drop o forms para asignar:
- Asignación
- Día de la semana
- Hora inicio / fin
- Aula

### Validaciones

- No se puede asignar el mismo profesor en dos horarios sobrepuestos
- No se puede asignar el mismo grupo en dos clases simultáneas
- Detecta huecos sin clase

---

## 40. Calificaciones

**Ruta:** `/admin/calificaciones`

### Vista

Filtros: ciclo + grupo + materia + parcial. Muestra tabla editable inline:

| Alumno | P1 | Faltas P1 | P2 | Faltas P2 | P3 | Faltas P3 | E1 | Final |
|---|---|---|---|---|---|---|---|---|

### Botones

- **Guardar todo** — server action que valida y persiste en batch
- **Exportar a Excel**
- **Importar CSV** — formato SEIEM
- **Cerrar parcial** — bloquea edición una vez capturado el cierre

---

## 41. Ciclos escolares

**Ruta:** `/admin/ciclos`

CRUD con regla de "solo uno activo a la vez". Activar uno desactiva el anterior automáticamente.

---

## 42. Configuración de parciales

**Ruta:** `/admin/parciales`

Por cada parcial del ciclo activo:
- Fecha de apertura de captura
- Fecha de cierre
- Permite editar después de cierre (toggle)
- Visible para alumnos (toggle)

---

## 43. Planeaciones (revisión)

**Ruta:** `/admin/planeaciones?estado=enviada`

Bandeja de planeaciones que docentes han enviado a revisión.

### Botones por planeación

- **📎 Archivo** — descarga firmada del adjunto
- **✅ Aprobar** — cambia estado a `aprobada`, notifica al docente
- **❌ Rechazar** — cambia estado a `rechazada` con observaciones

### Filtros

`enviada`, `aprobada`, `rechazada`, `borrador`, `todas`.

---

## 44. Evaluación docente (gestión)

**Ruta:** `/admin/eval-docente`

### Pantalla

1. **Form "Nuevo periodo"** con preset de 7 dimensiones por defecto:
   - Dominio de la materia
   - Claridad en las explicaciones
   - Puntualidad y asistencia
   - Trato respetuoso con los alumnos
   - Retroalimentación oportuna
   - Uso de recursos didácticos
   - Justicia en la evaluación
   - Editable: añade/quita dimensiones en formato `clave|texto`

2. **Lista de periodos** con conteo de respuestas y botón "Cerrar".

---

## 45. Generaciones (analítica)

**Ruta:** `/admin/generaciones`

Reportes agregados por generación (cohorte de ingreso). Tablas con:
- Alumnos por estatus (activo, baja, egresado)
- Promedio general por generación
- Materias más reprobadas
- Tendencias

---

## 46. Alertas institucionales

**Ruta:** `/admin/alertas`

Centro de alertas operativas que devuelve `lib/alertas.ts`:

| Tipo | Nivel | Cuándo aparece |
|---|---|---|
| `asignacion_sin_profesor` | warning | Asignaciones del ciclo sin profesor asignado |
| `grupo_sin_alumnos` | info | Grupos con cero inscripciones activas |
| `semestre_sin_cubrir` | info / danger | Semestres sin grupos creados |
| `alumno_riesgo` | warning | Alumnos con `promedio_final < 7` |
| `faltas_criticas` | danger | Alumnos con >15 faltas acumuladas |

---

## 47. Detección de riesgo

**Ruta:** `/admin/riesgo`

Dashboard del Bloque 5.

### Componentes

- **Cards** con conteo de niveles: bajo, medio, alto, crítico
- **Filtros pestaña** por nivel
- **Botón "🔄 Recalcular ahora"** — dispara `recalcularRiesgo()` action
- **Lista de alumnos** con score, nivel, factores etiquetados, recomendación

---

## 48. Bitácora de correos

**Ruta:** `/admin/correos`

Historial de últimos 200 correos enviados por el sistema (cron resumen-semanal y otros).

Estados: `enviado`, `error`, `skipped`.

---

## 49. Pagos

**Ruta:** `/admin/pagos`

CRUD de pagos individuales.

### Botones

- **+ Registrar pago** — alumno + concepto + monto + método + referencia
- **Generar comprobante** — link a `/api/comprobante/[pagoId]` (PDF)
- **Marcar pagado / pendiente / vencido**
- **Cargo masivo** — aplica concepto a un grupo entero

---

## 50. Conceptos de pago

**Ruta:** `/admin/conceptos`

Catálogo de cargos cobrables: inscripción, mensualidad, certificado, examen extraordinario, etc.

Por concepto: nombre, monto base, periodicidad (única/mensual/semestral), aplica a (todos/grupo específico).

---

## 51. Extraordinarios (revisión)

**Ruta:** `/admin/extraordinarios`

### Pestañas

- Solicitados (pendientes de aprobación)
- Aprobados
- Rechazados
- Aplicados (con calificación capturada)

### Botones

- **Aprobar** — pasa a `aprobado`, notifica al alumno y al profesor
- **Rechazar** — con motivo
- **Capturar calificación** — registra E1/E2/E3/E4 en `calificaciones`

---

## 52. Noticias (CMS)

**Ruta:** `/admin/noticias`

CRUD de noticias para el sitio público.

### Form

- Slug (auto del título o manual)
- Título, resumen, contenido (textarea con preview markdown ligero)
- Imagen destacada (sube a bucket o URL)
- Etiquetas
- Fecha de publicación
- Toggle "Publicar"

---

## 53. Convocatorias (CMS)

**Ruta:** `/admin/convocatorias`

Similar a noticias, con campos extra:
- Tipo (académica/cultural/deportiva)
- Fecha límite
- PDF anexo

---

## 54. Anuncios internos

**Ruta:** `/admin/anuncios`

Tablero estilo "muro" para anuncios visibles en dashboards de roles seleccionados.

---

## 55. Avisos con confirmación

**Ruta:** `/admin/avisos`

Diferentes a "anuncios" porque **requieren confirmación de lectura**.

### Form

- Título, cuerpo
- Audiencia (todos/alumnos/profesores/un grupo específico)
- Obligatorio (boolean — si true, bloquea otras acciones hasta marcar leído)
- Fecha de expiración

### Vista

Lista de avisos con conteo "leído por X de Y" y botón para "Forzar reenvío".

---

## 56. Calendario institucional

**Ruta:** `/admin/calendario`

CRUD de eventos visibles en `/publico/calendario` y en calendarios de cada rol.

### Form

- Título, descripción
- Fecha/hora inicio y fin
- Categoría (académico/social/cívico/deportivo/etc.)
- Audiencia
- Color (hex)

---

## 57. Sitio público (CMS)

**Ruta:** `/admin/publico`

Subrutas:

- **`/admin/publico/inicio`** — edita los textos del hero, secciones y orden
- **`/admin/publico/config`** — `sitio_config` (nombre escuela, CCT, dirección, teléfono, email, director, redes sociales)
- **`/admin/publico/paginas`** — CMS de páginas estáticas
- **`/admin/publico/paginas/[id]`** — editor de página
- **`/admin/publico/albumes`** — gestión de álbumes
- **`/admin/publico/albumes/[id]`** — sube fotos individuales con orden
- **`/admin/publico/redes`** — links de redes sociales y configuración del FloatingSocial

---

## 58. Auditoría

**Ruta:** `/admin/auditoria`

Bitácora de acciones críticas: quién hizo qué y cuándo.

Filtros por:
- Tipo de acción (crear/modificar/eliminar)
- Tabla afectada
- Usuario que ejecutó
- Rango de fechas

---

# PARTE VI — Módulo Docente (`/profesor`)

## 59. Dashboard del docente

**Ruta:** `/profesor`
**Archivo:** `src/app/profesor/page.tsx` (355 líneas)

### Bloques visibles

1. **Saludo personalizado** según hora ("Buenos días, Profesor X")
2. **Stats:** mis grupos, mis asignaciones, alumnos totales, solicitudes pendientes
3. **Próximas clases** según horario semanal (siguientes 3-4)
4. **Solicitudes de revisión por responder** (con preview)
5. **Mensajes no leídos**
6. **Avisos institucionales no confirmados**
7. **Accesos rápidos** a tareas, exámenes, conducta
8. **Si es orientador:** card de su grupo orientado

---

## 60. Mis grupos

**Ruta:** `/profesor/grupos`

Lista de asignaciones del profesor (cada combinación materia × grupo).

### Por cada asignación

- Materia + grupo
- # alumnos
- Próxima clase
- Botón "Entrar al grupo" → `/profesor/grupo/[asignacionId]`

---

## 61. Vista de grupo: asistencia, bitácora, análisis

**Ruta base:** `/profesor/grupo/[asignacionId]`

### Subrutas

| Subruta | Contenido |
|---|---|
| `/asistencia` | Pase de lista por fecha, marca presente/ausente/justificado |
| `/bitacora` | Notas del docente por fecha (lo que se cubrió en clase) |
| `/analisis` | Gráficas de aprovechamiento por alumno, por parcial |
| `/comparativa` | Comparativa con otros grupos del mismo semestre |
| `/reconocimientos` | Otorga reconocimientos positivos a alumnos destacados |

---

## 62. Reconocimientos y comparativa

Reconocimientos: el docente puede premiar a alumnos con badges/menciones que aparecen en el kardex.

Comparativa: muestra el promedio del grupo del docente vs. promedio de otros grupos del mismo semestre/materia.

---

## 63. Mi horario

**Ruta:** `/profesor/horario`

Cuadrícula L-V × hora con todas sus asignaciones y aula.

---

## 64. Orientación grupal

**Ruta:** `/profesor/orientacion`

Visible solo si el profesor es `orientador_id` de algún grupo. Muestra:
- Lista de alumnos del grupo orientado
- Reportes de conducta del grupo
- Citas con tutores
- Alertas específicas del grupo

---

## 65. Alumnos en riesgo (vista docente)

**Ruta:** `/profesor/riesgo`

Lista de alumnos con `riesgo_snapshots` recientes filtrada solo a:
- Alumnos de los grupos del docente
- O alumnos del grupo orientado

---

## 66. Reportar conducta

**Ruta:** `/profesor/conducta`

Formulario para reportar incidencia conductual.

### Campos

- Alumno (autocomplete con alumnos de sus grupos)
- Tipo (negativo/positivo)
- Categoría (dropdown configurado: faltas de respeto, indisciplina, reconocimiento por…)
- Descripción
- Acciones tomadas
- Fecha (default hoy)

Al guardar, notifica al orientador y al admin.

---

## 67. Bandeja de conducta

**Ruta:** `/profesor/conducta/bandeja`

- **Si es docente normal:** sus reportes enviados
- **Si es orientador:** todos los reportes de su grupo orientado, con botones para "Atender", "Cerrar" y agregar `notas_orientador`

---

## 68. Tareas (gestión docente)

**Ruta:** `/profesor/tareas`

Lista de tareas creadas por el docente.

### Botones

- **+ Nueva tarea** → `/profesor/tareas/nueva`
- Click en tarea → `/profesor/tareas/[id]`
- **Eliminar tarea**

### Form de nueva tarea

- Asignación
- Título
- Instrucciones (textarea)
- Parcial
- Puntos
- Permite archivos (boolean)
- Fecha de apertura
- Fecha de entrega
- Cierra estricto (no acepta fuera de tiempo)
- Rúbrica (opcional)

### Detalle de tarea

- Lista de alumnos del grupo con estado (entregada/pendiente)
- Por entrega: archivo, fecha, calificación, retroalimentación
- Form `CalificarEntregaForm.tsx` para puntuar y dar feedback

---

## 69. Exámenes en línea (creación)

**Ruta:** `/profesor/examenes`

### Botones

- **+ Nuevo examen** → `/profesor/examenes/nuevo`
- Click en examen → `/profesor/examenes/[id]` (agregar preguntas)

### Form de nuevo examen

- Asignación
- Título, instrucciones
- Fecha apertura / cierre
- Duración en minutos
- Intentos permitidos
- Total de puntos (auto-calcula sumando preguntas)

### Detalle de examen — Agregar preguntas

`AgregarPreguntaForm.tsx` con dropdown de tipo:

| Tipo | UI |
|---|---|
| `opcion_multiple` | Enunciado + 4-5 opciones + correcta |
| `verdadero_falso` | Enunciado + selector V/F |
| `abierta` | Enunciado solamente; se califica manualmente |

Cada pregunta tiene su `puntos`. El total del examen se ajusta.

### Calificar abiertas

Para cada intento entregado con preguntas abiertas, `CalificarAbiertaForm.tsx` permite asignar puntos manualmente.

---

## 70. Portafolio (revisión)

**Ruta:** `/profesor/portafolio`

Vista de evidencias subidas por sus alumnos.

### Botones

- Filtrar por grupo
- **Comentar evidencia** (`ComentarEvidenciaForm.tsx`) — feedback escrito al alumno

---

## 71. Rúbricas

**Ruta:** `/profesor/rubricas`

CRUD de rúbricas reutilizables.

### Detalle (`/profesor/rubricas/[id]`)

- Criterios con peso
- Niveles de logro (Excelente / Suficiente / Insuficiente)
- Descriptores por celda

Las rúbricas se pueden asociar a tareas para guiar la calificación.

---

## 72. Chat de clase

**Ruta:** `/profesor/chat`

Lista de chats de sus asignaciones. Click → `/profesor/chat/[asignacionId]`.

### Vista de chat

Componente `ChatGrupal.tsx` con burbujas tipo WhatsApp + `ChatGrupalForm.tsx` para enviar mensajes con adjuntos. El docente puede eliminar mensajes inapropiados.

---

## 73. Directorio de tutores

**Ruta:** `/profesor/tutores`

Lista de alumnos de sus grupos con datos del tutor:

| Botón | Acción |
|---|---|
| 📞 **WhatsApp** | Abre `https://wa.me/52<10-dígitos>?text=...` con plantilla |
| ☎️ **Llamar** | `tel:` directo |
| ✉️ **Email** | `mailto:` con asunto pre-llenado |

Filtros por grupo.

---

## 74. Mis tutorías

**Ruta:** `/profesor/tutorias`

### Pestañas

- **Mis horarios** — define cuando está disponible para tutorías (`NuevoHorarioForm.tsx`)
- **Citas solicitadas** — alumnos que pidieron cita; `ProcesarCitaForm.tsx` para aceptar/rechazar
- **Citas próximas** — agenda

### Form de horario

- Día de la semana
- Hora inicio / fin
- Sala
- Recurrente (toggle)

---

## 75. Planeaciones (subida)

**Ruta:** `/profesor/planeaciones`

### Botones

- **Nueva versión** (`NuevaPlaneacionForm.tsx`)
  - Asignación
  - Parcial (1-3)
  - Título
  - Contenido (textarea)
  - Archivo opcional
  - Toggle "Enviar a revisión" (si no, queda borrador)

- **📎 Archivo** — descarga firmada
- **Eliminar versión** (no se puede borrar aprobadas)

### Estados visuales

| Estado | Color |
|---|---|
| `borrador` | Gris |
| `enviada` | Ámbar |
| `aprobada` | Verde |
| `rechazada` | Rosa |

---

## 76. Mi evaluación docente

**Ruta:** `/profesor/eval-docente`

Vista del Bloque 4. Muestra:

- Por asignación: materia, grupo, total respuestas
- Promedios por dimensión (chips)
- Comentarios anónimos en cajitas con borde verde

Llama al RPC `eval_docente_agregado(profesor_id, NULL)` que agrega de todos los periodos.

---

## 77. Constancia de servicio

**Ruta:** `/profesor/constancia`

Lista de ciclos disponibles. Por cada ciclo:

- **📄 Descargar PDF** — link a `/api/constancia/[profesorId]?ciclo_id=...`

El PDF incluye carga horaria completa con tabla de asignaturas y horas/semana.

---

## 78. Mensajes (docente)

**Ruta:** `/profesor/mensajes`

Bandeja de hilos de mensajes con sus alumnos.

### Vistas

- Lista de hilos con preview del último mensaje
- Click en hilo → `/profesor/mensajes/[alumnoId]` (chat 1-a-1)
- **+ Nuevo mensaje** → `/profesor/mensajes/nuevo` (escoge alumno)

Componente `MessageComposer.tsx` con input + adjuntos.

---

## 79. Avisos (docente)

**Ruta:** `/profesor/avisos`

- Lista de avisos institucionales recibidos (con confirmación de lectura)
- **+ Nuevo aviso** → `/profesor/avisos/nuevo` (solo dirigido a sus grupos)

---

## 80. Calendario (docente)

**Ruta:** `/profesor/calendario`

Vista mensual con:
- Eventos institucionales
- Sus clases (de horario)
- Sus citas de tutoría
- Sus tareas y exámenes con fecha de entrega

---

## 81. Solicitudes de revisión (docente)

**Ruta:** `/profesor/solicitudes`

### Pestañas

- **Por responder** (estado `abierta`)
- **Respondidas**
- **Cerradas**
- **Todas**

### Por solicitud

- Header con materia, alumno, parcial, fecha
- Motivo del alumno + adjunto opcional
- Si ya respondió: su respuesta + adjunto
- **NUEVO:** Sección **💬 Conversación** (componente `Conversacion.tsx`) con hilo de mensajes back-and-forth
- Botones: **✉️ Enviar** mensaje · **🔒 Cerrar** · **🔓 Reabrir**

---

## 82. Mi perfil

**Ruta:** `/profesor/perfil`

Edición de:
- Nombre, teléfono, email
- Foto (`AvatarUploader.tsx`)
- Cambiar password

---

# PARTE VII — Módulo Alumno (`/alumno`)

## 83. Dashboard del alumno

**Ruta:** `/alumno`
**Archivo:** `src/app/alumno/page.tsx` (286 líneas)

### Bloques

1. Saludo + foto + grupo + ciclo
2. **Promedio actual y materias en riesgo**
3. **Próximas clases** (de horario)
4. **Tareas pendientes** (entrega cercana)
5. **Exámenes próximos**
6. **Avisos no confirmados**
7. **Notificaciones recientes**
8. **Estado de cuenta** (saldo pendiente si lo hay)

---

## 84. Mi horario (alumno)

**Ruta:** `/alumno/horario`

Cuadrícula L-V × hora con sus clases (materia, profesor, aula).

---

## 85. Mis calificaciones

**Ruta:** `/alumno/calificaciones`

Tabla por materia con P1, P2, P3, faltas, promedio actual, extraordinarios.

### Botón "Solicitar revisión"

Por cada materia/parcial, abre form para crear `solicitud_revision`:
- Motivo (textarea)
- Adjunto opcional (foto del examen, etc.)

---

## 86. Boleta

**Ruta:** `/alumno/boleta`

PDF descargable con calificaciones del ciclo activo. Llama a `/api/boleta/[alumnoId]`.

---

## 87. Kardex (PDF)

**Ruta:** `/api/kardex/[alumnoId]` (link directo en sidebar)

PDF integral con todo el historial académico (ya descrito en parte II del documento previo, sección 4.2).

---

## 88. Mis tareas

**Ruta:** `/alumno/tareas`

Lista de tareas asignadas a sus grupos.

### Estados visuales

- Pendiente
- Entregada (con fecha)
- Calificada (con puntaje)
- Vencida (no entregó)

### Detalle (`/alumno/tareas/[id]`)

Form `EntregarTareaForm.tsx`:
- Comentario
- Archivo (drag&drop, hasta 15 MB)

Bloqueado si pasó la fecha y `cierra_estricto = true`.

---

## 89. Mis exámenes

**Ruta:** `/alumno/examenes`

Exámenes disponibles.

### Detalle (`/alumno/examenes/[id]`)

Componente `PresentarExamen.tsx`:
- Inicia intento
- **Countdown timer** persistente (sobrevive a refresh)
- Auto-guarda cada respuesta
- Auto-entrega al llegar a 0
- Calificación automática de cerradas; abiertas en pending

---

## 90. Portafolio (subida)

**Ruta:** `/alumno/portafolio`

Galería de evidencias del alumno.

### Form `SubirEvidenciaForm.tsx`

- Título
- Descripción
- Asignatura
- Archivo (foto/PDF/etc)

Botones por evidencia: ver, comentarios del docente, eliminar (propia).

---

## 91. Extraordinarios (solicitud)

**Ruta:** `/alumno/extraordinarios`

Form `SolicitarExtraordinarioForm.tsx`:
- Materia (solo aparecen las reprobadas)
- Tipo (recuperación / extraordinario 1 / 2)
- Motivo

Lista con estado: solicitado / aprobado / rechazado / aplicado (con calificación).

---

## 92. Chat de clase (alumno)

**Ruta:** `/alumno/chat`

Lista de chats de sus asignaciones. Mismo componente reutilizado.

---

## 93. Tutorías (solicitar cita)

**Ruta:** `/alumno/tutorias`

### Vista

Lista de horarios disponibles de sus profesores.

### Botón "Agendar cita" (`AgendarCitaForm.tsx`)

- Profesor + horario
- Fecha (próxima ocurrencia del día de la semana)
- Motivo

Se notifica al profesor para que apruebe.

---

## 94. Evaluar a mis docentes

**Ruta:** `/alumno/eval-docente`

Lista de periodos abiertos. Por cada (periodo × asignación) muestra `ResponderEvalForm.tsx`:

- Radios estilo píldora 1..N por cada dimensión
- Comentario anónimo opcional
- Botón **Enviar evaluación**

Si ya respondió (detectado por hash MD5), muestra "✅ Ya respondiste esta evaluación".

---

## 95. Mis solicitudes (con conversación)

**Ruta:** `/alumno/solicitudes`

Grid de cards. Por solicitud:

- Header con materia, profesor, parcial, estado
- Mi motivo + adjunto
- Respuesta del docente (si la hay) + adjunto
- **NUEVO:** Sección **💬 Conversación** con hilo de mensajes
- Botones: **✉️ Enviar** mensaje (con adjunto opcional) · **🔒 Cerrar** · **🔓 Reabrir**

---

## 96. Mensajes (alumno)

**Ruta:** `/alumno/mensajes`

Bandeja simétrica a la del profesor. Hilos con sus docentes.

---

## 97. Avisos (alumno)

**Ruta:** `/alumno/avisos`

Lista de avisos recibidos. Si es `obligatorio`, debe marcarlo leído antes de continuar (componente `MarcarLeidoClient.tsx`).

---

## 98. Calendario (alumno)

**Ruta:** `/alumno/calendario`

Vista mensual con:
- Eventos institucionales
- Sus clases
- Sus tareas y exámenes con fecha
- Citas de tutoría aceptadas

---

## 99. Estado de cuenta

**Ruta:** `/alumno/estado-cuenta`

Tabla de cargos y pagos. Saldo pendiente. Botón para descargar comprobantes de pagos hechos.

---

## 100. Mi ficha

**Ruta:** `/alumno/ficha`

Vista de sus datos personales completos. Botón "Solicitar actualización" si necesita cambiar algo (genera ticket para admin).

---

# PARTE VIII — Módulo Director (`/director`)

## 101. Resumen académico

**Ruta:** `/director/academico`

Dashboard ejecutivo con KPIs institucionales:
- Promedios por generación
- Aprovechamiento por campo disciplinar
- Tasa de aprobación general
- Tendencia anual

---

## 102. Anuncios oficiales

**Ruta:** `/director/anuncios`

CMS de anuncios del director (más nivel jerárquico que los anuncios de admin).

---

## 103. Solicitudes (escalamiento)

**Ruta:** `/director/solicitudes`

Vista de todas las solicitudes con estado para auditoría desde dirección.

---

# PARTE IX — Sistemas transversales

## 104. Notificaciones

**Tabla:** `notificaciones`
**Helper:** `lib/notificaciones.ts` exporta `getNotificaciones(perfil_id, limit)`.

### Componente

`NotificationBell.tsx` en el Topbar:
- Badge con número de no leídas
- Click abre dropdown con últimas 10
- Click en notificación marca como leída y navega al `url`

### Cuándo se generan (ejemplos)

- Profesor califica tarea → notifica al alumno
- Alumno solicita revisión → notifica al profesor
- Admin aprueba planeación → notifica al docente
- Cron detecta crítico → notifica al orientador
- Mensaje nuevo en solicitud → notifica a la otra parte

---

## 105. Sistema de mensajes

**Tablas:** `mensajes_hilos`, `mensajes`
**Helpers:** `lib/mensajes.ts` con `ensureHilo()` y `postMensaje()`

### Patrón

```typescript
const hiloId = await ensureHilo(supabase, profesorId, alumnoId, autorTipo);
await postMensaje(supabase, { hiloId, autorId, autorTipo, cuerpo, solicitudId? });
```

### Componente compositor

`MessageComposer.tsx` — input multilínea con preview de adjuntos antes de enviar.

---

## 106. Avisos institucionales

**Diferencia con anuncios:** los avisos requieren confirmación de lectura.

**Componente:** `AvisosList.tsx` lista los avisos del usuario con badge "no confirmado". `MarcarLeidoClient.tsx` es el botón que dispara la inserción en `avisos_lecturas`.

---

## 107. Calendario unificado

**Componente:** `CalendarioView.tsx`

Renderer de calendario con vista mensual/semanal. Cada rol filtra sus fuentes de eventos:

- Eventos institucionales (todos)
- Clases del horario (alumno + profesor)
- Tareas/exámenes con fecha (alumno + profesor)
- Citas de tutoría (alumno + profesor)

### Endpoint ICS

`/calendario/ics` — exporta los eventos a formato iCalendar para importar en Google Calendar/Outlook/etc.

---

## 108. Adjuntos y archivos

**Componente:** `Adjunto.tsx` (de `mensajes/`)

Renderer universal de archivos con preview/icono según tipo:
- 🖼️ Imagen → preview con click para ampliar
- 📄 PDF → ícono + nombre + tamaño + click para abrir
- 📎 Otro → ícono genérico

Usa `signedUrl` (válido 1 hora) generado server-side.

---

# PARTE X — APIs, PDFs y crons

## 109. PDF Boleta

**Ruta:** `/api/boleta/[alumnoId]`
**Componente:** `lib/pdf/Boleta.tsx`

PDF oficial con calificaciones del ciclo activo. Permisos: el propio alumno, sus padres (si tienen acceso), o admin.

---

## 110. PDF Kardex

**Ruta:** `/api/kardex/[alumnoId]`
**Componente:** `lib/pdf/Kardex.tsx`

PDF integral histórico (ya descrito en bitácora previa).

---

## 111. PDF Constancia de servicio

**Ruta:** `/api/constancia/[profesorId]?ciclo_id=...`
**Componente:** `lib/pdf/ConstanciaServicio.tsx`

Constancia oficial con carga horaria.

---

## 112. PDF Comprobante de pago

**Ruta:** `/api/comprobante/[pagoId]`

PDF con detalles del pago: alumno, concepto, monto, fecha, referencia, sello digital.

---

## 113. API export

**Ruta:** `/api/export/materias` (y futuras)

Exportes a Excel usando `xlsx`. Usado desde botones "Exportar" en admin.

---

## 114. Cron calcular riesgo

**Ruta:** `/api/cron/calcular-riesgo`
**Schedule:** `0 6 * * *` (diario 6 AM)
**Auth:** `Authorization: Bearer ${CRON_SECRET}`

Genera snapshots para todos los alumnos del ciclo activo y notifica a orientadores cuando hay críticos en sus grupos.

---

## 115. Cron resumen semanal

**Ruta:** `/api/cron/resumen-semanal`
**Schedule:** `0 14 * * 1` (lunes 2 PM)

Envía a cada tutor con `tutor_email` un correo HTML con resumen académico de su hijo/a.

---

## 116. Calendar ICS

**Ruta:** `/calendario/ics`

Endpoint que devuelve `text/calendar` con todos los eventos públicos institucionales para suscripción en apps de calendario externas.

---

# PARTE XI — Componentes y librerías

## 117. Componentes públicos

| Componente | Función |
|---|---|
| `Navbar.tsx` | Barra de navegación principal del sitio público |
| `NavItem.tsx` | Item de navbar con resalte de ruta activa |
| `LogoEPO.tsx` | Logo institucional con animación al hover |
| `GobiernoBanner.tsx` | Banner superior con logos SEP/Edomex |
| `HeroCanvas.tsx` | Canvas con animación de partículas en hero |
| `AuroraBg.tsx` | Fondo gradient animado |
| `Particles.tsx` | Partículas decorativas |
| `Counter.tsx` | Número que cuenta al hacer scroll |
| `Marquee.tsx` | Texto desplazable horizontal |
| `Reveal.tsx` | Animación de entrada al ser visible |
| `MotionItem.tsx` | Item con animación al cargar |
| `TiltCard.tsx` | Card con efecto 3D al hover |
| `MagneticButton.tsx` | Botón que sigue al cursor |
| `ScrollProgress.tsx` | Barra de progreso de scroll |
| `Reloj.tsx` | Reloj en vivo |
| `CustomCursor.tsx` | Cursor personalizado |
| `ValorCard.tsx` | Card decorativa de valores institucionales |
| `SectionHeader.tsx` | Header común para secciones |
| `PageBackdrop.tsx` | Fondo con elementos flotantes |
| `CopyButton.tsx` | Botón "copiar al portapapeles" |

---

## 118. Componentes privados (UI)

**Carpeta:** `src/components/privado/`

| Componente | Función |
|---|---|
| `PrivateShell.tsx` | Shell completo (sidebar + topbar + main) |
| `PrivateSidebar.tsx` | Sidebar con grupos colapsables |
| `Topbar.tsx` | Barra superior con saludo, foto, campana |
| `NotificationBell.tsx` | Campana de notificaciones |
| `PageTransition.tsx` | Animación al cambiar de ruta |
| `DashboardHero.tsx` | Hero saludo del dashboard |
| `AnimatedStat.tsx` | Card de estadística con número animado |
| `DataTable.tsx` | Tabla con paginación, búsqueda, sort |
| `ui.tsx` | Kit de UI: `Card`, `PageHeader`, `Badge`, `EmptyState`, etc. |

---

## 119. Componentes específicos

| Componente | Función |
|---|---|
| `AdminResetPasswordButton.tsx` | Botón para reset de password desde admin |
| `AvatarUploader.tsx` | Subida de avatar con preview |
| `ConfirmButton.tsx` | Botón con confirmación antes de actuar |
| `EmojiFilePicker.tsx` | Picker de emoji y archivo combinado |
| `FloatingSocial.tsx` | Botón flotante con redes sociales |
| `PrintButton.tsx` | Botón "imprimir" |
| `PWARegister.tsx` | Registra el service worker PWA |
| `Sidebar.tsx` | Sidebar antiguo (deprecado, reemplazado por PrivateSidebar) |
| `chat/ChatGrupal.tsx` | Render de chat grupal |
| `chat/ChatGrupalForm.tsx` | Form para enviar mensaje en chat |
| `mensajes/Adjunto.tsx` | Renderer de adjunto |
| `mensajes/MessageComposer.tsx` | Composer de mensajes |
| `avisos/AvisosList.tsx` | Lista de avisos |
| `avisos/MarcarLeidoClient.tsx` | Marca aviso como leído |
| `calendario/CalendarioView.tsx` | Vista de calendario |
| `solicitudes/Conversacion.tsx` | Hilo de chat dentro de solicitud (NUEVO) |

---

## 120. Librerías de utilidades

**Carpeta:** `src/lib/`

| Módulo | Función |
|---|---|
| `supabase/server.ts` | `createClient()` con cookies de sesión |
| `supabase/admin.ts` | `adminClient()` con service role |
| `supabase/client.ts` | Client browser-side |
| `auth.ts` | Helpers de autenticación |
| `queries.ts` | Queries reutilizables (getAlumnoActual, getHistorialAcademico, getEvaluacionGeneral, etc.) |
| `alertas.ts` | Motor de alertas institucionales |
| `notificaciones.ts` | `getNotificaciones()`, `crearNotificacion()` |
| `mensajes.ts` | `ensureHilo()`, `postMensaje()` |
| `grupos.ts` | Helpers de grupos |
| `reconocimientos.ts` | Helpers de reconocimientos |
| `csv.ts` | Parse/dump de CSV para imports |
| `saludo.ts` | `saludoPorHora()` — devuelve "Buenos días/tardes/noches" |
| `pdf/Boleta.tsx` | Componente PDF de boleta |
| `pdf/Kardex.tsx` | Componente PDF de kardex |
| `pdf/ConstanciaServicio.tsx` | Componente PDF de constancia |
| `riesgo/score.ts` | Motor de detección de riesgo (Bloque 5) |
| `email/send.ts` | Envío de correos vía Resend |

---

# PARTE XII — PWA, despliegue y mantenimiento

## 121. Configuración PWA

### Archivos clave

- **`public/manifest.json`** — manifest PWA con:
  - `name`, `short_name`
  - `start_url`: `/`
  - `display`: `standalone`
  - `theme_color`: verde institucional
  - `background_color`: crema
  - Iconos en varios tamaños
- **`public/sw.js`** — service worker (cache básico de assets estáticos)
- **`PWARegister.tsx`** — registra el SW al cargar la app

### Comportamiento

- En móvil, el navegador ofrece "Instalar app" → queda como ícono en home screen
- Funciona offline para vistas ya cacheadas (limitado, no para queries en vivo)

---

## 122. Despliegue desde cero

### Para una instalación nueva

```bash
# 1. Clonar el repo
git clone https://github.com/Fredyxon2001/epo221.git
cd epo221

# 2. Instalar dependencias
npm install

# 3. Configurar variables locales
cp .env.example .env.local
# Editar .env.local con valores reales

# 4. Aplicar schema a una nueva instancia Supabase
# Desde dashboard de Supabase ejecutar:
# - supabase/schema.sql
# - supabase/storage.sql
# - supabase/views.sql
# - supabase/seed.sql
# - supabase/bootstrap_admin.sql

# 5. Desarrollo local
npm run dev
# Abre http://localhost:3000

# 6. Para deploy en Vercel
# Conectar repo en vercel.com/new
# Agregar mismas variables de entorno
# Push a main → deploy automático
```

### Variables a configurar en Vercel

(Ver sección 5)

---

## 123. Operaciones diarias

### Para Admin / Personal

| Frecuencia | Tarea | Ruta |
|---|---|---|
| Diaria | Revisar bandeja de extraordinarios | `/admin/extraordinarios` |
| Diaria | Revisar solicitudes nuevas (escalamiento) | `/director/solicitudes` |
| Diaria | Revisar dashboard de riesgo | `/admin/riesgo` |
| Semanal | Revisar planeaciones enviadas | `/admin/planeaciones?estado=enviada` |
| Semanal | Verificar bitácora de correos | `/admin/correos` |
| Quincenal | Capturar pagos del periodo | `/admin/pagos` |
| Mensual | Reportes a SEIEM | `/admin/generaciones` + exportes |

### Para Docente

| Frecuencia | Tarea | Ruta |
|---|---|---|
| Diaria (clase) | Pasar lista | `/profesor/grupo/[id]/asistencia` |
| Diaria (clase) | Llenar bitácora | `/profesor/grupo/[id]/bitacora` |
| Cuando aplique | Reportar conducta | `/profesor/conducta` |
| Por parcial | Capturar calificaciones | `/profesor/grupo/[id]` o `/admin/calificaciones` |
| Por parcial | Subir planeación | `/profesor/planeaciones` |
| Continuo | Responder solicitudes | `/profesor/solicitudes` |
| Continuo | Responder mensajes | `/profesor/mensajes` |
| Continuo | Calificar tareas/exámenes | `/profesor/tareas`, `/profesor/examenes` |

### Para Alumno

| Frecuencia | Tarea |
|---|---|
| Diaria | Revisar avisos y notificaciones |
| Diaria | Entregar tareas pendientes |
| Cuando aplique | Solicitar revisión de calificación |
| Cuando aplique | Solicitar tutoría |
| Por parcial | Evaluar a docentes (si hay periodo abierto) |

---

## 124. Procesos completos por escenario

### 124.1 Inicio de ciclo escolar

1. **Admin** activa nuevo ciclo en `/admin/ciclos` (esto desactiva el anterior)
2. **Admin** configura parciales en `/admin/parciales`
3. **Admin** crea grupos en `/admin/grupos`
4. **Admin** asigna orientador a cada grupo
5. **Admin** sube asignaciones (materia × grupo × profesor) en `/admin/asignaciones`
6. **Admin** define horarios en `/admin/horarios`
7. **Admin** inscribe alumnos a sus grupos
8. **Admin** abre periodo de evaluación docente en `/admin/eval-docente` (para mid-semester)
9. **Admin** aplica cargos automáticos (inscripción, mensualidades) desde `/admin/conceptos`

### 124.2 Captura de calificaciones de un parcial

1. **Admin** abre captura en `/admin/parciales`
2. **Profesor** entra a su grupo en `/profesor/grupo/[id]`
3. **Profesor** captura por alumno o usa CSV import
4. **Profesor** envía planeación del parcial en `/profesor/planeaciones`
5. **Admin** cierra captura cuando se cumple plazo
6. **Alumnos** reciben notificación: "Calificaciones del parcial X disponibles"
7. **Alumnos** pueden solicitar revisión si discrepan

### 124.3 Solicitud de revisión y resolución

1. **Alumno** desde `/alumno/calificaciones` clic en "Solicitar revisión" en una materia/parcial
2. Llena motivo + adjunto opcional
3. Sistema crea `solicitudes_revision` con estado `abierta`
4. **Profesor** recibe notificación
5. **Profesor** desde `/profesor/solicitudes` lee y responde con `ResponderForm` o usa la nueva conversación
6. **Alumno** puede continuar conversación con más mensajes y archivos
7. Cuando se resuelve, cualquiera puede dar **🔒 Cerrar**
8. Si vuelve a haber dudas, **🔓 Reabrir** vuelve a `abierta`

### 124.4 Aplicación de extraordinario

1. **Alumno** con materia reprobada solicita en `/alumno/extraordinarios`
2. **Admin** revisa y aprueba en `/admin/extraordinarios`
3. **Alumno** recibe notificación con folio y fecha
4. Día del examen, **profesor** aplica
5. **Admin** captura calificación del extraordinario
6. Sistema actualiza `calificaciones.e1/e2/e3/e4` y recalcula `promedio_final`
7. Si aprueba, materia queda como aprobada en kardex

### 124.5 Detección y atención de alumno en riesgo

1. **Cron** corre diariamente 6 AM y genera snapshots
2. Si detecta nivel `critico`, **notifica al orientador** del grupo
3. **Orientador** entra a `/profesor/riesgo` y revisa
4. **Orientador** abre conversación con alumno y/o tutor
5. **Orientador** registra acciones en `notas_orientador`
6. **Cron de lunes** envía resumen semanal al tutor por correo
7. **Admin** monitorea desde `/admin/riesgo`

### 124.6 Evaluación docente cuatrimestral

1. **Admin** crea periodo en `/admin/eval-docente` con dimensiones a evaluar
2. **Alumnos** reciben notificación
3. **Alumno** entra a `/alumno/eval-docente` y responde por cada profesor
4. Sistema verifica vía hash que no haya doble voto
5. Periodo abierto durante X semanas
6. **Admin** cierra periodo
7. **Profesor** consulta resultados agregados en `/profesor/eval-docente`
8. **Director** consulta vista institucional

### 124.7 Generación de constancia de servicio

1. **Profesor** entra a `/profesor/constancia`
2. Selecciona el ciclo
3. Click en **📄 Descargar PDF**
4. Sistema genera PDF al vuelo con su carga horaria
5. Profesor imprime y sella en dirección si requiere validez oficial

---

## 125. Backup y recuperación

### Backups automáticos

Supabase realiza backups automáticos:
- **Plan Free:** daily backups por 7 días
- **Plan Pro:** Point-In-Time Recovery (PITR) por 7 días, daily por 30 días

### Backups manuales

Recomendado mensualmente:

```bash
# Desde la consola Supabase, descargar dump SQL
# o usando supabase CLI:
supabase db dump -f backup-$(date +%Y%m%d).sql
```

### Backup de archivos

Los buckets de storage también se respaldan junto con la BD.

### Recuperación

1. En dashboard Supabase: Database → Backups → Restore
2. Para PITR: especificar timestamp exacto
3. La app se reconecta automáticamente al volver el servicio

---

# PARTE XIII — Apéndices

## 126. Glosario institucional

| Término | Definición |
|---|---|
| **EPO 221** | Escuela Preparatoria Oficial No. 221 "Nicolás Bravo" |
| **CCT** | Clave de Centro de Trabajo (15EBH0409B) |
| **SEIEM** | Servicios Educativos Integrados al Estado de México |
| **BG** | Bachillerato General |
| **Parcial** | Periodo de evaluación dentro del semestre (se manejan 3 parciales) |
| **Extraordinario** | Examen para acreditar materia reprobada |
| **Orientador** | Docente designado para acompañar a un grupo específico |
| **Tutor** | Padre/madre o responsable legal del alumno |
| **Asignación** | Combinación única de materia × grupo × profesor × ciclo |
| **Inscripción** | Registro del alumno en un grupo para un ciclo |
| **Kardex** | Documento histórico de calificaciones del alumno |
| **Boleta** | Documento de calificaciones del ciclo en curso |
| **Constancia de servicio** | Documento oficial de carga horaria del docente |
| **Planeación didáctica** | Plan de clase del docente por parcial |
| **Solicitud de revisión** | Petición del alumno para revisar una calificación |
| **Reconocimiento** | Mención positiva al alumno que se refleja en kardex |

---

## 127. Códigos y enums

### Roles (`rol_usuario`)

- `alumno`
- `profesor`
- `admin`
- `staff`
- `director`

### Estados de solicitud de revisión

- `abierta`
- `respondida`
- `aceptada`
- `rechazada`
- `cerrada`

### Estados de planeación

- `borrador`
- `enviada`
- `aprobada`
- `rechazada`

### Niveles de riesgo

- `bajo` (0-24)
- `medio` (25-49)
- `alto` (50-74)
- `critico` (75-100)

### Estados de pago

- `pendiente`
- `pagado`
- `vencido`

### Estados de extraordinario

- `solicitado`
- `aprobado`
- `rechazado`
- `aplicado`

### Tipos de reporte de conducta

- `negativo`
- `positivo`

### Estados de correo

- `enviado`
- `error`
- `skipped`

### Días de la semana (en horarios y tutorías)

- 1 = Lunes
- 2 = Martes
- 3 = Miércoles
- 4 = Jueves
- 5 = Viernes
- 6 = Sábado (poco usado)
- 0 = Domingo

### Letras de grupo (`grupo` smallint)

- 1 = A
- 2 = B
- 3 = C
- 4 = D
- 5 = E

Convertido a letra con `String.fromCharCode(64 + n)`.

---

## 128. Convenciones de código

### Nombrado

- **Carpetas en español kebab-case** para rutas: `eval-docente`, `chat-grupal`, `cambiar-password`
- **Archivos en PascalCase** para componentes: `ResponderForm.tsx`, `ChatGrupal.tsx`
- **Archivos en camelCase** para libs: `actions.ts`, `score.ts`
- **Tablas BD en snake_case plural en español**: `eval_docente_periodos`

### Server Actions

- Marcar con `'use server'` al inicio
- Devolver `{ ok?: true; error?: string; ...payload }`
- Validar sesión y permisos primero
- Llamar `revalidatePath()` al final

### Componentes Cliente

- Marcar con `'use client'` al inicio
- Usar `useTransition` para llamar actions
- Mantener estado local mínimo (preferir state derivado)

### Estilos

- Usar Tailwind preferentemente
- Solo clases custom en `globals.css` para algo realmente reusable
- Colores institucionales: `verde`, `verde-oscuro`, `verde-medio`, `verde-claro`, `dorado`, `dorado-claro`, `crema`

---

## 129. Tabla maestra de rutas

### Públicas

| Ruta | Función |
|---|---|
| `/` | Redirect a `/publico` |
| `/publico` | Home |
| `/publico/noticias` | Listado |
| `/publico/noticias/[slug]` | Detalle |
| `/publico/convocatorias` | Listado |
| `/publico/oferta` | Oferta educativa |
| `/publico/albumes` | Galería |
| `/publico/albumes/[slug]` | Álbum |
| `/publico/p/[slug]` | Página estática CMS |
| `/publico/descargas` | Repositorio PDFs |
| `/publico/contacto` | Contacto |
| `/login` | Login |
| `/recuperar` | Solicitar reset |
| `/cambiar-password` | Cambiar password |
| `/calendario/ics` | iCalendar export |

### Admin

| Ruta | Función |
|---|---|
| `/admin` | Dashboard |
| `/admin/alumnos` | Gestión alumnos |
| `/admin/alumnos/[id]` | Detalle alumno |
| `/admin/alumnos/[id]/historial` | Historial completo |
| `/admin/profesores` | Gestión profesores |
| `/admin/usuarios` | Gestión usuarios/auth |
| `/admin/grupos` | Grupos |
| `/admin/grupos/[id]` | Detalle grupo |
| `/admin/grupos/[id]/boletas` | Boletas masivas |
| `/admin/materias` | Materias |
| `/admin/asignaciones` | Asignaciones |
| `/admin/horarios` | Horarios |
| `/admin/calificaciones` | Captura |
| `/admin/ciclos` | Ciclos |
| `/admin/parciales` | Config parciales |
| `/admin/planeaciones` | Bandeja revisión |
| `/admin/eval-docente` | Periodos evaluación |
| `/admin/generaciones` | Analítica |
| `/admin/alertas` | Alertas |
| `/admin/riesgo` | Detección riesgo |
| `/admin/correos` | Bitácora correos |
| `/admin/pagos` | Pagos |
| `/admin/conceptos` | Conceptos |
| `/admin/extraordinarios` | Extraordinarios |
| `/admin/noticias` | CMS noticias |
| `/admin/convocatorias` | CMS convocatorias |
| `/admin/anuncios` | Anuncios |
| `/admin/avisos` | Avisos |
| `/admin/calendario` | Eventos |
| `/admin/publico` | CMS público |
| `/admin/publico/inicio` | Editor home |
| `/admin/publico/config` | Config sitio |
| `/admin/publico/paginas` | Páginas estáticas |
| `/admin/publico/paginas/[id]` | Editor página |
| `/admin/publico/albumes` | Álbumes |
| `/admin/publico/albumes/[id]` | Editor álbum |
| `/admin/publico/redes` | Redes sociales |
| `/admin/auditoria` | Auditoría |

### Profesor

| Ruta | Función |
|---|---|
| `/profesor` | Dashboard |
| `/profesor/grupos` | Mis grupos |
| `/profesor/grupo/[asignacionId]` | Detalle |
| `/profesor/grupo/[id]/asistencia` | Asistencia |
| `/profesor/grupo/[id]/bitacora` | Bitácora |
| `/profesor/grupo/[id]/analisis` | Análisis |
| `/profesor/grupo/[id]/comparativa` | Comparativa |
| `/profesor/grupo/[id]/reconocimientos` | Reconocimientos |
| `/profesor/horario` | Horario |
| `/profesor/orientacion` | Orientación |
| `/profesor/riesgo` | Mis alumnos en riesgo |
| `/profesor/conducta` | Reportar conducta |
| `/profesor/conducta/bandeja` | Bandeja |
| `/profesor/tareas` | Tareas |
| `/profesor/tareas/nueva` | Crear tarea |
| `/profesor/tareas/[id]` | Detalle/calificar |
| `/profesor/examenes` | Exámenes |
| `/profesor/examenes/nuevo` | Crear examen |
| `/profesor/examenes/[id]` | Editar/calificar |
| `/profesor/portafolio` | Portafolio |
| `/profesor/rubricas` | Rúbricas |
| `/profesor/rubricas/[id]` | Editor rúbrica |
| `/profesor/chat` | Chats grupos |
| `/profesor/chat/[asignacionId]` | Chat individual |
| `/profesor/tutores` | Directorio |
| `/profesor/tutorias` | Tutorías |
| `/profesor/planeaciones` | Planeaciones |
| `/profesor/eval-docente` | Mi evaluación |
| `/profesor/constancia` | Constancia |
| `/profesor/mensajes` | Mensajes |
| `/profesor/mensajes/nuevo` | Nuevo mensaje |
| `/profesor/mensajes/[alumnoId]` | Hilo |
| `/profesor/avisos` | Avisos |
| `/profesor/avisos/nuevo` | Crear aviso |
| `/profesor/calendario` | Calendario |
| `/profesor/solicitudes` | Solicitudes |
| `/profesor/perfil` | Perfil |

### Alumno

| Ruta | Función |
|---|---|
| `/alumno` | Dashboard |
| `/alumno/horario` | Horario |
| `/alumno/calificaciones` | Calificaciones |
| `/alumno/boleta` | Boleta |
| `/alumno/tareas` | Tareas |
| `/alumno/tareas/[id]` | Detalle/entregar |
| `/alumno/examenes` | Exámenes |
| `/alumno/examenes/[id]` | Presentar |
| `/alumno/portafolio` | Portafolio |
| `/alumno/extraordinarios` | Extraordinarios |
| `/alumno/chat` | Chats |
| `/alumno/chat/[asignacionId]` | Chat |
| `/alumno/tutorias` | Tutorías |
| `/alumno/eval-docente` | Evaluar docentes |
| `/alumno/solicitudes` | Mis solicitudes |
| `/alumno/mensajes` | Mensajes |
| `/alumno/mensajes/nuevo` | Nuevo |
| `/alumno/mensajes/[profesorId]` | Hilo |
| `/alumno/avisos` | Avisos |
| `/alumno/calendario` | Calendario |
| `/alumno/estado-cuenta` | Estado cuenta |
| `/alumno/ficha` | Ficha |

### Director

| Ruta | Función |
|---|---|
| `/director/academico` | Resumen ejecutivo |
| `/director/anuncios` | Anuncios oficiales |
| `/director/solicitudes` | Solicitudes (escalamiento) |

### API

| Ruta | Función |
|---|---|
| `/api/boleta/[alumnoId]` | PDF boleta |
| `/api/kardex/[alumnoId]` | PDF kardex |
| `/api/constancia/[profesorId]` | PDF constancia |
| `/api/comprobante/[pagoId]` | PDF comprobante |
| `/api/export/materias` | Excel materias |
| `/api/cron/calcular-riesgo` | Cron riesgo |
| `/api/cron/resumen-semanal` | Cron correos |

---

## 130. Pendientes y roadmap

### Pendientes operativos

- ⚠️ Verificar que se hayan revocado los tokens compartidos en chat (3 GitHub PATs + 1 Vercel token)
- 📨 Crear cuenta en Resend para activar correos reales
- 🌐 Apuntar dominio propio en Vercel (ej. `sistema.epo221.edu.mx`)
- 👥 Agregar a Mauricio (`mauriosvp@gmail.com`) y David (`deividortiz260@gmail.com`) como colaboradores GitHub

### Roadmap funcional

| Prioridad | Feature | Notas |
|---|---|---|
| Alta | App móvil React Native | Reusa el mismo backend Supabase |
| Alta | Notificaciones push web | Web Push API + Service Worker |
| Media | Integración SAID Edomex | Sincronización con sistema estatal |
| Media | Inscripciones en línea | Con flujo de pago Stripe/OpenPay |
| Media | Módulo biblioteca | Préstamo de libros con código QR |
| Media | Dashboard BI institucional | Métricas avanzadas tipo Power BI |
| Baja | Modo oscuro | UI con toggle |
| Baja | Buscador global Cmd+K | Búsqueda cross-entidades |
| Baja | Exportes a Excel desde cualquier listado | Botón universal |
| Baja | IA generativa para sugerencias | Anthropic API en intervenciones críticas |

### Mejoras técnicas

- Migrar `tsconfig.tsbuildinfo` a artifact ignorado (✅ ya hecho)
- Eliminar errores TypeScript pre-existentes en módulos legacy
- Cubrir con tests E2E (Playwright) los flujos críticos
- Implementar rate limiting en APIs públicas

---

## Cierre

Este manual cubre el **estado integral del sistema EPO 221 al 25 de abril de 2026**, desde su origen como mockup HTML hasta el sistema de producción multi-rol con detección de riesgo, evaluación docente anónima, planeación didáctica con versionado, generación de PDFs oficiales, crons de monitoreo continuo y comunicación bidireccional con tutores.

El sistema queda **operativo, documentado y mantenible**, con arquitectura modular que permite agregar funcionalidades sin alterar lo existente, y con seguridad por diseño (RLS exhaustivo, anonimato verificable, auditoría de acciones críticas).

Cualquier persona técnica que herede el proyecto puede:
1. Leer este manual
2. Clonar el repo
3. Configurar las variables de entorno
4. Levantar el ambiente local en minutos
5. Empezar a iterar sin perder el contexto histórico

— **Fin del manual**
