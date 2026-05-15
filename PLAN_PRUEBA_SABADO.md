# 🧪 Plan de Prueba — Sábado
> **URL:** https://epo221.vercel.app
> **Backend:** Supabase `hvycaqghrkvspkzouape`
> **Fecha estimada:** sábado próximo
> **Objetivo:** Verificar end-to-end el flujo MAESTRO → ORIENTADOR → ALUMNO con reclamación.

---

## 1. CREDENCIALES TEST (todas listas para login)

### 👨‍🏫 PROFESORES

| # | Email (login) | Password inicial | Rol funcional | Características |
|---|---|---|---|---|
| 1 | `prof.solo@test.epo221.mx` | `TestSabado2026!` | **Solo maestro** | Da clase de Pensamiento Matemático en grupo TEST 1°Z. NO orienta ningún grupo. |
| 2 | `prof.orientador@test.epo221.mx` | `TestSabado2026!` | **Maestro + Orientador** | Da clase de Ciencias Naturales en grupo 1°Z (donde NO es orientador), y es ORIENTADOR del grupo 1°Y. |
| 3 | `orientador.solo@test.epo221.mx` | `TestSabado2026!` | **Solo orientador** | NO da clases. Es orientador del grupo TEST 1°Z (donde están los 5 alumnos). |

### 🎓 ALUMNOS DEL GRUPO 1°Z (5 inscritos)

| # | Email (login) | Password inicial | Nombre |
|---|---|---|---|
| 1 | `garm050312hdfrzr01@epo221.local` | `EPO221-221001` | Mario García Ramírez |
| 2 | `hrca071203mdfrst11@epo221.local` | `EPO221-20250002` | Camila Hernández Romero |
| 3 | `llsa070921hdfrst11@epo221.local` | `EPO221-20250003` | Santiago López Luna |
| 4 | `grre070710mdfrst11@epo221.local` | `EPO221-20250004` | Regina González Rivera |
| 5 | `rvma070428hdfrst11@epo221.local` | `EPO221-20250005` | Mateo Rodríguez Vázquez |

> 💡 El email del alumno se forma con su CURP en minúsculas + `@epo221.local`. Su password inicial es `EPO221-<matrícula>`.

### ⚙️ ADMIN (ya existente)

| Email | Notas |
|---|---|
| `admin@epo221.local` | El que tú definiste. Si olvidaste password, ve a `/admin/usuarios` con cualquier admin alterno y resetea. |

---

## 2. ESTRUCTURA DE PRUEBA

```
Ciclo activo: 2025-2026 (período 2025-2026)
└── Grupo TEST 1°Z (matutino) — Orientador: Orientador SOLO
    ├── Asignación: Pensamiento Matemático I → Profesor SOLO
    ├── Asignación: Ciencias Naturales I → Profesor + Orientador (aquí solo da clase)
    └── Inscripciones (5 alumnos):
        - Mario García
        - Camila Hernández
        - Santiago López
        - Regina González
        - Mateo Rodríguez

Grupo TEST 1°Y (matutino) — Orientador: Profesor + Orientador
    └── (sin asignaciones aún, sirve para mostrar combo profesor+orientador)
```

---

## 3. FLUJO DE PRUEBA — PASO A PASO

### ESCENA A — Maestro envía calificaciones (Profesor SOLO)

1. Login como **`prof.solo@test.epo221.mx`** / `TestSabado2026!`
2. Sidebar izquierdo: clic en **"📤 Enviar calificaciones"** (sección Docencia)
3. URL: `/profesor/calificaciones-proponer`
4. Selecciona:
   - Asignación: `Pensamiento Matemático I · 1°Z (matutino)`
   - Parcial: `Parcial 1`
   - Click **"Cargar grupo"**
5. Aparece aviso amarillo: 🧭 **Orientador del grupo: Orientador TEST Solo Orientación**
6. Tabla con 5 alumnos. Captura calificaciones (ej.):
   - Mario: 9.0, faltas 0
   - Camila: 7.5, faltas 2
   - Santiago: 5.5, faltas 4 (reprobado, para reclamar después)
   - Regina: 8.0, faltas 1
   - Mateo: 6.0, faltas 3
7. Observación opcional: "Calificaciones del primer parcial 2026-A"
8. Click **"📤 Enviar al orientador"**
9. Aparece mensaje: ✅ "5 propuestas enviadas al orientador"
10. Si bajas, en "Bitácora" verás todas con estado `pendiente` (chips ámbar)
11. **Comprueba:** sidebar del Profesor SOLO NO muestra sección "🧭 Orientación" (correcto, no es orientador)

### ESCENA B — Orientador valida (Orientador SOLO)

1. **Cierra sesión** o abre ventana incógnito
2. Login como **`orientador.solo@test.epo221.mx`** / `TestSabado2026!`
3. **Comprueba** la campana de notificaciones (Topbar): debe haber notificación reciente "📝 Calificaciones por validar"
4. **Comprueba** sidebar: aparece sección **"🧭 Orientación"** con 3 sub-items y badge en "Validar calificaciones" (5)
5. Clic en **"✅ Validar calificaciones"** → URL `/profesor/orientacion/calificaciones`
6. Stats: Pendientes **5**, Validadas 0, Rechazadas 0
7. Tabla con 5 propuestas. Por cada fila:
   - **Para 4 alumnos:** click `✅ Validar` (sin motivo)
   - **Para Mario (9.0):** click `❌ Rechazar` → ventana popup pidiendo motivo, escribe "Verifica si Mario tiene examen de recuperación pendiente"
8. Refresca la página. Stats: Pendientes **0**, Validadas **4**, Rechazadas **1**
9. Filtra por "Validadas" → ves los 4. Por "Rechazadas" → ves la de Mario.

### ESCENA C — Maestro recibe rechazo y reenvía corrección

1. Cierra sesión, login otra vez como **`prof.solo@test.epo221.mx`**
2. Notificación: "✅ Calificación validada" (4 veces) + "❌ Calificación rechazada" (1 vez con el motivo)
3. Ve a `/profesor/calificaciones-proponer`, selecciona misma asignación + parcial
4. La bitácora abajo muestra los 5 estados (4 verdes ✅ + 1 rosa ❌)
5. En la tabla principal: los inputs de los 4 validados quedan editables (puede subir corrección si quisiera) y el de Mario también (porque su última fue rechazada)
6. Cambia la calificación de Mario a 7.0 y reenvía solo ese
7. El Orientador recibe nueva notificación → puede validar

### ESCENA D — Alumno ve calificación y reclama

1. Cierra sesión, login como **`hrca071203mdfrst11@epo221.local`** / `EPO221-20250002` (Camila)
2. Notificación: "📊 Nueva calificación disponible" (parcial 1, Pensamiento Matemático: 7.5)
3. Sidebar → **"Calificaciones"** → tabla con sus materias
4. Para Pensamiento Matemático verá `P1: 7.5`
5. Si Camila considera que merecía más, click en **"Solicitar revisión"** del parcial 1
6. Form: Motivo "Considero que mi calificación debió ser 8.0 porque entregué la actividad #5 a tiempo"
7. Adjunta opcional: ej. una imagen del cuaderno (cualquier archivo)
8. Click **Enviar**
9. Confirma que en `/alumno/solicitudes` aparece la solicitud con estado `abierta`

### ESCENA E — Maestro responde la solicitud

1. Login como **`prof.solo@test.epo221.mx`**
2. Notificación: "💬 Nueva solicitud de revisión"
3. Sidebar → **"Solicitudes"** → ve la solicitud de Camila
4. Lee el motivo, click en formulario inferior **"💬 Conversación"**
5. Escribe respuesta: "Camila, revisé tu actividad #5. Efectivamente sumaba 0.5 más, ajusto tu calificación. Saludos."
6. Click **✉️ Enviar**

### ESCENA F — Orientador VE la conversación automáticamente

1. Login como **`orientador.solo@test.epo221.mx`**
2. Sidebar → "🧭 Orientación" → **"Acompañar solicitudes"** → URL `/profesor/orientacion/solicitudes`
3. **Comprueba:** ve la solicitud de Camila aunque NO la creó él ni recibió mensaje directo
4. Lee toda la conversación: motivo del alumno + respuesta del maestro
5. Puede agregar mensaje propio: "Como orientadora del grupo, acompaño la revisión. Si ajustas la calificación a 8.0, reenvía la propuesta y la valido."
6. **Comprueba:** la conversación aparece sincronizada en las 3 vistas (alumno, maestro, orientador)

### ESCENA G — Cierre del ticket

Cualquiera de los 3 (alumno, maestro, orientador) puede dar **🔒 Cerrar** la conversación. Una vez cerrada, todos pueden **🔓 Reabrir** si surge nuevo punto.

### ESCENA H — Profesor + Orientador (combo de roles)

1. Login como **`prof.orientador@test.epo221.mx`**
2. **Comprueba:** sidebar muestra DOS secciones:
   - **"Docencia"** con Inicio, Mis grupos, "📤 Enviar calificaciones"
   - **"🧭 Orientación"** con sus opciones (porque es orientador del 1°Y)
3. Como **maestro**: en `/profesor/calificaciones-proponer` puede enviar calificaciones de Ciencias Naturales (su asignación en 1°Z)
4. Como **orientador**: en `/profesor/orientacion/calificaciones` recibe las propuestas de los maestros del grupo 1°Y (vacío por ahora)
5. **Comprueba:** funciona la dualidad correctamente

---

## 4. URLs CLAVE PARA EL DÍA

| Quién | URL | Qué prueba |
|---|---|---|
| Maestro | `/profesor/calificaciones-proponer` | Envía calificaciones |
| Orientador | `/profesor/orientacion/calificaciones` | Valida/rechaza propuestas |
| Orientador | `/profesor/orientacion/solicitudes` | Acompaña tickets |
| Alumno | `/alumno/calificaciones` | Ve sus calificaciones |
| Alumno | `/alumno/solicitudes` | Solicita revisión + chat |
| Maestro | `/profesor/solicitudes` | Responde solicitudes |
| Admin | `/admin/usuarios` | Reset contraseñas (los 5 roles) |
| Admin | `/admin/riesgo` | Detección de riesgo |
| Admin | `/admin/correos` | Bitácora de correos |

---

## 5. SI ALGO FALLA — DEBUGGING

### Reset de contraseña

Si alguien olvidó su password durante la prueba:
1. Login como admin → `/admin/usuarios`
2. Buscar al usuario por nombre o email
3. Click **🔑 Temporal** → password aleatoria nueva (mostrada una sola vez)
4. O click **📧 Magic** → envía link al email

### Notificaciones no llegan

- Verifica que el alumno tenga `perfil_id` en BD: `SELECT perfil_id FROM alumnos WHERE matricula='X'`
- La campana se actualiza al **recargar la página** (no es realtime)

### Solicitud no aparece para el orientador

Verificar el trigger:
```sql
SELECT id, orientador_id FROM solicitudes_revision ORDER BY created_at DESC LIMIT 5;
```
Si `orientador_id` es NULL, hay bug en el trigger. Avísame.

### Calificación no se aplica al alumno

- En `/admin/calificaciones` (admin) verifica que aparezca la calificación
- Si la propuesta está en estado `validada` pero `calificaciones` no actualizó, llamar manualmente:
  ```sql
  SELECT public.aplicar_propuesta_calificacion('<id-de-la-propuesta>');
  ```

---

## 6. DATOS DEL SÁBADO QUE NECESITO DE TI

Para crear las cuentas reales (no test):
- **CURPs** de los alumnos reales que probarán
- **Emails** de los profesores reales
- **Email del orientador** real
- **Asignación** de cada profesor (qué materia da en qué grupo)
- **Quién es orientador** de cada grupo

Yo me encargo de:
1. Crear sus cuentas con login
2. Asignarles materias y grupos
3. Inscribir alumnos
4. Generar password inicial para cada uno (te paso lista)
5. Verificar que cada uno pueda iniciar sesión

---

## 7. VERIFICACIONES YA HECHAS (✅ listo para Saturday)

- ✅ Login funciona para los 8 usuarios test (3 profesores + 5 alumnos)
- ✅ RLS de calificaciones permite escritura via función SECURITY DEFINER
- ✅ Trigger `trg_set_orientador` asigna automáticamente el orientador en cada solicitud nueva (probado en BD)
- ✅ Trigger `trg_max_orientador` evita asignar más de 4 grupos por orientador
- ✅ RLS extendida: orientador ve solicitudes y mensajes de sus grupos
- ✅ Notificación al maestro cuando orientador valida/rechaza
- ✅ Notificación al alumno cuando se valida su calificación (recién agregado)
- ✅ Notificación al orientador cuando se reciben nuevas propuestas
- ✅ Sidebar dinámico: muestra "🧭 Orientación" solo si el profesor es orientador
- ✅ 2 ciclos activos → corregido (solo 1)
- ✅ 5 profesores existentes sin login → todos tienen ahora login (password `EPO221!`, deben cambiarla)

---

## 8. PASSWORDS RÁPIDAS DE REFERENCIA

```
─────────────────────────────────────────────────
  CUENTAS TEST CON LOGIN INMEDIATO
─────────────────────────────────────────────────
  prof.solo@test.epo221.mx          TestSabado2026!
  prof.orientador@test.epo221.mx    TestSabado2026!
  orientador.solo@test.epo221.mx    TestSabado2026!
─────────────────────────────────────────────────
  ALUMNOS GRUPO 1°Z TEST
─────────────────────────────────────────────────
  garm050312hdfrzr01@epo221.local   EPO221-221001
  hrca071203mdfrst11@epo221.local   EPO221-20250002
  llsa070921hdfrst11@epo221.local   EPO221-20250003
  grre070710mdfrst11@epo221.local   EPO221-20250004
  rvma070428hdfrst11@epo221.local   EPO221-20250005
─────────────────────────────────────────────────
  PROFESORES REALES (deben cambiar password)
  Password actual: EPO221!  (forzado a cambiar)
─────────────────────────────────────────────────
  cramirez@epo221.mx       (Carlos Ramírez)
  lgomez@epo221.mx         (Lucía Gómez)
  jperez@epo221.mx         (Jorge Luis Pérez - orientador real)
  atorres@epo221.mx        (Adriana Torres - orientador real)
  rcruz@epo221.mx          (Roberto Cruz)
─────────────────────────────────────────────────
```

---

**Listo para el sábado.** Cuando me pases los datos reales, te aplico todo el setup en menos de 30 minutos.
