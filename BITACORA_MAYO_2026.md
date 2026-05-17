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

**Bitácora de mayo 2026 completa.**
**Próxima:** depende del resultado del sábado.
