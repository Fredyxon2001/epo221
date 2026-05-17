# Bitácora de desarrollo — Mayo 2026

> Continuación de `BITACORA_DESARROLLO.md` (abril 2026).
> Esta bitácora documenta TODO el trabajo realizado durante mayo 2026 sobre el sistema EPO 221.

---

## Resumen ejecutivo

Mayo se enfocó en **preparar el sistema para la prueba real del sábado** con usuarios. Se construyó el flujo crítico **maestro → orientador → alumno → reclamación**, se refactorizó la gestión de usuarios y contraseñas, se procesaron videos institucionales, se publicó contenido público completo (noticias, becas, álbumes), se mejoró radicalmente la importación masiva de alumnos, y se cazaron **dos bugs críticos** que impedían el acceso de alumnos. El sistema termina mayo **listo para producción real**.

| Métrica | Valor |
|---|---|
| Días activos | ~6 (15-20 mayo) |
| Commits | ~30 |
| Migraciones SQL nuevas | 15 |
| Páginas/rutas nuevas | 18 |
| Bugs críticos cazados | 3 |
| Líneas de doc agregadas | ~2,000 |

---

## 1. Conversación dentro de solicitudes de revisión

**Problema reportado:** los tickets de revisión solo permitían 1 motivo del alumno + 1 respuesta del docente, sin posibilidad de seguir conversando, subir archivos extras ni cerrar la solicitud por ninguna parte.

**Solución implementada:**

- **Migración**: nueva tabla `solicitudes_mensajes` con `solicitud_id`, `autor_id`, `autor_tipo`, `texto`, `adjunto_url`, `adjunto_nombre`, `adjunto_tipo`, `adjunto_tamano`, `created_at`. RLS para alumno dueño + profesor de la asignación + admin/director.
- **Actions compartidas** en `src/app/solicitudes/thread-actions.ts`:
  - `enviarMensajeSolicitud(fd)` — cualquier rol envía mensaje con adjunto opcional, actualiza estado de la solicitud, notifica a contraparte
  - `cerrarSolicitudThread(fd)` — cualquier rol puede cerrar
  - `reabrirSolicitudThread(fd)` — cualquier rol puede reabrir
- **Componente** `src/components/solicitudes/Conversacion.tsx`: hilo tipo chat con burbujas alineadas según autor, form para enviar mensaje + adjunto, botones cerrar/reabrir.
- **Integrado en**: `/alumno/solicitudes` y `/profesor/solicitudes`.

---

## 2. Sistema Orientador — refactor completo

**Concepto:** el orientador es un profesor que **no necesariamente da clases**, pero acompaña a 1-4 grupos. Su responsabilidad clave: **validar las calificaciones** que envían los maestros antes de que se apliquen al expediente del alumno. También acompaña las solicitudes de revisión.

### 2.1 Migración `orientador_flujo_calificaciones`

```sql
-- Constraint: máximo 4 grupos por orientador
CREATE FUNCTION check_max_orientador_grupos() ...
CREATE TRIGGER trg_max_orientador ON grupos ...

-- Tabla nueva
CREATE TABLE calificaciones_propuestas (
  id, alumno_id, asignacion_id, parcial, calificacion, faltas,
  observaciones, estado (pendiente/validada/rechazada),
  propuesta_por, propuesta_at,
  validada_por, validada_at,
  motivo_rechazo
);

-- RPC SECURITY DEFINER
CREATE FUNCTION aplicar_propuesta_calificacion(p_propuesta_id) ...

-- Trigger: setea orientador_id automáticamente en cada solicitud
CREATE FUNCTION set_solicitud_orientador() ...
CREATE TRIGGER trg_set_orientador ON solicitudes_revision ...
```

### 2.2 Nuevas rutas

| Ruta | Para quién | Función |
|---|---|---|
| `/profesor/calificaciones-proponer` | Maestro | Envía calificaciones por parcial (form masivo con todos los alumnos del grupo) |
| `/profesor/orientacion/calificaciones` | Orientador | Bandeja con filtros (pendiente/validada/rechazada/grupo). Botones ✅ Validar / ❌ Rechazar |
| `/profesor/orientacion/solicitudes` | Orientador | Acompaña tickets de revisión — ve la conversación completa y puede intervenir |

### 2.3 Sidebar dinámico

El layout `/profesor/layout.tsx` muestra una sección **"🧭 Orientación"** SOLO si el profesor tiene grupos a su cargo. Badges en los items muestran conteos de propuestas pendientes y solicitudes abiertas.

### 2.4 RLS extendida

Las policies de `solicitudes_revision`, `solicitudes_mensajes`, `calificaciones_propuestas` y `alumnos` se ampliaron para que el orientador pueda leer/escribir todo lo de sus grupos orientados (no solo lo de sus asignaciones de clase).

---

## 3. Reset universal de contraseñas — `/admin/usuarios`

**Páginas y acciones:**

- `/admin/usuarios` — listado de TODOS los usuarios con filtros pestaña por rol, conteos, búsqueda
- `/admin/usuarios/nuevo` — alta unificada para cualquier rol
- `EditarRolDropdown` — cambia rol inline sin recargar página
- `adminResetPassword(fd)` action — 2 modos:
  - **Temporal**: genera password aleatoria 12 chars (se muestra una sola vez con botón copiar)
  - **Magic**: envía link de recuperación al correo del usuario

**Detección automática de orientador:** profesores con grupos a su cargo aparecen con tono dorado e ícono 🧭 (visualmente distinguidos sin necesidad de rol distinto en BD).

---

## 4. Nuevo rol `finanzas`

- **Migración**: `ALTER TYPE rol_usuario ADD VALUE 'finanzas'`
- **Layout admin** detecta el rol y muestra solo módulos relevantes (Pagos, Conceptos, Extraordinarios, Buscar alumno, Mi perfil)
- El finanzas NO puede ver listados completos, ni configuración, ni alumnos en detalle (solo búsqueda básica)

---

## 5. Perfil editable universal

**Migración** `perfiles_avatar_y_extras`:
- Agregadas columnas a `perfiles`: `avatar_url`, `apellido_paterno`, `apellido_materno`, `cargo`, `bio`
- Backfill desde profesores/alumnos
- Bucket `avatares` ampliado a 3 MB

**Acciones** en `src/app/perfil/actions.ts`:
- `actualizarMiPerfil(fd)` — edita nombre/apellidos/teléfono/cargo/bio (RFC si es profesor)
- `subirMiAvatar(fd)` — sube foto y sincroniza a las 3 tablas (`perfiles`, `profesores`, `alumnos`)
- `eliminarMiAvatar()` — limpia foto

**Componente** `src/components/perfil/PerfilEditor.tsx`:
- Avatar circular grande con preview o iniciales sobre gradient verde
- Botones: 📤 Subir foto · 🗑 Eliminar
- Form de datos con validación inline

**Páginas nuevas:**
- `/profesor/perfil` — refactorizada a editable + muestra **sub-tipo funcional** (Solo Maestro / Solo Orientador / Combo) con cards de grupos orientados y materias
- `/admin/perfil` — para admin/staff/finanzas
- `/director/perfil` — con cargo prellenado

**Sidebar:** link "Mi perfil" agregado a todos los layouts.

---

## 6. Videos DJI — galería pública con polish cinematográfico

**Procesamiento ffmpeg local:**

- 6 videos originales: 4K HEVC 60fps, ~5 GB total
- Re-encode a H.264 1080p 30fps, watermark logo EPO 221, music TuneTank Inspiring Cinematic 30% vol con fade in/out
- 360°: 3x slow + Ken Burns zoom (cinematográfico)
- Construcción / Auditorio / Recorrido: recortados para quitar partes de aterrizaje
- Total final: 264 MB (-95%)

**Página nueva** `/publico/conoce`:
- `HeroVideo.tsx`: video de fondo autoplay loop con toggle mute/unmute (respeta `prefers-reduced-motion`)
- `VideoCard.tsx`: galería responsive con 6 videos, click para reproducir
- 2 destacados grandes + 4 estándar
- Link "Recorrido" agregado al navbar público

**Bucket** `videos-publicos` creado en Supabase (RLS: lectura pública, escritura solo admin) — usado como referencia para futura migración a CDN.

---

## 7. Contenido público publicado

### 7.1 Noticias (7 publicadas con imágenes destacadas)

1. SEP analiza adelantar vacaciones al 5 de junio
2. Calendario escolar 2026-2027
3. Nueva Escuela Mexicana (NEM)
4. Programa "La Escuela es Nuestra" 2026
5. Cultura Digital I y II
6. Becas Benito Juárez 2026 EMS
7. Apoyos económicos estatales Edomex/Puebla

Cada noticia con: título, slug, resumen, contenido markdown extenso con tablas/listas/blockquotes, imagen 1200×630 de Unsplash CC0, fecha escalonada.

### 7.2 Convocatorias (4 nuevas)

- 💰 Beca Benito Juárez 2026-2027
- 🎓 Aprovechamiento Académico SEIEM (Edomex)
- 📚 Apoyo al Bachillerato Puebla
- 🏆 Excelencia Académica EPO 221

### 7.3 Aviso institucional con confirmación de lectura

- Título: "🌡️ IMPORTANTE: Posible adelanto del periodo vacacional al 5 de junio"
- Alcance: todos · Prioridad: importante · Vence: 5 jun 2026

### 7.4 Álbum "Maratón por la Lectura 8 mar 2026"

6 fotos en `public/albumes/maraton-lectura-2026/` con descripción completa de la actividad y hashtags institucionales.

---

## 8. Cambios en página `/publico/descargas`

- ❌ Quitado el monto `$1,095`
- ❌ "Cuota anual" → ✅ "Donación voluntaria" (evita implicaciones legales)
- ❌ "Seguro escolar contra accidentes" → ✅ "Apoya el mantenimiento y operación de la institución"
- Datos bancarios removidos del card público
- Mensaje "Acércate a Control Escolar para conocer el monto"

---

## 9. UI: miniaturas de álbumes uniformes

- Removido `col-span-2 row-span-2` del primer álbum en home (bento layout daba aspecto desproporcionado)
- Todos los álbumes del mismo tamaño (200px altura, grid 2-4 columnas según viewport)

---

## 10. Importación masiva de alumnos — overhaul completo

### 10.1 Plantilla XLSX descargable

`/api/plantilla-alumnos` route — devuelve XLSX con **3 hojas**:

1. **ALUMNOS** — 19 columnas con 3 filas de ejemplo
2. **INSTRUCCIONES** — tabla campo por campo + sección "REGLAS DE LOGIN AUTOMÁTICO"
3. **VISTA PREVIA LOGIN** — muestra cómo se generan los emails

### 10.2 Action mejorada

`importarAlumnosExcel`:
- Acepta XLSX, XLS, CSV (UTF-8)
- Detecta hoja "ALUMNOS" automáticamente
- Helper `norm()` ignora acentos y mayúsculas en headers
- Captura todos los campos extra (email contacto, tel, dirección, datos tutor)
- Upsert por CURP (no duplica)
- Reporta errores detallados (fila + CURP + razón)
- Genera email tipo `nombre.apellido@epo221.local`
- Maneja duplicados de nombre+apellido agregando matrícula al sufijo
- **Re-vincula** `alumnos.perfil_id` correctamente (clave del bug "cuenta no vinculada")
- Captura lista de credenciales generadas
- Persiste en tabla `imports_credenciales`
- Devuelve `import_id` para descarga

### 10.3 UI con drag & drop

Componente `ImportadorMasivo.tsx`:
- Banner amarillo con botón descargar plantilla
- Zona drag & drop con estados visuales (dragOver, archivo seleccionado, tipo inválido)
- Validación de tipo .xlsx/.xls/.csv
- Spinner al procesar
- Info box azul con reglas de login

Componente `ResultadoImportacion.tsx`:
- Cards con conteos (creados/actualizados/errores)
- Tabla de filas con problemas
- **Botón verde "📥 Descargar credenciales XLSX"** si la import fue exitosa

### 10.4 Endpoint descarga credenciales

`/api/credenciales-import/[id]` — devuelve XLSX listo para imprimir con:
- Título "CREDENCIALES DE ACCESO — EPO 221"
- Tabla Nombre · Matrícula · Email · Password
- Instrucciones para el alumno (URL, pasos)

### 10.5 Migración `imports_credenciales_log`

Tabla nueva con `creado_por`, `total`, `credenciales jsonb`. RLS solo admin/staff/director.

---

## 11. Nuevo patrón de email y password universal

### 11.1 Helper `src/lib/auth.ts`

```typescript
export const DOMINIO_SINTETICO = 'epo221.local';
export const PASSWORD_TEMPORAL = 'TEMPORALEPO221!';

export const aSlug = (s: string): string => {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
};

export const nombreApellidoAEmail = (nombre, apellidoPaterno, sufijo?) => {
  const nom = aSlug(nombre) || 'alumno';
  const ape = aSlug(apellidoPaterno);
  const base = ape ? `${nom}.${ape}` : nom;
  const conSufijo = sufijo ? `${base}.${aSlug(sufijo)}` : base;
  return `${conSufijo}@${DOMINIO_SINTETICO}`;
};
```

### 11.2 Migración SQL aplicada

```sql
-- Cambiar emails de TODOS los alumnos al patrón nombre.apellido
-- (con manejo de duplicados agregando matrícula)
-- Resetear passwords a TEMPORALEPO221!
-- debe_cambiar_password = false (no forzar)
```

### 11.3 Resultado

Los 9 alumnos quedaron con emails como `manuel.lara@epo221.local`, `diego.garcia@epo221.local`, etc. Todos con password `TEMPORALEPO221!` y SIN forzar cambio al primer login.

---

## 12. Fix logout 404

`src/app/api/logout/route.ts` — endpoint nuevo que acepta GET y POST, hace `signOut()` y redirige a `/login`. Antes no existía la ruta, causando 404 al cerrar sesión.

---

## 13. **Bugs críticos cazados**

### Bug 1 — Build failure por `user` duplicado

**Síntoma:** push exitoso a GitHub, pero el deploy en Vercel quedaba en `ERROR` y mantenía la versión vieja con el bug.

**Causa:** al refactorizar `alumno/layout.tsx`, dejé dos declaraciones de `const { data: { user } }` en la misma función.

**Fix:** quité la duplicada. Build pasó.

### Bug 2 — Loop infinito de redirect 307

**Síntoma:** página en blanco en celular de alumnos. Logs mostraban cascada `/alumno → 307 → /login → 307 → /alumno → 307...`.

**Causa:** `getAlumnoActual()` usaba `.single()` que arrojaba PostgrestError ante cualquier hiccup → `alumno` quedaba `undefined` → el `(...)!` engañaba al type-checker → TypeError → layout redirigía a `/login` → middleware veía sesión activa → re-redirigía a `/alumno` → loop infinito.

**Fix:**
- `.single()` → `.maybeSingle()` (no arroja)
- Layout NO redirige a `/login` si no hay alumno; muestra mensaje útil con info diagnóstica
- Dashboard del alumno tolera null y muestra fallback amigable

### Bug 3 — RLS bloqueaba alumnos viendo su propia ficha

**Síntoma:** después de los fixes anteriores, los alumnos veían "Tu cuenta no tiene perfil de alumno" en el cuerpo del dashboard, pero el header (en el layout) sí mostraba su nombre correctamente.

**Causa raíz (descubierta tras debugging profundo):** la policy `alumnos_select_self` usaba la función `mi_alumno_id()` que devuelve `alumnos.id` (UUID interno), pero la policy comparaba contra `perfil_id`. **Dos campos diferentes — nunca podía hacer match.** Ningún alumno podía leer su propia fila vía user session. El layout funcionaba porque usaba `adminClient` (bypass RLS) en la auto-vinculación.

**Fix:**
```sql
DROP POLICY alumnos_select_self ON alumnos;
CREATE POLICY alumnos_select_self ON alumnos FOR SELECT TO authenticated
USING (
  perfil_id = auth.uid()   -- DIRECTO, sin función intermedia con bug
  OR es_admin()
  OR es_profesor()
);
```

Verificado en SQL simulando la sesión de cada alumno: ahora ven su propia fila.

### Bonus: auto-vinculación robusta como red de seguridad

`alumno/layout.tsx` ahora hace 2 fallbacks si no encuentra alumno por `perfil_id`:
1. Busca por email del user contra `perfiles.email`
2. Extrae `nombre.apellido` del email y busca por nombre+apellido_paterno

Si encuentra match, **re-vincula automáticamente** `alumnos.perfil_id`. Garantiza que cualquier inconsistencia de datos se auto-corrija.

---

## 14. Grupos y datos de prueba creados

### 14.1 Grupos test

- **1°Z matutino** — orientado por Orientador SOLO (test), 5 alumnos
- **1°Y matutino** — orientado por Profesor+Orientador (test)
- **1°P matutino** — orientado por el usuario que tú asignaste, profesor Pablo Cantoral de Matemáticas + profesor Concilio Najera de Lengua y Comunicación, 6 alumnos inscritos

### 14.2 Cuentas TEST creadas

| Email | Password | Rol funcional |
|---|---|---|
| `prof.solo@test.epo221.mx` | `TestSabado2026!` | Solo maestro |
| `prof.orientador@test.epo221.mx` | `TestSabado2026!` | Maestro + Orientador |
| `orientador.solo@test.epo221.mx` | `TestSabado2026!` | Solo orientador |

### 14.3 Profesores reales con cuentas

| Email | Notas |
|---|---|
| `cramirez@epo221.mx` | Carlos Ramírez |
| `lgomez@epo221.mx` | Lucía Gómez |
| `jperez@epo221.mx` | Jorge Luis Pérez (orientador real) |
| `atorres@epo221.mx` | Adriana Torres (orientador real) |
| `rcruz@epo221.mx` | Roberto Cruz |
| `mhernandez@epo221.mx` | María Elena Hernández |
| `pablo@epo221.mx` | Pablo Cantoral (Mate en 1°P) |
| `concilionajera@gmail.com` | Concilio Najera (Lengua en 1°P) |

Password inicial para los profesores reales: `EPO221!` (deben cambiarla).

---

## 15. Estado final BD al cierre de mayo

| Tabla | Filas activas |
|---|---|
| `perfiles` | 18+ (varios roles) |
| `alumnos` | 9 |
| `profesores` | 10+ |
| `grupos` | 9 activos |
| `asignaciones` | 32+ |
| `inscripciones` | 60+ activas |
| `noticias` | 7 publicadas |
| `convocatorias` | 4 activas |
| `albumes` | 2 publicados |
| `solicitudes_revision` | 1 (test) |
| `calificaciones_propuestas` | 0 (esperando primer envío real) |
| `imports_credenciales` | 1+ logs de importaciones |
| `riesgo_snapshots` | activo, cron diario |
| `correo_log` | activo, esperando RESEND_API_KEY |

---

## 16. Migraciones aplicadas este mes (orden cronológico)

1. `solicitudes_mensajes_thread`
2. `orientador_flujo_calificaciones`
3. `videos_publicos_bucket`
4. `perfiles_avatar_y_extras`
5. `agregar_rol_finanzas`
6. `prep_prueba_sabado_setup`
7. `prep_prueba_alumnos_login_y_grupo_fix`
8. `prep_prueba_grupos_y_asignaciones_test_v2`
9. `fix_rls_orientador_ve_alumnos`
10. `imports_credenciales_log`
11. `migrar_emails_alumnos_a_nombre_apellido`
12. `fix_rls_alumno_se_ve_a_si_mismo`
13. `fix_rls_alumnos_evitar_recursion`
14. `fix_rls_alumnos_simple_no_recursion` ← **fix raíz del bug crítico**

---

## 17. Variables de entorno y configuración Vercel

Confirmadas/agregadas en producción:
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `CRON_SECRET` ✅ (agregada vía API Vercel)
- `NEXT_PUBLIC_APP_URL` ✅
- `NEXT_PUBLIC_APP_NAME` ✅
- `NEXT_PUBLIC_ESCUELA_CCT` ✅
- `RESEND_API_KEY` ⏸ (pendiente — sin esto correos a tutores quedan en modo "skipped")

---

## 18. Pendientes operativos al cierre

- ✅ Sistema listo para la prueba del sábado
- ✅ Documentación completa actualizada
- ⚠️ Pendiente: revocar tokens de GitHub (3) y Vercel (1) que se pegaron en chat durante la sesión
- ⏸ Opcional: configurar `RESEND_API_KEY` cuando se quiera activar envío real de correos a tutores
- ⏸ Opcional: apuntar dominio propio (ej. `sistema.epo221.edu.mx`) en lugar de `epo221.vercel.app`
- ⏸ Opcional: invitar a Mauricio y David como colaboradores GitHub (necesito sus usernames)

---

## 19. Lecciones aprendidas

1. **Siempre usar `.maybeSingle()` en lugar de `.single()`** en queries server-side a menos que sea crítico que exista exactamente una fila. `.single()` arroja excepción que rompe páginas.

2. **No declarar variables locales que duplican** scope superior — TypeScript no lo detecta a nivel runtime pero el build de Next.js sí. Tip: nombrar diferente o destructure inmediatamente.

3. **NUNCA redirigir desde un layout si la causa puede generar loop con middleware.** Mejor mostrar UI de error in-place.

4. **RLS con funciones SQL helpers es peligroso** si el helper no hace lo que esperas. La función `mi_alumno_id()` devolvía un campo distinto al que la policy comparaba — un bug imposible de detectar sin ejecutar las queries con sesión real.

5. **Vercel preserva el deploy anterior si el build falla.** Esto es bueno (no rompe el sitio), pero significa que un push roto puede dejar bugs viejos en producción sin que te des cuenta hasta revisar logs.

6. **El service role bypass de RLS es trampa** cuando solo lo usas en algunas vistas pero no en otras: las vistas que sí usan user session van a fallar diferente, dando síntomas inconsistentes (header funciona, cuerpo no).

7. **El user puede pegar tokens en chat por desconocimiento.** Cada vez que pasó: usé el token una sola vez, le pedí revocarlo inmediatamente, y nunca lo guardé en config del repo.

---

**Bitácora de mayo 2026 (primera parte) completa.**

---

# 🔧 SEGUNDA PARTE — 17 de mayo (sábado de la prueba)

Lo construido el día anterior al test real. Foco: refinamiento del flujo académico crítico.

## 20. Flujo de modificaciones de calificaciones validadas

**Problema:** ¿qué pasa si una calificación ya fue validada por el orientador y aplicada al expediente, pero el maestro necesita corregirla (caso típico: alumno reclamó y tiene razón)?

**Solución implementada:**

### Migración
- `ALTER TABLE calificaciones_propuestas` con dos columnas nuevas:
  - `es_modificacion boolean DEFAULT false`
  - `valor_anterior jsonb` (guarda `{calificacion, faltas}` previos)

### Lógica
En `enviarPropuestasCalificaciones`:
1. Detecta cuáles alumnos del envío ya tienen calificación VALIDADA en (asignacion, parcial)
2. Para esos: marca `es_modificacion=true` y guarda `valor_anterior`
3. Para los nuevos: propuesta normal
4. Salta entradas idénticas a las validadas (sin cambio = no enviar)
5. Notificación al orientador distintiva: "🔄 Modificaciones de calificaciones — requieren tu aprobación"

### UI bandeja del orientador
- Filas con fondo ámbar si son modificaciones
- Badge `modif` en lugar de `pendiente`
- Tag "🔄 Modificación" al lado del nombre del alumno
- Visual diff: `5.5` → **7.0** (anterior tachado, nuevo en bold)
- Misma visualización para faltas

### Notificaciones
- Al maestro al aprobarse: "✅ Modificación aprobada (cambio de 5.5 → 7.0)"
- Al alumno: "📊 Nueva calificación disponible"

## 21. Plantilla XLSX de calificaciones precargada

**Endpoint nuevo:** `/api/plantilla-calificaciones/[asignacionId]?parcial=N`

Devuelve XLSX con dos hojas:

### Hoja CALIFICACIONES
- 5 columnas: MATRICULA · NOMBRE COMPLETO · CALIFICACION (0-10) · FALTAS · OBSERVACIONES
- **Precargada con todos los alumnos del grupo** (no es plantilla vacía)
- Si ya hay calificaciones validadas previas, las precarga (para que el maestro solo modifique lo que cambie)

### Hoja INFO
- Datos de la asignación (materia, grupo, parcial, total alumnos)
- Instrucciones paso a paso
- Reglas del flujo (validación, modificación, etc.)
- Soporte

## 22. Importador XLSX de calificaciones

**Action nueva:** `importarCalificacionesXLSX(fd)`

- Lee XLSX (.xlsx, .xls)
- Detecta hoja "CALIFICACIONES" o la primera
- Resuelve matrícula → alumno_id contra BD
- Valida calificación (0-10), salta filas vacías o inválidas
- **Reutiliza internamente** `enviarPropuestasCalificaciones` (una sola lógica → mismo flujo de modificaciones detecta)
- Reporta total enviadas + saltadas

**UI:**
- Banner azul "📤 Opción rápida: subir plantilla XLSX llenada"
- Input file + botón "📥 Procesar XLSX"
- Mensaje de resultado inline

## 23. Parciales flexibles hasta 6

**Antes:** sistema hardcoded a 3 parciales (P1, P2, P3).

**Ahora:** soporta de 1 a 6 parciales por ciclo, configurables por admin.

### Migración
- `ALTER constraint` en `calificaciones_propuestas.parcial`: 1-3 → 1-6
- `UNIQUE(ciclo_id, numero)` en `parciales_config`
- Creados los 3 parciales del ciclo activo si no existían

### Admin `/admin/parciales`
- Antes hardcoded a `[1,2,3]`, ahora muestra dinámicamente los parciales del ciclo
- Botón **"+ Agregar parcial"** en cada ciclo (hasta llegar a 6)
- Botón **"🗑 Eliminar"** (solo en el último parcial, no publicado)
- Layout grid se adapta: 3 / 4 / 5 / 6 columnas según cantidad
- Nuevas actions: `agregarParcial(ciclo_id)`, `eliminarParcial(id)`

### Form profesor (calificaciones-proponer)
- Dropdown de parcial ahora es **dinámico** desde `parciales_config`
- Muestra el **nombre real** del parcial (ej. "Primer parcial")
- Si admin definió ventana de captura, muestra fechas debajo del selector
- Aviso rojo si está fuera de ventana (informativo, no bloquea)
- Fallback a [1,2,3] si admin aún no configura parciales

## 24. Solicitud de apertura de parcial (maestro → admin)

**Caso de uso:** el maestro necesita capturar un parcial que admin aún no abrió, o uno completamente nuevo (P4 para su grupo específico).

### Migración
- Tabla `solicitudes_parcial` con: ciclo_id, asignacion_id (opcional), numero, nombre_sugerido, motivo, fechas sugeridas, estado, solicitante, resolutor
- RLS: maestro ve sus propias, admin ve todas

### Flujo
1. Maestro click "📋 Solicitar al admin la apertura de un parcial" en `/profesor/calificaciones-proponer`
2. Llena form: número, nombre sugerido, fechas sugeridas, motivo (mín 10 chars)
3. Admin recibe notificación
4. Admin va a `/admin/parciales/solicitudes`, lee motivo, aprueba o rechaza
5. Si aprueba: parcial se crea/actualiza automáticamente en `parciales_config`
6. Maestro recibe notificación con resultado

### UI admin
- Cards de stats (pendientes/aprobadas/rechazadas)
- Filtros pestaña
- Cards por solicitud con motivo, fechas sugeridas, contexto de asignación
- Botones "✅ Aprobar y crear/abrir" / "❌ Rechazar" (con prompt para motivo)

## 25. Límite de 2 modificaciones de ficha del alumno

**Caso de uso:** el alumno actualiza su ficha personal libremente, pero queremos limitar cambios excesivos sin justificación.

### Migración
- `ALTER alumnos ADD modificaciones_libres_usadas smallint DEFAULT 0`
- Tabla `solicitudes_modificacion_ficha`: alumno_id, cambios jsonb, valores_anteriores jsonb, motivo, estado, resolutor
- RLS dual: alumno ve/crea las suyas, admin ve todas

### Reglas
- Alumno tiene **2 modificaciones libres** por ciclo
- A partir de la 3era: requiere **motivo escrito** + acudir físicamente a Control Escolar
- Admin aprueba (aplica cambios al instante) o rechaza (con motivo)
- Admin tiene botón "🔄 Reiniciar contador" para casos especiales

### Detalle inteligente
El sistema **solo cuenta como modificación** si REALMENTE cambió algún campo. Si el alumno abre el form y guarda sin cambiar nada, no incrementa el contador.

### UI alumno (`/alumno/ficha`)
- **Badge visible** "X modificaciones libres restantes" con color (verde/ámbar/rosa)
- Si 0 libres: aviso azul explicando el procedimiento
- Si tiene solicitud pendiente: aviso ámbar + botón deshabilitado
- Si requiere aprobación: aparece campo Motivo obligatorio
- Botón cambia: "💾 Guardar cambios" → "📤 Solicitar al admin"

### UI admin (`/admin/alumnos/solicitudes-ficha`)
- Bandeja con filtros + stats
- Por cada solicitud: tabla "Cambios solicitados" con diff visual (anterior tachado → nuevo bold)
- Motivo del alumno destacado
- Botones aprobar/rechazar + "Reiniciar contador"
- Link en sidebar admin sección "Personas"

---

## 📊 Estado final BD al cierre del 17 de mayo

| Tabla | Filas / Notas |
|---|---|
| `solicitudes_parcial` | nueva, vacía esperando casos reales |
| `solicitudes_modificacion_ficha` | nueva, vacía esperando uso |
| `parciales_config` | 3 parciales del ciclo activo configurados |
| `calificaciones_propuestas` | columnas `es_modificacion` + `valor_anterior` agregadas |
| `alumnos` | columna `modificaciones_libres_usadas` agregada |

## 🗂️ Migraciones aplicadas el 17 de mayo

15. `calificaciones_propuestas_modificaciones`
16. `parciales_flexible_hasta_6`
17. `solicitudes_parcial`
18. `limite_modificaciones_ficha_alumno`

## 📦 Componentes y páginas nuevas (17 mayo)

| Ruta/Componente | Tipo | Función |
|---|---|---|
| `/api/plantilla-calificaciones/[asignacionId]` | route | Genera XLSX precargado por asignación+parcial |
| `/admin/parciales/solicitudes` | page | Bandeja de solicitudes de apertura de parcial |
| `/admin/alumnos/solicitudes-ficha` | page | Bandeja de solicitudes de modificación de ficha |
| `SolicitarParcialBtn.tsx` | component | Botón + form para solicitar parcial al admin |
| `FichaForm.tsx` | component | Form de ficha con contador y aviso |
| `ResolverForm.tsx` (parcial) | component | Botones aprobar/rechazar parcial |
| `ResolverFichaForm.tsx` | component | Botones aprobar/rechazar ficha + reiniciar contador |

---

# 🎯 QUÉ LE FALTA AL SISTEMA — Análisis crítico al cierre de mayo

## Prioridad ALTA (impacto inmediato)

### 1. Activar correos reales
- ✅ Código listo (`src/lib/email/send.ts` con Resend)
- ⏸ Falta: configurar `RESEND_API_KEY` en Vercel
- **Impacto sin esto:** los crons `resumen-semanal` y notificaciones por correo no se envían (quedan como `skipped` en `correo_log`)
- **Esfuerzo:** 5 min — crear cuenta gratis en Resend (3000 correos/mes), generar key, pegarla en Vercel env vars

### 2. Backup automático verificable
- Supabase free tier tiene backup diario por 7 días (limitado)
- Recomendación: pasar a Supabase Pro ($25/mes) para PITR 30 días + backups exportables
- **Alternativa gratis:** cron mensual que ejecuta `pg_dump` y sube a Drive/Dropbox

### 3. Foto de credencial / Carnet digital del alumno
- Ya hay `foto_url` en `alumnos` pero falta:
  - Endpoint que genera PDF/JPEG con credencial oficial del alumno (foto, datos, QR de verificación)
  - QR que apunte a URL pública verificable
- **Uso:** identificación en exámenes, salidas, eventos

### 4. Boleta oficial firmada digitalmente
- PDF de boleta ya existe pero sin sello/firma criptográfica
- Falta: firmar con clave del director (E-Firma SAT) o al menos hash visible
- **Uso:** validez ante autoridades educativas

### 5. Reportes SEIEM oficiales
- SEIEM requiere formatos XLSX específicos para reportes trimestrales
- Falta: endpoint que genera el XLSX con la estructura oficial de SEIEM/COSFAC
- **Uso crítico:** sin esto, el plantel debe re-capturar manualmente para enviar reportes

## Prioridad MEDIA (mejora UX significativa)

### 6. Notificaciones push web
- Web Push API + Service Worker mejorado
- Notifica al alumno/profesor en tiempo real sin tener la pestaña abierta
- Reduce dependencia de revisar la campana

### 7. App móvil nativa (React Native / Capacitor)
- La PWA actual funciona en móvil pero no se siente nativa
- React Native compartiría el backend, agrega: notificaciones push nativas, biometría
- **Costo:** 1-2 meses de desarrollo

### 8. Buscador global tipo Cmd+K
- En todo el admin: tecla `Cmd/Ctrl+K` abre buscador instantáneo
- Busca cross-entidades: alumnos, profesores, materias, grupos, asignaciones
- **Mejora velocidad de operación 10x para admin con muchos datos**

### 9. Modo oscuro
- Tema dark para los layouts privados
- Particularmente útil para uso prolongado del profesor capturando notas

### 10. Exportes universales a Excel
- Botón "Exportar" en CADA listado (alumnos, profesores, calificaciones, asistencia, etc.)
- Hoy solo existe en algunos lados

### 11. Búsqueda en chats y mensajes
- Hoy si tienes 100 mensajes con un alumno, no puedes buscar por palabra
- Agregar buscador dentro del hilo de mensajes

### 12. Auditoría visible
- Tabla `audit_log` existe en BD pero no tiene UI
- Falta: página `/admin/auditoria` con filtros (quién/cuándo/qué tabla/qué cambió)

## Prioridad MEDIA-BAJA (calidad de vida)

### 13. Encuesta de satisfacción periódica
- Cada bimestre lanzar encuesta a alumnos y padres (anónima)
- Métricas para dirección sobre clima escolar

### 14. WhatsApp Business API
- Avisos masivos vía WhatsApp en lugar de solo correo
- Costo: ~$0.04 USD por mensaje, requiere cuenta WhatsApp Business

### 15. Pase de lista con QR
- Cada alumno tiene QR único en su credencial digital
- Profesor escanea desde su celular → asistencia capturada al instante
- Reduce tiempo de pase de lista de 10 min a 2 min

### 16. Plan de mejora individual (PMI)
- Para alumnos en riesgo (score alto en `riesgo_snapshots`), crear plan con:
  - Acciones específicas
  - Responsables (orientador, padres)
  - Fechas de seguimiento
  - Resultados medibles

### 17. Banco de exámenes / preguntas
- Hoy cada examen es independiente
- Crear "banco" de preguntas reutilizables entre exámenes y profesores
- Genera exámenes aleatorios desde el banco

### 18. Aprendizajes esperados (alineación NEM)
- Cada actividad/examen vinculada a aprendizajes esperados específicos del programa NEM
- Genera reportes de cobertura curricular automáticos

### 19. Reglamento firmado digitalmente
- Al primer login, el alumno debe leer y aceptar el reglamento escolar
- Queda registro con timestamp y IP

### 20. Tests E2E completos
- Existe `tests/` con Playwright pero cobertura limitada
- Falta: tests automatizados para flujos críticos (login, captura de calificaciones, solicitudes)
- Cada deploy debería correr la suite

## Prioridad BAJA (nice-to-have)

### 21. IA generativa para asistencia
- Botón en interventions: "✨ Generar borrador de mensaje al tutor"
- Usa Claude API para redactar comunicaciones formales

### 22. Calendario integrado con Google Calendar
- Eventos institucionales se sincronizan automáticamente
- Padres pueden suscribirse al calendario del plantel

### 23. Pago en línea integrado
- Stripe / OpenPay / Mercado Pago
- Padres pagan colegiatura/donaciones desde el sistema
- Recibo automático

### 24. Recibos fiscales CFDI 4.0
- Si el plantel facturar (donativos deducibles), integrar generación de CFDI
- Requiere PAC y E-Firma del plantel

### 25. Gestión de inventario y préstamos
- Catálogo de libros, equipo, material deportivo
- Préstamo con código QR, devolución, multas

### 26. Comunidades por grupo
- Cada grupo tiene su "mini red social" interna moderada
- Avisos del orientador, dudas entre compañeros, encuestas

### 27. Portafolio de evidencias enriquecido
- Existe `portafolio` pero podría agregar:
  - Versionado (entregas múltiples)
  - Comentarios temporales
  - Calificación con rúbrica
  - Vinculación a aprendizajes esperados

### 28. Multi-plantel
- Si EPO 221 quiere replicar el sistema en otros planteles
- Multi-tenant: una sola BD, múltiples escuelas
- Permite a SEIEM gestionar 100+ planteles desde una instancia

## Lo que YA está y funciona bien

✅ Auth + RLS robusto · ✅ Roles (alumno/profesor/orientador/admin/staff/finanzas/director) · ✅ Flujo maestro→orientador→alumno con modificaciones · ✅ Parciales flexibles · ✅ Solicitudes de revisión con conversación · ✅ Importación masiva con plantilla · ✅ Detección temprana de riesgo · ✅ Crons (riesgo diario, resumen semanal listo) · ✅ Sitio público completo · ✅ Galería de videos institucional · ✅ Calendario · ✅ Avisos con confirmación · ✅ Tareas y exámenes en línea · ✅ Chat grupal y mensajes · ✅ Tutorías y citas · ✅ Evaluación docente anónima · ✅ Planeación didáctica con versionado · ✅ Constancias de servicio · ✅ Kardex/boleta PDF · ✅ Edición universal de perfil · ✅ Reset de contraseñas en 2 modos · ✅ PWA · ✅ Notificaciones in-app · ✅ Adjuntos en chats/solicitudes · ✅ Auditoría a nivel de BD

## Recomendación priorizada para próximas iteraciones

**Sprint 1 (1 semana):**
1. Configurar Resend → activar correos a tutores
2. Endpoint de credencial digital del alumno con QR
3. Auditoría visible (`/admin/auditoria` page)

**Sprint 2 (1 semana):**
4. Exportes universales a Excel
5. Buscador global (Cmd+K)
6. Tests E2E críticos

**Sprint 3 (2 semanas):**
7. Reportes SEIEM oficiales
8. Pase de lista con QR
9. PMI (Plan de Mejora Individual)

**Sprint 4 (1 mes):**
10. App móvil con notificaciones push
11. Multi-plantel si SEIEM lo solicita
12. Pago en línea

---

**Bitácora de mayo 2026 (FINAL).**
**Próxima fase:** ejecutar prueba del sábado → recopilar feedback → priorizar Sprint 1.

---

# 26. ADENDA — Limpieza de datos + Sprint 1 (17 mayo 2026)

## 26.1 Limpieza de datos de prueba

Se eliminaron todos los datos de prueba dejando sólo:
- Admin: `alfredo.teran@maxikash.mx`
- Grupo activo: **1°P** (con orientadora Patricia Najera)
- Profesores activos: **Pablo (Matemáticas)** y **Concilio (Lengua y Comunicación)**
- 6 alumnos de 1°P (raul, jose, kevin, manuel, diego, alejandra)
- 2 asignaciones (Mate Pablo + Lengua Concilio)

Se sincronizaron `perfiles.nombre` con `alumnos` (había residuo de migraciones previas con nombres mezclados).

## 26.2 Auditoría visible
- `/admin/auditoria` ya existía con filtros por tabla/operación + paginación + diff JSON.

## 26.3 Modo oscuro
- `tailwind.config.ts`: `darkMode: 'class'`.
- `src/components/DarkModeToggle.tsx`: toggle Sol/Luna, persiste en `localStorage.epo221-theme`, respeta `prefers-color-scheme` la primera vez.
- Integrado en `Topbar`.

## 26.4 Exportes universales a Excel
- `src/lib/excel-export.ts`: helper `exportToExcel(rows, columns, filename, sheetName)` y `exportAuto(rows, filename)`.
- `src/components/ExportExcelButton.tsx`: botón reusable. Uso:
  ```tsx
  <ExportExcelButton rows={alumnos} columns={[
    { header: 'Matrícula', key: 'matricula', width: 12 },
    { header: 'Nombre', key: (a) => `${a.apellido_paterno} ${a.nombre}`, width: 28 },
  ]} filename="alumnos.xlsx" />
  ```

## 26.5 Buscador global Cmd+K
- `src/components/CommandPalette.tsx`: indexa 30+ rutas del admin.
- Atajo `Cmd/Ctrl + K`. Flechas + Enter para navegar.
- Botón "🔎 Buscar… ⌘K" en Topbar.

## 26.6 Búsqueda en chats
- `/profesor/mensajes?q=palabra`: ilike en `mensajes.cuerpo`, filtra hilos que contengan el término.
- Formulario simple arriba del listado de hilos.

## 26.7 Push notifications web
- Migración: tabla `push_subscriptions(perfil_id, endpoint, p256dh, auth, user_agent)` con RLS self.
- `public/sw.js` extendido con handlers `push` + `notificationclick`.
- `src/components/PushNotifToggle.tsx`: pide permisos, suscribe, guarda en `/api/push/subscribe`.
- `src/app/api/push/subscribe/route.ts`: upsert por endpoint.
- **Falta para producción:** generar VAPID keys (`npx web-push generate-vapid-keys`), exponer pública como `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, y crear endpoint `/api/push/send` que use `web-push` con la privada. Disparar desde `lib/notificaciones.ts` cuando se cree una notificación.

## 26.8 PMI (Plan de Mejora Individual)
- Tabla `pmi(alumno_id, motivo, objetivos, acciones, responsable_id, fecha_inicio, fecha_revision, estado, resultado)`.
- `/admin/pmi`: panel con counts (activos/cumplidos/cancelados), formulario nuevo PMI, listado con cierre inline.
- Alumno ve sus propios PMI vía RLS.

## 26.9 Aprendizajes esperados (NEM)
- Tabla `aprendizajes_esperados(materia_id, campo_disciplinar_id smallint, codigo, descripcion, semestre)`.
- Columnas `aprendizaje_id` añadidas a `tareas`, `planeaciones`, `portafolio_evidencias`.
- `/admin/aprendizajes`: CRUD con filtro por materia.

## 26.10 Banco de preguntas reusables
- `examen_preguntas` extendido: `es_banco`, `tema`, `dificultad`, `materia_id`, `autor_id`. `examen_id` ya no es NOT NULL.
- `/admin/banco-preguntas`: alta + filtros (materia/dificultad/tema).

## 26.11 Reglamento firmado digitalmente
- Tablas `reglamento_versiones(version, titulo, contenido_md, vigente)` y `reglamento_firmas(reglamento_id, firmante_id, hash_sha256, ip, user_agent)` UNIQUE.
- `/admin/reglamento`: publicar versión, marcar vigente, ver lista de firmantes.
- `/alumno/reglamento`: leer + checkbox + firmar (genera SHA-256 del payload).

## 26.12 Portafolio enriquecido
- `portafolio_evidencias` ahora con: `tags text[]`, `reflexion`, `aprendizaje_id`, `calificacion_propia`.
- `SubirEvidenciaForm` actualizado con campos para reflexión, tags, autoevaluación y aprendizaje vinculado.

## 26.13 Reporte SEIEM (XLSX)
- `/admin/seiem`: 3 reportes:
  - **Plantilla de grupo:** `/api/seiem/grupo?grupo_id=…` (matrícula, CURP, nombre completo, sexo, fecha nac., tutor, etc.).
  - **Concentrado de calificaciones:** `/api/seiem/calificaciones?ciclo_id=…`.
  - **911 Estadística básica:** `/api/seiem/estadistica` (matrícula H/M por grupo).

## 26.14 Backup automático con cron en Supabase
**Setup gratuito (Supabase plan free incluye backups automáticos 7 días):**
1. **Backups nativos:** Dashboard → Database → Backups. Ya activos diarios 7 días sin configurar nada.
2. **Backup adicional manual a Storage propio** (opcional, gratis):
   - Crear edge function `daily-backup` que use `pg_dump` (vía `supabase functions deploy daily-backup`).
   - En Dashboard → Database → Cron Jobs (extensión `pg_cron`):
     ```sql
     SELECT cron.schedule('backup-diario', '0 3 * * *',
       $$ SELECT net.http_post(url := 'https://<project>.functions.supabase.co/daily-backup',
                                headers := '{"Authorization":"Bearer <service_role>"}'::jsonb) $$);
     ```
3. **Punto-in-time recovery:** requiere plan Pro ($25/mes).

## 26.15 App móvil React Native (documentación)
- Crear repo separado `epo221-mobile` con Expo (`npx create-expo-app`).
- Reutilizar mismo backend Supabase + RLS (cero cambios en BD).
- Pantallas iniciales recomendadas (alumno): Login, Calificaciones, Horario, Avisos, Chat.
- Push nativas: usar Expo Notifications (sustituye a Web Push).
- Compartir tipos TypeScript: extraer carpeta `packages/shared-types` con `pnpm` o npm workspaces.

## 26.16 Multi-plantel (multi-tenant)
- Agregar `plantel_id uuid` a tablas top-level: `alumnos`, `profesores`, `grupos`, `materias`, `ciclos_escolares`, `noticias`, `convocatorias`, `eventos_calendario`.
- Crear tabla `planteles(id, nombre, cct, direccion, logo_url, dominio)`.
- Tabla `perfiles_planteles(perfil_id, plantel_id, rol)` para usuarios con acceso multi-plantel.
- Actualizar RLS con función `mi_plantel_actual()` (lee de `auth.jwt() ->> 'plantel_id'`).
- Selector de plantel en topbar para usuarios con varios.

## 26.17 Tests E2E completos
- Instalar Playwright: `npm i -D @playwright/test && npx playwright install`.
- Estructura sugerida `e2e/`:
  - `auth.spec.ts` (login admin/profesor/alumno)
  - `flujo-calificaciones.spec.ts` (profesor sube → orientadora valida → alumno ve)
  - `flujo-ficha.spec.ts` (alumno modifica 2 veces libre, 3ª solicita admin)
  - `flujo-parciales.spec.ts` (profesor solicita → admin aprueba)
  - `flujo-pmi.spec.ts`
  - `flujo-reglamento.spec.ts`
- Correr en CI: `.github/workflows/e2e.yml` con `actions/setup-node` + `npx playwright test`.

---

**FINAL Sprint 1 — 17 mayo 2026.**
Features entregadas: auditoría, modo oscuro, exportes Excel, Cmd+K, búsqueda chats, push (sin VAPID), PMI, NEM, banco preguntas, reglamento firmado, portafolio enriquecido, SEIEM (3 reportes), docs backup/móvil/multi-tenant/E2E.

---

# 27. Sprint 1.5 (mismo 17 mayo 2026, tarde)

## 27.1 VAPID + push automático vía trigger DB
- Generadas VAPID keys y agregadas a `.env.local` + `.env.example`.
- `src/lib/push.ts`: `sendPushToUser(perfilId, payload)` y `sendPushToUsers([...])`. Usa `web-push`, limpia subscriptions 404/410.
- `src/app/api/push/send/route.ts`: endpoint manual (admin para masivo, self para test).
- `src/app/api/push/from-trigger/route.ts`: webhook que recibe payload del trigger DB y dispara push.
- **Trigger DB con `pg_net`:** `notificacion_push_trigger` AFTER INSERT ON `notificaciones` llama a webhook configurable. Esto cubre los 20+ sitios que insertan en `notificaciones` sin tocar código.
- `push_webhook_config(webhook_url, webhook_secret, enabled)` — config single-row.
- `/admin/push`: UI para configurar URL/secret/enabled.

**Cómo activar en producción:**
1. Desplegar Vercel/etc. → URL pública.
2. `/admin/push` → Webhook URL = `https://tu-dominio.com/api/push/from-trigger`.
3. Generar secret: `openssl rand -hex 32`.
4. Habilitar casilla y guardar.
5. Usuarios pulsan "🔔 Activar push" para suscribirse.

## 27.2 Cmd+K cross-entity
- `/api/admin/search?q=…`: busca paralelo en `alumnos` (nombre/apellidos/matrícula/CURP/email), `profesores`, `grupos`, `materias`. Solo admin/staff/director.
- `CommandPalette` ahora:
  - Static items (35 rutas) + live items (alumnos/profesores/grupos/materias).
  - Debounce 250ms.
  - Resultados live aparecen primero con sub-info (matrícula, grupo, email).
  - Deep links a `/admin/alumnos/[id]`, `/admin/grupos/[id]`.

## 27.3 Seed reglamento institucional
- Insertada versión `2026.1` "Reglamento institucional EPO 221 — Ciclo 2026" como VIGENTE.
- Estructura 9 capítulos / 22 artículos: disposiciones, inscripciones, asistencia, evaluación, conducta, uniforme, derechos/deberes, procedimientos, vigencia.
- Alumnos pueden firmarlo en `/alumno/reglamento`.

## 27.4 Seed NEM (1° semestre)
- **Pensamiento Matemático I** (8 aprendizajes): números reales, propiedades, razones/proporciones, jerarquía, notación científica, sucesiones, magnitudes, argumentación.
- **Lengua y Comunicación I** (8 aprendizajes): comprensión, funciones del lenguaje, producción de textos, ortografía, citas, oralidad, lectura crítica, estereotipos.
- Pablo y Concilio ya pueden vincular tareas/planeaciones a estos aprendizajes desde sus paneles.

## 27.5 Playwright E2E
- `playwright.config.ts`: chromium, locale es-MX, base URL env-configurable, dev server auto.
- `e2e/fixtures.ts`: helper `login(page, who)` con credenciales reales del entorno limpio.
- Specs incluidas (6 archivos, 11 tests):
  - `auth.spec.ts` (4 tests: login admin/profesor/alumno + credenciales inválidas)
  - `admin-search.spec.ts` (Cmd+K + API search)
  - `reglamento.spec.ts`
  - `pmi.spec.ts`
  - `nem-banco.spec.ts`
  - `seiem-export.spec.ts` (UI + verifica content-type XLSX)
- Scripts npm: `e2e`, `e2e:ui`, `e2e:install`.

**Correr en local:**
```bash
npm run e2e:install   # primera vez (descarga Chromium)
npm run e2e           # corre todos los tests
npm run e2e:ui        # modo interactivo
```

## 27.6 App móvil RN (documentado)
- Archivo `APP_MOVIL_RN.md` en raíz: setup Expo, dependencias, supabase client compartido (reusa RLS), pantallas Sprint 1, push nativas con Expo Notifications + tabla `expo_push_tokens`, builds con EAS, opciones de monorepo para compartir tipos, roadmap 4 sprints.

---

**FINAL Sprint 1.5 — 17 mayo 2026 (tarde).**
**Próximo Sprint 2:** decidir si arrancamos app móvil + setup CI/CD con tests E2E + activar push en producción cuando haya URL pública.
