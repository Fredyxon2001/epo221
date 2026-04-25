# Referencia Técnica del Código — Sistema EPO 221

> **Complemento al MANUAL_COMPLETO.md.** Este documento describe **archivo por archivo** y **función por función** cómo está construido el código del sistema.
> **Total:** ~23,400 líneas de TypeScript/TSX en `src/`, distribuidas en 112 páginas, 48 archivos de actions, 47 componentes y 12 módulos de lib.

---

## ÍNDICE TÉCNICO

### Parte A — Configuración base
- [A1. package.json y dependencias](#a1-packagejson-y-dependencias)
- [A2. tsconfig.json](#a2-tsconfigjson)
- [A3. tailwind.config.ts](#a3-tailwindconfigts)
- [A4. next.config.mjs](#a4-nextconfigmjs)
- [A5. middleware.ts](#a5-middlewarets)
- [A6. app/layout.tsx (raíz)](#a6-applayouttsx-raíz)
- [A7. globals.css](#a7-globalscss)

### Parte B — Capa de datos (`src/lib/supabase/`)
- [B1. server.ts — cliente con sesión](#b1-serverts--cliente-con-sesión)
- [B2. admin.ts — service role](#b2-admints--service-role)
- [B3. client.ts — browser](#b3-clientts--browser)

### Parte C — Librerías de utilidades (`src/lib/`)
- [C1. queries.ts — queries reusables](#c1-queriests--queries-reusables)
- [C2. auth.ts — helpers de auth](#c2-authts--helpers-de-auth)
- [C3. alertas.ts — motor de alertas](#c3-alertasts--motor-de-alertas)
- [C4. notificaciones.ts](#c4-notificacionests)
- [C5. mensajes.ts](#c5-mensajests)
- [C6. grupos.ts](#c6-gruposts)
- [C7. reconocimientos.ts](#c7-reconocimientosts)
- [C8. csv.ts](#c8-csvts)
- [C9. saludo.ts](#c9-saludots)
- [C10. riesgo/score.ts — motor de riesgo](#c10-riesgoscorets)
- [C11. email/send.ts — Resend integration](#c11-emailsendts)
- [C12. pdf/Boleta.tsx](#c12-pdfboletatsx)
- [C13. pdf/Kardex.tsx](#c13-pdfkardextsx)
- [C14. pdf/ConstanciaServicio.tsx](#c14-pdfconstanciaserviciotsx)

### Parte D — Server Actions (48 archivos)
- [D1. Auth y sesión](#d1-auth-y-sesión)
- [D2. Acciones de admin](#d2-acciones-de-admin)
- [D3. Acciones de profesor](#d3-acciones-de-profesor)
- [D4. Acciones de alumno](#d4-acciones-de-alumno)
- [D5. Acciones compartidas (transversales)](#d5-acciones-compartidas)

### Parte E — Componentes UI
- [E1. Componentes públicos](#e1-componentes-públicos)
- [E2. Componentes privados (UI kit)](#e2-componentes-privados-ui-kit)
- [E3. Componentes específicos](#e3-componentes-específicos)

### Parte F — Páginas server-rendered
- [F1. Patrón canónico de página](#f1-patrón-canónico-de-página)
- [F2. Páginas notables explicadas](#f2-páginas-notables-explicadas)

### Parte G — API Routes
- [G1. PDFs (route handlers)](#g1-pdfs-route-handlers)
- [G2. Crons](#g2-crons)
- [G3. Exportes](#g3-exportes)

### Parte H — Patrones recurrentes
- [H1. Pattern: Server action con archivo](#h1-pattern-server-action-con-archivo)
- [H2. Pattern: Form cliente con useTransition](#h2-pattern-form-cliente-con-usetransition)
- [H3. Pattern: Notificación cruzada](#h3-pattern-notificación-cruzada)
- [H4. Pattern: Storage path + signed URL](#h4-pattern-storage-path--signed-url)
- [H5. Pattern: Soft delete](#h5-pattern-soft-delete)

---

# PARTE A — Configuración base

## A1. package.json y dependencias

```json
{
  "name": "epo221-sistema",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@react-pdf/renderer": "^4.0.0",   // PDFs server-side
    "@supabase/ssr": "^0.5.0",          // Auth con cookies en SSR
    "@supabase/supabase-js": "^2.45.0", // Cliente Supabase
    "framer-motion": "^12.38.0",        // Animaciones
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.15",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.3"
  }
}
```

**Notas técnicas:**
- `xlsx` se carga desde CDN (no de npm) por temas de licencia/builds
- No hay testing unitario; solo E2E con Playwright (carpeta `tests/` no commitear)
- `framer-motion` se usa principalmente en `PageTransition` y componentes públicos animados
- `zod` se usa para validar inputs en algunos forms críticos (no es masivo)

## A2. tsconfig.json

Path alias `@/*` → `src/*`. Modo estricto activado pero con `noImplicitAny` permisivo en algunos archivos (legacy).

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## A3. tailwind.config.ts

Define la **paleta institucional** y extiende fonts:

```ts
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        verde: '#1a5c2e',
        'verde-oscuro': '#0f4233',
        'verde-medio': '#2d8047',
        'verde-claro': '#4caf70',
        dorado: '#c9a227',
        'dorado-claro': '#f0c84a',
        crema: '#faf6ed',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
};
```

## A4. next.config.mjs

```js
export default {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },  // imágenes de bucket
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '15mb' },  // permite uploads de 15MB
  },
};
```

## A5. middleware.ts

**Función:** intercepta TODAS las rutas y maneja sesión + redirects.

```typescript
// Pseudo-resumen del archivo
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createServerClient(URL, ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) =>
        response.cookies.set({ name, value, ...options })
      ),
    },
  });
  await supabase.auth.getUser();  // refresca cookies
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Qué hace:**
- En cada request refresca la sesión Supabase (los cookies tienen TTL corto).
- Si el access token expiró pero el refresh token sigue válido, lo renueva transparentemente.
- No bloquea acceso por sí solo — los layouts privados validan rol y redirectean.

## A6. app/layout.tsx (raíz)

Layout de TODA la aplicación. Define:
- Lang `es`
- Fonts vía `next/font/google` para Playfair Display y DM Sans
- Metadata SEO base
- `<body>` con clase `font-sans` y color crema
- Carga `PWARegister.tsx` para registrar service worker

## A7. globals.css

- Reset CSS mínimo
- Variables CSS legacy heredadas del HTML original (algunas no se usan ya que migramos a Tailwind)
- Animaciones keyframe para `Marquee`, `Reveal`, `AnimatedStat`
- Estilos para `.alto-contraste` (modo accesibilidad)

---

# PARTE B — Capa de datos

## B1. server.ts — cliente con sesión

**Archivo:** `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) =>
          cookieStore.set({ name, value, ...options })
        ),
      },
    }
  );
};
```

**Uso:** en TODA server component / server action / route handler. Devuelve cliente Supabase atado a la sesión del usuario actual (vía cookies). **Respeta RLS automáticamente.**

```typescript
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
const { data, error } = await supabase.from('alumnos').select('*');
```

## B2. admin.ts — service role

**Archivo:** `src/lib/supabase/admin.ts`

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const adminClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
```

**Uso:** SOLO en server actions controlados que necesitan **bypass de RLS**:
- Subida de archivos a buckets (las políticas de path requieren validar manualmente)
- Inserción de notificaciones a otros usuarios
- Crons que no tienen sesión
- Procesos masivos (cargo masivo, recálculo de riesgo)

```typescript
const admin = adminClient();
await admin.storage.from('tareas').upload(path, file);
await admin.from('notificaciones').insert({ perfil_id: targetUser, ... });
```

## B3. client.ts — browser

**Archivo:** `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
```

**Uso:** en `'use client'` components que necesitan llamar Supabase (suscripciones realtime, queries reactivas). En esta app prácticamente no se usa porque casi todo es server-side; solo aparece en componentes muy interactivos.

---

# PARTE C — Librerías de utilidades

## C1. queries.ts — queries reusables

**Archivo:** `src/lib/queries.ts`

Exporta 6 funciones de consulta usadas por múltiples páginas:

### `getAlumnoActual()`
```typescript
export async function getAlumnoActual()
```
**Returns:** Objeto `alumno` del usuario actual o `null` si no es alumno.
**Uso:** primer paso en CADA página de `/alumno/*`.
```typescript
const alumno = await getAlumnoActual();
if (!alumno) redirect('/login');
```

### `getEvaluacionGeneral(alumnoId)`
**Returns:** `{ promedio_general, total_materias, total_aprobadas, porcentaje_avance }` desde `vista_evaluacion_general`.
**Uso:** dashboards y kardex.

### `getPromediosPorSemestre(alumnoId)`
**Returns:** array de `{ semestre, promedio }`.
**Uso:** gráfica de evolución académica.

### `getPromediosAnuales(alumnoId)`
**Returns:** array de `{ ciclo, promedio }`.
**Uso:** reporte ejecutivo y SEIEM.

### `getHistorialAcademico(alumnoId)`
**Returns:** filas por `(ciclo, semestre, materia, p1, p2, p3, e1, e2, promedio_final)`.
**Uso:** kardex y boleta.

### `getEstadoCuenta(alumnoId)`
**Returns:** `{ cargos[], pagos[], saldo }` desde `vista_estado_cuenta`.
**Uso:** página de estado de cuenta del alumno.

## C2. auth.ts — helpers de auth

**Archivo:** `src/lib/auth.ts`

### `curpAEmail(curp)`
```typescript
export const curpAEmail = (curp: string) =>
  `${curp.toLowerCase()}@epo221.local`;
```
**Uso:** para alumnos sin email real, generamos uno sintético basado en CURP. El "dominio" `@epo221.local` no existe en internet, solo se usa como llave en `auth.users.email`.

### `esCurpValida(curp)`
**Returns:** boolean. Valida formato CURP (18 caracteres, regex de SEGOB).

### `passwordInicialDesdeMatricula(matricula)`
```typescript
export const passwordInicialDesdeMatricula = (matricula: string) =>
  `EPO221-${matricula}`;
```
**Uso:** al crear alumno se asigna password inicial predecible para que el alumno entre la primera vez. En su primer login se le pide cambiarla.

## C3. alertas.ts — motor de alertas

**Archivo:** `src/lib/alertas.ts`

### Tipo `Alerta`
```typescript
export type Alerta = {
  tipo: 'asignacion_sin_profesor' | 'grupo_sin_alumnos' | 'semestre_sin_cubrir'
       | 'calificacion_pendiente' | 'alumno_riesgo' | 'faltas_criticas';
  nivel: 'info' | 'warning' | 'danger';
  titulo: string;
  descripcion: string;
  url?: string;
  contexto?: any;
};
```

### `construirAlertas(supabase): Promise<Alerta[]>`

Función principal que ejecuta 5 reglas en secuencia y devuelve un array de alertas detectadas:

1. **Asignaciones sin profesor** — `WHERE profesor_id IS NULL`
2. **Grupos sin alumnos** — diferencia entre `grupos.id` y `inscripciones.grupo_id` activas
3. **Semestres sin cubrir** — semestres `[1..6]` que no tienen ningún grupo
4. **Alumnos en riesgo** — `WHERE promedio_final < 7`
5. **Faltas críticas** — sum de `faltas_p1+p2+p3 > 15`

### `nivelStyle`

Mapeo de `Alerta['nivel']` a clases Tailwind para la UI:
```typescript
{
  info:    { bg, border, icon: 'ℹ️', text },
  warning: { bg, border, icon: '⚠️', text },
  danger:  { bg, border, icon: '🚨', text },
}
```

## C4. notificaciones.ts

**Archivo:** `src/lib/notificaciones.ts`

### `getNotificaciones(userId, limit = 10)`
**Returns:** `{ items: [...], noLeidas: number }`. Usado en cada layout privado para popular la campana del Topbar.

### `marcarNotificacionesLeidas(userId, ids?)`
Si `ids` es undefined, marca TODAS como leídas. Si se pasa array, solo esas. Disparado al abrir el dropdown de la campana.

## C5. mensajes.ts

**Archivo:** `src/lib/mensajes.ts`

### `ensureHilo(supabase, profesorId, alumnoId, autorTipo)`
**Returns:** `hiloId` (uuid). Si ya existe hilo entre ese profesor y alumno, lo retorna; si no, lo crea.

### `postMensaje(supabase, { hiloId, autorId, autorTipo, cuerpo, solicitudId? })`
Inserta mensaje en `mensajes` y actualiza `mensajes_hilos.last_msg_at`.

## C6. grupos.ts

**Archivo:** `src/lib/grupos.ts`

Helpers puros (sin BD) para nomenclatura de grupos:

| Función | Returns | Uso |
|---|---|---|
| `gradoDeSemestre(s)` | `1\|2\|3` | semestre 1-2 → 1°, 3-4 → 2°, 5-6 → 3° |
| `codigoGrupo(grado, n)` | `"1A"`, `"2B"` etc. | Etiqueta corta |
| `codigoGrupoDesdeSemestre(s, n)` | igual pero infiere grado | |
| `labelGrupo({grado, semestre, grupo, turno})` | `"1° A matutino"` | Para UI |
| `paridadSemestre(s)` | `'nones' \| 'pares'` | Para inscripciones |
| `siguienteSemestre(s)` | `s+1` o `null` si es 6 | Promoción de grupos |
| `generacionPorIngreso(fecha, semestre=1)` | `"2025-2028"` | Generación calculada |

## C7. reconocimientos.ts

**Archivo:** `src/lib/reconocimientos.ts`

### Tipo `Badge`
```typescript
export type Badge = {
  clave: string;       // ej. 'sobresaliente', 'puntualidad'
  label: string;
  descripcion: string;
  tono: 'verde' | 'dorado' | 'azul' | 'rosa';
};
```

### `calcularBadges(alumno, calificaciones, asistencias, conducta): Badge[]`
Función pura que evalúa el desempeño del alumno y devuelve los badges aplicables (ej. "Excelencia académica", "Puntualidad perfecta", "Mejora notable").

### `tonoClases`
Mapeo de `tono` a clases Tailwind para renderizar el badge.

## C8. csv.ts

**Archivo:** `src/lib/csv.ts`

### `toCSV(rows, headers): string`
Serializa array de objetos a CSV con escapeo de comillas/saltos de línea. Headers: `[{key: 'nombre', label: 'Nombre'}, ...]`.

### `csvResponse(csv, filename): Response`
Envuelve el CSV en una `Response` con headers `Content-Type: text/csv; charset=utf-8` y `Content-Disposition: attachment; filename=...`.
**Uso:** retorna desde route handlers para forzar descarga.

## C9. saludo.ts

**Archivo:** `src/lib/saludo.ts`

### `saludoPorHora(date = new Date()): string`
```typescript
< 12  → "Buenos días"
< 19  → "Buenas tardes"
else  → "Buenas noches"
```
Usado en cada Topbar.

## C10. riesgo/score.ts

**Archivo:** `src/lib/riesgo/score.ts` (motor del Bloque 5)

### Tipos
```typescript
export type Factor = {
  clave: string;       // 'reprobadas', 'faltas_altas', etc.
  etiqueta: string;    // texto humano
  peso: number;        // contribución 0-100
  detalle: string;     // explicación al hover
};

export type RiesgoAlumno = {
  alumno_id: string;
  score: number;
  nivel: 'bajo' | 'medio' | 'alto' | 'critico';
  factores: Factor[];
  recomendacion: string;
};
```

### `nivelDeScore(score): RiesgoAlumno['nivel']`
```
0-24  → bajo
25-49 → medio
50-74 → alto
75+   → critico
```

### `calcularRiesgoCiclo(supabase, cicloId): Promise<RiesgoAlumno[]>`

Función principal. Pseudo-código:

```typescript
async function calcularRiesgoCiclo(supabase, cicloId) {
  // 1. Obtener alumnos inscritos al ciclo
  // 2. Cargar calificaciones, conductas, tareas, pagos en bulk
  // 3. Por cada alumno:
  //    - Aplicar reglas con pesos
  //    - score = suma capeada en 100
  //    - nivel = nivelDeScore(score)
  //    - recomendacion = recomendarAcciones(nivel, factores)
  // 4. Retornar array de RiesgoAlumno
}
```

### `recomendarAcciones(nivel, factores): string` (interna)
Construye texto de recomendación combinando acciones según factores presentes (canalizar a tutoría, citar tutor, intervención de orientación, etc.).

## C11. email/send.ts

**Archivo:** `src/lib/email/send.ts`

### Tipo `EnviarCorreoParams`
```typescript
export type EnviarCorreoParams = {
  tipo: string;            // ej. 'resumen_semanal_tutor'
  destinatario: string;    // email
  asunto: string;
  html: string;
  texto?: string;
  referencia_id?: string;  // ej. alumno_id
};
```

### `enviarCorreo(p): Promise<{ ok, error?, skipped? }>`

Lógica:

1. Verificar duplicados en últimos 7 días → si existe, retornar `{ skipped: true }` y log
2. Si NO hay `RESEND_API_KEY` → log como `skipped` y retornar
3. POST a `https://api.resend.com/emails`
4. Si error → log con detalle
5. Si OK → log como `enviado`

### `envolverEmailHtml({ titulo, cuerpo, ctaLabel?, ctaUrl? }): string`
Plantilla institucional con header verde/dorado, branding EPO 221 y footer estándar. Devuelve HTML completo listo para enviar.

## C12. pdf/Boleta.tsx

**Archivo:** `src/lib/pdf/Boleta.tsx`

Componente `BoletaPDF` para `@react-pdf/renderer`. Render del PDF de boleta del ciclo activo:
- Encabezado con CCT y branding
- Datos del alumno
- Tabla con materias del ciclo
- Promedio del ciclo
- Firmas

## C13. pdf/Kardex.tsx

**Archivo:** `src/lib/pdf/Kardex.tsx`

Componente `KardexPDF`. Render de kardex integral (ciclo histórico completo). Detalles en MANUAL_COMPLETO.md sección 4.2.

Helper interno `D({ k, v })` para renderizar pares clave-valor.

## C14. pdf/ConstanciaServicio.tsx

**Archivo:** `src/lib/pdf/ConstanciaServicio.tsx`

Componente `ConstanciaServicioPDF`. Render de constancia de carga horaria del docente con folio único.

---

# PARTE D — Server Actions

Las server actions son **funciones async exportadas con `'use server'`** que se invocan desde forms cliente. Patrón general:

```typescript
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function nombreAction(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  // 1. Verificar permisos
  // 2. Validar inputs
  // 3. Mutar BD
  // 4. revalidatePath()
  return { ok: true };
}
```

## D1. Auth y sesión

### `src/app/login/actions.ts`

| Función | Función |
|---|---|
| `loginAction(formData)` | Llama `signInWithPassword(email, password)` y redirect según rol |
| `logoutAction()` | `signOut()` y redirect a `/login` |

### `src/app/recuperar/actions.ts`

| Función | Función |
|---|---|
| `recuperarPassword(fd)` | Envía magic link de reset al email indicado vía `resetPasswordForEmail` |

### `src/app/cambiar-password/actions.ts`

| Función | Función |
|---|---|
| `cambiarPassword(fd)` | Valida sesión temporal y aplica `updateUser({ password })` |

### `src/app/admin/usuarios/reset-actions.ts`

| Función | Función |
|---|---|
| `adminResetPassword(fd)` | (Admin) Genera link de recovery vía `auth.admin.generateLink` y opcionalmente envía por correo. Retorna `{ ok, temporal? }` con la URL. |

## D2. Acciones de admin

### `src/app/admin/alumnos/actions.ts`

| Función | Función |
|---|---|
| `importarAlumnosExcel(formData)` | Lee XLSX con `xlsx`, valida CURP, crea `auth.users` + `perfiles` + `alumnos` en batch. Reporta errores por fila. |

### `src/app/admin/profesores/actions.ts`

| Función | Función |
|---|---|
| `crearProfesor(formData)` | Alta de profesor: crea `auth.users`, `perfiles` (rol=profesor), `profesores`. Genera password inicial. |
| `toggleProfesor(formData)` | Activa/desactiva profesor (`activo` boolean) |

### `src/app/admin/grupos/actions.ts`

| Función | Función |
|---|---|
| `crearGrupo(formData)` | Crea grupo individual |
| `crearGruposBulk(formData)` | Crea múltiples grupos a la vez (semestre, varios turnos, varias letras) |
| `crearAsignacion(formData)` | (Atajo) Crea asignación desde la vista de grupo |
| `sembrarAsignaciones(formData)` | Crea automáticamente todas las asignaciones para un grupo basadas en plan de estudios |
| `cambiarAlumnoDeGrupo(formData)` | Mueve alumno de un grupo a otro (cierra inscripción anterior, abre nueva) |
| `promoverGrupo(formData)` | Promueve grupo entero al siguiente semestre (al final del periodo) |
| `asignarOrientador(formData)` | Asigna profesor como `orientador_id` del grupo |
| `sugerirGrupoDestino(...)` | (Helper) Sugiere a qué grupo asignar un alumno entrante según turno/carrera/ocupación |

### `src/app/admin/asignaciones/actions.ts`

| Función | Función |
|---|---|
| `crearAsignacion(formData)` | Crea asignación individual |
| `actualizarProfesorAsignacion(formData)` | Cambia el profesor de una asignación |
| `eliminarAsignacion(formData)` | Elimina asignación (valida que no tenga calificaciones registradas) |

### `src/app/admin/horarios/actions.ts`

| Función | Función |
|---|---|
| `crearHorario(formData)` | Crea horario para una asignación |
| `eliminarHorario(formData)` | Elimina horario |
| `generarHorariosAutomaticos()` | Auto-genera horarios respetando que no haya conflictos para profesores y grupos |

### `src/app/admin/calificaciones/actions.ts`

| Función | Función |
|---|---|
| `importarCalificacionesCSV(formData)` | Lee CSV con calificaciones (formato SEIEM) y aplica masivamente. Valida rangos, alumnos, asignación. |

### `src/app/admin/parciales/actions.ts`

| Función | Función |
|---|---|
| `guardarParcial(formData)` | Guarda configuración de un parcial (fecha apertura, cierre, edición posterior) |

### `src/app/admin/ciclos/actions.ts`

| Función | Función |
|---|---|
| `crearCiclo(formData)` | Crea ciclo escolar |
| `activarCiclo(formData)` | Activa un ciclo (desactiva el anterior por trigger SQL) |

### `src/app/admin/materias/actions.ts`

| Función | Función |
|---|---|
| `crearMateria(formData)` | CRUD materia |
| `actualizarMateria(formData)` | |
| `eliminarMateria(formData)` | (soft delete si tiene asignaciones, hard delete si no) |

### `src/app/admin/conceptos/actions.ts`

| Función | Función |
|---|---|
| `crearConcepto(formData)` | CRUD concepto de pago |
| `actualizarConcepto(formData)` | |
| `eliminarConcepto(formData)` | |
| `toggleConcepto(formData)` | Activa/desactiva |
| `asignarMasivo(formData)` | Genera cargos en `pagos` para todos los alumnos de un grupo/generación |

### `src/app/admin/pagos/actions.ts`

| Función | Función |
|---|---|
| `validarPago(formData)` | Marca un pago como pagado, genera comprobante, notifica al alumno |
| `rechazarPago(formData)` | Rechaza pago (ej. comprobante inválido) con motivo |

### `src/app/admin/noticias/actions.ts`

| Función | Función |
|---|---|
| `crearNoticia(formData)` | CMS noticia |
| `togglePublicada(formData)` | Toggle `publicado` |
| `eliminarNoticia(formData)` | |

### `src/app/admin/convocatorias/actions.ts`

| Función | Función |
|---|---|
| `crearConvocatoria(formData)` | CMS convocatoria |
| `eliminarConvocatoria(formData)` | |

### `src/app/admin/anuncios/actions.ts`

| Función | Función |
|---|---|
| `crearAnuncio(fd)` | Crea anuncio interno |
| `eliminarAnuncio(fd)` | |
| `togglePublicado(fd)` | |

### `src/app/admin/publico/inicio/actions.ts`

| Función | Función |
|---|---|
| `guardarInicio(formData)` | Guarda config del home (textos del hero, secciones visibles) |
| `quitarHeroImagen()` | Elimina la imagen del hero de storage |
| `quitarLogo()` | Elimina logo (si se cambió por uno custom) |

### `src/app/admin/publico/config/actions.ts`

| Función | Función |
|---|---|
| `guardarConfig(formData)` | Actualiza `sitio_config` (singleton) |

### `src/app/admin/publico/paginas/actions.ts`

| Función | Función |
|---|---|
| `crearPagina(formData)` | CMS página estática |
| `actualizarPagina(formData)` | |
| `eliminarPagina(formData)` | |

### `src/app/admin/publico/albumes/actions.ts`

| Función | Función |
|---|---|
| `crearAlbum(formData)` | Crea álbum |
| `actualizarAlbum(formData)` | Edita metadata |
| `eliminarAlbum(formData)` | Elimina álbum y sus fotos |
| `subirFotos(formData)` | Sube múltiples fotos a un álbum |
| `eliminarFoto(formData)` | Elimina foto individual |
| `definirPortada(formData)` | Marca una foto como portada del álbum |

### `src/app/admin/publico/redes/actions.ts`

| Función | Función |
|---|---|
| `guardarRedes(formData)` | Actualiza array de redes sociales en `sitio_config.redes_sociales` |

### `src/app/admin/riesgo/actions.ts`

| Función | Función |
|---|---|
| `recalcularRiesgo()` | (Manual) Llama `calcularRiesgoCiclo()` y persiste snapshots con `generado_por: 'manual_admin'` |

## D3. Acciones de profesor

### `src/app/profesor/conducta/actions.ts`

| Función | Función |
|---|---|
| `crearReporteConducta(fd)` | Inserta reporte, notifica al orientador y al admin |
| `atenderReporte(fd)` | Marca como atendido con `notas_orientador` |

### `src/app/profesor/grupo/[asignacionId]/actions.ts`

| Función | Función |
|---|---|
| `guardarCalificaciones(formData)` | Persiste edits inline de la tabla de calificaciones |
| `exportarCSV(formData)` | Genera y devuelve CSV con calificaciones del grupo |

### `src/app/profesor/grupo/[asignacionId]/asistencia/actions.ts`

| Función | Función |
|---|---|
| `guardarAsistencia(formData)` | Guarda pase de lista por fecha (presente/ausente/justificado por alumno) |

### `src/app/profesor/grupo/[asignacionId]/bitacora/actions.ts`

| Función | Función |
|---|---|
| `registrarClase(formData)` | Bitácora de la clase del día (lo cubierto, observaciones) |
| `eliminarRegistro(formData)` | Borra registro |

### `src/app/profesor/tareas/actions.ts`

| Función | Función |
|---|---|
| `crearTarea(fd)` | Crea tarea, sube archivo de instrucciones opcional, notifica al grupo |
| `calificarEntrega(fd)` | Califica una entrega de alumno y notifica |
| `eliminarTarea(id)` | Elimina tarea y entregas asociadas |

### `src/app/profesor/examenes/actions.ts`

| Función | Función |
|---|---|
| `crearExamen(fd)` | Crea examen base sin preguntas |
| `agregarPregunta(fd)` | Agrega pregunta (opcion_multiple / verdadero_falso / abierta) |
| `eliminarPregunta(id, examen_id)` | Elimina pregunta |
| `calificarRespuestaAbierta(fd)` | Asigna puntos a una respuesta abierta |

### `src/app/profesor/rubricas/actions.ts`

| Función | Función |
|---|---|
| `crearRubrica(formData)` | Crea rúbrica vacía |
| `agregarCriterio(formData)` | Agrega criterio con pesos y descriptores |
| `eliminarCriterio(formData)` | |
| `eliminarRubrica(formData)` | |
| `duplicarRubrica(formData)` | Copia rúbrica para reusar como plantilla |

### `src/app/profesor/mensajes/actions.ts`

| Función | Función |
|---|---|
| `enviarMensajeProfesor(formData)` | (profesor → alumno) llama `ensureHilo` + `postMensaje` |
| `enviarMensajeAlumno(formData)` | (alumno → profesor) idem desde el lado alumno |
| `marcarHiloLeido(hiloId, comoTipo)` | Marca todos los mensajes del hilo como leídos para el rol indicado |

### `src/app/profesor/solicitudes/actions.ts`

| Función | Función |
|---|---|
| `responderSolicitud(fd)` | Primera respuesta del profesor a una solicitud de revisión. Sube adjunto opcional, llama `ensureHilo`+`postMensaje` para que aparezca también en mensajería. |

## D4. Acciones de alumno

### `src/app/alumno/tareas/actions.ts`

| Función | Función |
|---|---|
| `entregarTarea(fd)` | Sube archivo al bucket `tareas`, registra `entregas_tarea`, notifica al profesor |

### `src/app/alumno/examenes/actions.ts`

| Función | Función |
|---|---|
| `iniciarIntento(examen_id)` | Crea `examen_intentos` con `estado: en_curso`, registra `iniciado_at` |
| `guardarRespuesta(fd)` | Auto-guarda respuesta individual (llamado on-change) |
| `entregarIntento(intento_id)` | Cierra intento, calcula calificación de cerradas, deja abiertas como pending |

### `src/app/alumno/portafolio/actions.ts`

| Función | Función |
|---|---|
| `subirEvidencia(fd)` | Sube archivo al bucket `portafolio`, crea `portafolio_evidencias` |
| `eliminarEvidencia(id)` | Elimina archivo y registro |
| `comentarEvidencia(fd)` | (Profesor) deja comentario sobre evidencia |

### `src/app/alumno/solicitudes/actions.ts`

| Función | Función |
|---|---|
| `crearSolicitudRevision(fd)` | Crea solicitud, sube adjunto opcional, llama `ensureHilo`+`postMensaje`, notifica al profesor |
| `cerrarSolicitud(fd)` | Marca solicitud como `cerrada` (versión vieja, ahora se usa `cerrarSolicitudThread`) |

### `src/app/alumno/extraordinarios/actions.ts`

| Función | Función |
|---|---|
| `solicitarExtraordinario(fd)` | Alumno solicita extraordinario |
| `procesarExtraordinario(fd)` | (Admin) aprueba/rechaza/aplica con calificación |

### `src/app/alumno/estado-cuenta/actions.ts`

| Función | Función |
|---|---|
| `subirComprobante(formData)` | Sube comprobante de transferencia para que admin valide |

### `src/app/alumno/ficha/actions.ts`

| Función | Función |
|---|---|
| `actualizarFicha(formData)` | Genera "ticket" para que admin actualice datos personales (no edita directo, solo sugiere cambio) |

## D5. Acciones compartidas

### `src/app/eval-docente/actions.ts`

| Función | Función |
|---|---|
| `crearPeriodoEval(fd)` | (Admin) crea periodo con dimensiones parseadas de `clave\|texto` multilínea |
| `cerrarPeriodoEval(id)` | (Admin) cierra periodo |
| `responderEval(fd)` | (Alumno) inserta respuestas con hash MD5 anti-doble-voto |

### `src/app/planeaciones/actions.ts`

| Función | Función |
|---|---|
| `guardarPlaneacion(fd)` | (Profesor) sube nueva versión, calcula `version = max+1` por (asignacion, parcial) |
| `enviarPlaneacion(id)` | Cambia estado de `borrador` a `enviada` |
| `eliminarPlaneacion(id)` | Borra versión (no permite borrar aprobadas) |
| `revisarPlaneacion(fd)` | (Admin/Director) aprueba/rechaza con observaciones, notifica docente |
| `getSignedPlaneacionUrl(path)` | Genera signed URL temporal (10 min) para descarga |

### `src/app/solicitudes/thread-actions.ts` (NUEVO — conversación)

| Función | Función |
|---|---|
| `enviarMensajeSolicitud(fd)` | Cualquier rol envía mensaje en hilo de solicitud, sube adjunto opcional, actualiza estado, notifica contraparte |
| `cerrarSolicitudThread(fd)` | Cierra solicitud (cualquier rol) |
| `reabrirSolicitudThread(fd)` | Reabre solicitud (cualquier rol) |

Función interna `getRolYAcceso(supabase, solicitudId, userId)` valida pertenencia y determina rol (alumno/profesor/admin/staff/director).

### `src/app/chat-grupal/actions.ts`

| Función | Función |
|---|---|
| `enviarMensajeChat(fd)` | Inserta mensaje en `chat_grupal_mensajes`, sube adjunto opcional |
| `eliminarMensajeChat(id, asignacion_id)` | Elimina (solo el autor o profesor de la asignación) |

### `src/app/tutorias/actions.ts`

| Función | Función |
|---|---|
| `guardarHorarioTutoria(fd)` | (Profesor) crea horario disponible |
| `eliminarHorarioTutoria(id)` | |
| `solicitarCita(fd)` | (Alumno) pide cita en horario disponible |
| `actualizarCita(fd)` | (Profesor) acepta/rechaza/cancela cita |

### `src/app/avisos/actions.ts`

| Función | Función |
|---|---|
| `crearAviso(fd)` | Crea aviso institucional con audiencia |
| `marcarAvisoLeido(avisoId)` | Inserta en `avisos_lecturas` (alumno/profesor) |

### `src/app/calendario/actions.ts`

| Función | Función |
|---|---|
| `crearEvento(fd)` | Inserta evento institucional |
| `eliminarEvento(fd)` | |

### `src/app/perfil/avatar-actions.ts`

| Función | Función |
|---|---|
| `subirAvatar(fd)` | Sube avatar al bucket de perfiles, actualiza `perfiles.avatar_url` |

---

# PARTE E — Componentes UI

## E1. Componentes públicos

**Carpeta:** `src/components/publico/`

| Archivo | Tipo | Props principales | Función |
|---|---|---|---|
| `Navbar.tsx` | client | `links[]` | Barra navegación con resalte ruta activa, hamburguesa móvil |
| `NavItem.tsx` | client | `href`, `children` | Item con highlight si `pathname === href` |
| `LogoEPO.tsx` | server | `size?`, `variant?` | SVG/img del logo institucional |
| `GobiernoBanner.tsx` | server | none | Banner superior con SEP/Edomex |
| `HeroCanvas.tsx` | client | none | Canvas con `requestAnimationFrame` para animación de partículas |
| `AuroraBg.tsx` | client | none | Gradient animado con CSS keyframes |
| `Particles.tsx` | client | `count?` | N partículas que flotan |
| `Counter.tsx` | client | `to`, `suffix?` | Cuenta animada usando `IntersectionObserver` |
| `Marquee.tsx` | client | `children`, `speed?` | Texto que se desplaza horizontalmente loop |
| `Reveal.tsx` | client | `children`, `delay?` | Wrapper con animación al entrar al viewport |
| `MotionItem.tsx` | client | uses framer-motion | Item con variants de entrada |
| `TiltCard.tsx` | client | `children` | Card con `transform: rotateX/rotateY` que sigue al cursor |
| `MagneticButton.tsx` | client | `children` | Botón que se atrae al cursor cercano |
| `ScrollProgress.tsx` | client | none | Barra fija top que muestra % de scroll |
| `Reloj.tsx` | client | none | Reloj live con `setInterval(updater, 1000)` |
| `CustomCursor.tsx` | client | none | Reemplaza cursor nativo con uno personalizado |
| `ValorCard.tsx` | server | `icono`, `titulo`, `desc` | Card decorativa |
| `SectionHeader.tsx` | server | `eyebrow?`, `title` | Header consistente para secciones |
| `PageBackdrop.tsx` | server | none | Fondo decorativo |
| `CopyButton.tsx` | client | `text` | Copia al portapapeles + feedback |

## E2. Componentes privados (UI kit)

**Carpeta:** `src/components/privado/`

### `PrivateShell.tsx`
**Props:** `role`, `groups[]`, `userName`, `userSub`, `logoUrl`, `children`
**Función:** Layout completo con sidebar + topbar + main. Usado en cada layout privado.

### `PrivateSidebar.tsx`
**Props:** `role`, `groups`, `userName`, `userSub`, `logoUrl`
**Función:** Sidebar con grupos de navegación colapsables. Cada item tiene `href`, `label`, `icon`, `badge?`. Resalta ruta activa.

### `Topbar.tsx`
**Props:** `greeting`, `userName`, `userSub`, `role`, `notiCount`, `notiItems[]`
**Función:** Barra superior con saludo + foto + dropdown de notificaciones + menú perfil/logout.

### `NotificationBell.tsx`
**Props:** `count`, `items[]`
**Función:** Botón de campana con badge numérico. Click abre dropdown con últimas notificaciones; click en item navega a `url` y marca como leída.

### `PageTransition.tsx`
**Props:** `children`
**Función:** Wrapper con `motion.div` de framer-motion que anima entrada al cambiar de ruta.

### `DashboardHero.tsx`
**Props:** `greeting`, `name`, `subtitle?`
**Función:** Hero del dashboard con saludo grande.

### `AnimatedStat.tsx`
**Props:** `value`, `label`, `tone?`
**Función:** Card con número que cuenta hasta `value` al renderizar.

### `DataTable.tsx`
**Props:** `columns[]`, `rows[]`, `searchable?`, `pageSize?`
**Función:** Tabla genérica con búsqueda, paginación, sort por columna.

### `ui.tsx`
Exports múltiples componentes:

| Componente | Props | Función |
|---|---|---|
| `Card` | `eyebrow?`, `title?`, `padding?`, `className?`, `children` | Contenedor con sombra/borde institucional |
| `PageHeader` | `eyebrow?`, `title`, `description?`, `actions?` | Header consistente para todas las páginas privadas |
| `Badge` | `tone`, `size?`, `children` | Píldora con tono (verde, ambar, rosa, azul, dorado, gray) |
| `EmptyState` | `icon`, `title`, `description?`, `action?` | Estado vacío con CTA |
| `Stat` | `label`, `value`, `tone?` | Stat simple |

## E3. Componentes específicos

### `chat/ChatGrupal.tsx`
**Props:** `mensajes[]`, `miPerfilId`, `puedeBorrar`
**Función:** Render de mensajes en burbujas tipo WhatsApp, alineadas según autor.

### `chat/ChatGrupalForm.tsx`
**Props:** `asignacionId`
**Función:** Form para enviar mensaje (texto + adjunto opcional).

### `mensajes/Adjunto.tsx`
**Props:** `signedUrl`, `nombre`, `tipo`, `tamano?`, `esMio?`
**Función:** Renderiza preview/icono según tipo MIME. Click abre el archivo firmado.

### `mensajes/MessageComposer.tsx`
**Props:** `onSubmit`, `placeholder?`
**Función:** Input multilínea + botón adjuntar + botón enviar.

### `avisos/AvisosList.tsx`
**Props:** `avisos[]`, `lecturas`
**Función:** Lista avisos con badge "no leído" y permite expandir cada uno.

### `avisos/MarcarLeidoClient.tsx`
**Props:** `avisoId`
**Función:** Botón que dispara `marcarAvisoLeido(avisoId)`.

### `calendario/CalendarioView.tsx`
**Props:** `eventos[]`, `vista?`
**Función:** Calendario mensual/semanal con eventos coloreados según `categoria`.

### `solicitudes/Conversacion.tsx`  ⭐ NUEVO
**Props:** `solicitudId`, `estado`, `mensajes[]`, `miRol`
**Función:** Hilo de chat dentro de cada solicitud. Burbujas, form de envío con adjunto, botones cerrar/reabrir.

### `AdminResetPasswordButton.tsx`
**Props:** `userId`, `email`
**Función:** Botón para que admin envíe magic link de recovery.

### `AvatarUploader.tsx`
**Props:** `currentUrl?`
**Función:** Drag&drop o file picker, preview, sube vía `subirAvatar()`.

### `ConfirmButton.tsx`
**Props:** `onConfirm`, `message`, `children`
**Función:** Wrapper que muestra confirm() antes de ejecutar acción.

### `EmojiFilePicker.tsx`
**Props:** `onEmoji`, `onFile`
**Función:** Picker combinado emoji + archivo (para mensajes).

### `FloatingSocial.tsx`
**Props:** `redes[]`
**Función:** Botón flotante esquina inferior derecha que despliega íconos de redes sociales.

### `PrintButton.tsx`
**Props:** `targetSelector?`
**Función:** Llama `window.print()`.

### `PWARegister.tsx`
**Props:** none
**Función:** En `useEffect` registra `/sw.js` con `navigator.serviceWorker.register()`.

---

# PARTE F — Páginas server-rendered

## F1. Patrón canónico de página

```typescript
// src/app/<area>/<modulo>/page.tsx
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function MiPagina({ searchParams }: { searchParams?: { ... } }) {
  const supabase = createClient();

  // 1. Verificar sesión y permisos
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Sin sesión</div>;

  // 2. Cargar datos
  const { data, error } = await supabase.from('...').select('...');

  // 3. Procesar datos (agregaciones, formateos)
  const procesado = ...;

  // 4. Renderizar
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="..." title="..." />
      <Card>
        {/* UI con datos */}
        {/* Forms cliente con actions */}
      </Card>
    </div>
  );
}
```

**Características:**
- Son **async** (server components)
- Hacen queries directos a Supabase respetando RLS
- Embeben components cliente (`'use client'`) solo donde se necesita interactividad
- Reciben `searchParams` para filtros via URL

## F2. Páginas notables explicadas

### `src/app/page.tsx`
```typescript
import { redirect } from 'next/navigation';
export default function Home() {
  redirect('/publico');
}
```
3 líneas. Solo redirige al sitio público.

### `src/app/admin/page.tsx` (222 líneas)

Dashboard del admin. Estructura:

```typescript
export default async function AdminPage() {
  const supabase = createClient();

  // Stats principales
  const { count: alumnosCount } = await supabase.from('alumnos').select(...);
  const { count: profesoresCount } = await supabase.from('profesores').select(...);
  const { count: gruposCount } = await supabase.from('grupos').select(...);
  const { count: asignacionesCount } = await supabase.from('asignaciones').select(...);

  // Alertas
  const alertas = await construirAlertas(supabase);

  // Últimas noticias y avisos
  const { data: noticias } = await supabase.from('noticias')...;

  return (
    <>
      <DashboardHero greeting={saludoPorHora()} ... />
      <div className="grid grid-cols-4 gap-3">
        <AnimatedStat label="Alumnos" value={alumnosCount} />
        ...
      </div>
      <Card eyebrow="Alertas">
        {alertas.map(a => <AlertaCard alerta={a} />)}
      </Card>
      ...
    </>
  );
}
```

### `src/app/profesor/page.tsx` (355 líneas)

Dashboard docente con:
- Saludo + datos
- Stats (mis grupos, asignaciones, alumnos, solicitudes)
- Próximas clases (query a `horarios` con día actual)
- Solicitudes pendientes (preview)
- Mensajes no leídos
- Avisos no confirmados
- Si es orientador: card adicional con su grupo

### `src/app/alumno/page.tsx` (286 líneas)

Dashboard alumno con:
- Saludo + foto + grupo + ciclo
- Promedio actual
- Tareas próximas (con fecha de entrega)
- Exámenes próximos
- Avisos no leídos
- Notificaciones recientes
- Estado de cuenta resumido

### `src/app/publico/page.tsx` (398 líneas)

Home pública. Estructura monolítica con todas las secciones del HTML original migradas a JSX:

```typescript
export default async function PublicoPage() {
  // Cargar datos dinámicos
  const supabase = createClient();
  const { data: noticias } = await supabase.from('noticias').select('*').eq('publicado', true).limit(3);
  const { data: convocatorias } = await supabase.from('convocatorias').select('*').limit(3);
  const { data: albumes } = await supabase.from('albumes').select('*').limit(4);
  const { data: cfg } = await supabase.from('sitio_config').select('*').single();

  return (
    <>
      <GobiernoBanner />
      <Navbar links={...} />
      <Hero />
      <SectionPortal />
      <SectionCalendario />
      <SectionTramites />
      <SectionInscripciones />
      <SectionOferta />
      <SectionDocentes />
      <SectionReglamento />
      <SectionGaleria albumes={albumes} />
      <SectionLogros />
      <SectionEgresados />
      <SectionBolsa />
      <SectionPadres />
      <SectionHistoria />
      <SectionFAQ />
      <SectionMapa />
      <SectionNoticias noticias={noticias} />
      <SectionContacto cfg={cfg} />
      <Footer />
      <FloatingSocial redes={cfg.redes_sociales} />
    </>
  );
}
```

---

# PARTE G — API Routes

## G1. PDFs (route handlers)

Todos siguen el mismo patrón:

```typescript
// src/app/api/<doc>/[id]/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { ... } }) {
  // 1. Auth
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // 2. Permisos
  // (verificar que el user puede ver este recurso)

  // 3. Cargar datos
  const datos = await getDatos(...);

  // 4. Render PDF
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { ComponentePDF } = await import('@/lib/pdf/...');
  const { createElement } = await import('react');
  const buffer = await renderToBuffer(createElement(ComponentePDF, { ...datos }));

  // 5. Devolver
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="..."`,
    },
  });
}
```

| Endpoint | Doc | Permisos |
|---|---|---|
| `/api/boleta/[alumnoId]` | Boleta del ciclo | Alumno propio o admin |
| `/api/kardex/[alumnoId]` | Kardex integral | Alumno propio o admin |
| `/api/constancia/[profesorId]` | Constancia servicio | Profesor propio o admin |
| `/api/comprobante/[pagoId]` | Comprobante pago | Alumno del pago o admin |

## G2. Crons

```typescript
// src/app/api/cron/<nombre>/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;  // o 300 para crones largos

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... lógica del cron
  return Response.json({ ok: true, ... });
}
```

### `/api/cron/calcular-riesgo`
- Schedule: `0 6 * * *`
- Llama `calcularRiesgoCiclo()` y persiste snapshots
- Notifica a orientadores cuando hay críticos

### `/api/cron/resumen-semanal`
- Schedule: `0 14 * * 1`
- maxDuration: 300s
- Itera alumnos con `tutor_email`
- Construye HTML personalizado
- Llama `enviarCorreo()` para cada uno

## G3. Exportes

### `/api/export/materias`
GET. Devuelve CSV con todas las materias del catálogo. Llamado desde botón "Exportar" en `/admin/materias`.

### `/calendario/ics`
Devuelve `text/calendar` con todos los eventos. Útil para suscripción en Google Calendar/Outlook.

---

# PARTE H — Patrones recurrentes

## H1. Pattern: Server action con archivo

```typescript
'use server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const MAX = 15 * 1024 * 1024;

export async function subirArchivo(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const file = fd.get('archivo') as File | null;
  if (!file || !file.size) return { error: 'Sin archivo' };
  if (file.size > MAX) return { error: 'Excede 15 MB' };

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${entityId}/${crypto.randomUUID()}.${ext}`;
  const ab = await file.arrayBuffer();
  const { error } = await admin.storage.from('bucket').upload(path, ab, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  await supabase.from('tabla').insert({ url: path, ... });

  revalidatePath('/area/modulo');
  return { ok: true };
}
```

## H2. Pattern: Form cliente con useTransition

```typescript
'use client';
import { useState, useTransition, useRef } from 'react';
import { miAction } from './actions';

export function MiForm() {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        setErr(null); setOk(false);
        start(async () => {
          const r = await miAction(fd);
          if (r?.error) setErr(r.error);
          else { setOk(true); formRef.current?.reset(); }
        });
      }}
    >
      <input name="campo" />
      {err && <div className="text-rose-700">{err}</div>}
      {ok && <div className="text-verde-oscuro">✅</div>}
      <button disabled={pending}>{pending ? 'Enviando…' : 'Enviar'}</button>
    </form>
  );
}
```

## H3. Pattern: Notificación cruzada

Cuando una acción afecta a otro usuario, se inserta `notificaciones` con su `perfil_id`:

```typescript
// Después de la mutación principal
await admin.from('notificaciones').insert({
  perfil_id: targetPerfilId,  // del otro usuario
  titulo: '🚨 Nuevo evento',
  mensaje: 'Descripción corta...',
  url: '/ruta/a/donde/ir',
});
```

Se usa `adminClient()` porque RLS de `notificaciones` solo permite ver las propias, no insertar a otros con sesión normal.

## H4. Pattern: Storage path + signed URL

**Path al subir:**
```typescript
const path = `${entityId}/${crypto.randomUUID()}.${ext}`;
await admin.storage.from('bucket').upload(path, file);
// Guardar `path` en BD, NO la URL
```

**Render con signed URL:**
```typescript
const paths = items.map(i => i.adjunto_url).filter(Boolean);
const { data: signed } = await supabase.storage.from('bucket').createSignedUrls(paths, 3600);
const map = {};
signed.forEach(s => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });

// En el render
<img src={map[item.adjunto_url]} />
```

URLs expiran en 1 hora — usuarios no pueden compartir links permanentes accidentalmente.

## H5. Pattern: Soft delete

Tablas con `deleted_at` (alumnos, profesores, grupos, materias):

```typescript
// Al "borrar":
await supabase.from('alumnos').update({ deleted_at: new Date().toISOString() }).eq('id', id);

// Al consultar:
.is('deleted_at', null)
```

Esto preserva integridad referencial y permite "restaurar". Tablas con relaciones débiles (notificaciones, mensajes) sí usan hard delete.

---

## Cierre técnico

Este documento + `MANUAL_COMPLETO.md` + `BITACORA_DESARROLLO.md` forman el conjunto completo de documentación del sistema:

| Documento | Audiencia | Cuándo consultar |
|---|---|---|
| `BITACORA_DESARROLLO.md` | Project manager, stakeholders | "¿Qué se hizo este mes?" |
| `MANUAL_COMPLETO.md` | Usuarios finales, soporte | "¿Cómo se usa cada función?" |
| `CODIGO_DETALLADO.md` (este) | Desarrolladores | "¿Cómo está implementado X?" |

Cualquier developer puede:
1. Leer `MANUAL_COMPLETO.md` para entender QUÉ hace el sistema
2. Leer este documento para entender CÓMO está implementado
3. Ir al archivo concreto en el repo para ver el código

— **Fin del documento técnico**
