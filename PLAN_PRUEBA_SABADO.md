# 🧪 Plan de Prueba — Sábado
> **URL:** https://epo221.edu.mx
> **Backend:** Supabase `hvycaqghrkvspkzouape`
> **Fecha:** sábado próximo
> **Objetivo:** Verificar end-to-end el flujo MAESTRO → ORIENTADOR → ALUMNO con reclamación, en condiciones reales.

> ⚠️ **Esta es la versión actualizada de mayo 2026** tras todos los fixes y mejoras del mes.

---

## 1. CREDENCIALES VIGENTES

### 🎓 ALUMNOS DEL GRUPO 1°P (Pablo Cantoral)

**Patrón de email:** `<nombre>.<apellido>@epo221.edu.mx` (todo minúsculas, sin acentos)
**Password universal:** `TEMPORALEPO221!`

| Matrícula | Nombre | Email de login |
|---|---|---|
| 20260001 | Raúl Flores Chávez | `raul.flores@epo221.edu.mx` |
| 20260002 | José Ortiz Flores | `jose.ortiz@epo221.edu.mx` |
| 20260003 | Kevin Rojas Martínez | `kevin.rojas@epo221.edu.mx` |
| 20260004 | Manuel Lara Jiménez | `manuel.lara@epo221.edu.mx` |
| 20260005 | Diego García Ramírez | `diego.garcia@epo221.edu.mx` |
| 20260006 | Alejandra García Martínez | `alejandra.gaercia@epo221.edu.mx` |

### 👨‍🏫 PROFESORES REALES (cuentas para la prueba)

| Email | Profesor | Materia / Rol funcional |
|---|---|---|
| `pablo@epo221.mx` | Pablo Cantoral | **Solo Maestro** (Pensamiento Matemático en 1°P) |
| `concilionajera@gmail.com` | Concilio Najera | **Solo Maestro** (Lengua y Comunicación en 1°P) |
| (orientador asignado) | (el que tú definiste) | **Orientador de 1°P** |

Las passwords de los profesores son las que tú estableciste. Si alguno olvidó, ve a `/admin/usuarios` y resetea.

### 👨‍🏫 CUENTAS TEST ALTERNAS (para practicar todo el flujo)

| Email | Password | Rol funcional |
|---|---|---|
| `prof.solo@test.epo221.mx` | `TestSabado2026!` | Solo maestro |
| `prof.orientador@test.epo221.mx` | `TestSabado2026!` | Maestro + Orientador |
| `orientador.solo@test.epo221.mx` | `TestSabado2026!` | Solo orientador |

### ⚙️ ADMIN

| Email | Notas |
|---|---|
| `admin@epo221.edu.mx` | El que tú definiste |

---

## 2. ESTRUCTURA DEL GRUPO PRINCIPAL DE PRUEBA

```
Grupo 1°P (matutino) — Bachillerato General
  Orientador: (el profesor que tú asignaste)
  Asignaciones:
    ✓ Pensamiento Matemático I → Pablo Cantoral
    ✓ Lengua y Comunicación I → Concilio Najera
  Alumnos inscritos: 6
    - Raúl Flores, José Ortiz, Kevin Rojas,
      Manuel Lara, Diego García, Alejandra García
```

---

## 3. FLUJO DE PRUEBA — PASO A PASO

### ESCENA A — Pablo envía calificaciones de Matemáticas

1. Login: `pablo@epo221.mx`
2. Sidebar → **"📤 Enviar calificaciones"** (sección Docencia)
3. Selecciona: `Pensamiento Matemático I · 1°P matutino` · Parcial `1`
4. Click **"Cargar grupo"** → aparece tabla con 6 alumnos
5. Captura calificaciones (ej.):
   - Raúl: 9.0
   - José: 8.5
   - Kevin: 5.5 (reprobado, será el que reclame)
   - Manuel: 7.5
   - Diego: 8.0
   - Alejandra: 9.5
6. Observación: "Calificaciones P1 ciclo actual"
7. Click **"📤 Enviar al orientador"**
8. Mensaje: ✅ "6 propuestas enviadas al orientador"

### ESCENA B — Orientador valida

1. Login como el orientador del 1°P (la cuenta que tú asignaste)
2. Notificación: "📝 Calificaciones por validar"
3. Sidebar → **"🧭 Orientación"** → **"✅ Validar calificaciones"**
4. Tabla con 6 propuestas en estado `pendiente`
5. Click ✅ **Validar** para los primeros 5
6. Para Kevin (5.5) click ❌ **Rechazar** → prompt: "Verifica si entregó el proyecto final"
7. Refresca: 5 validadas, 1 rechazada

### ESCENA C — Pablo recibe rechazo y reenvía corrección

1. Login como `pablo@epo221.mx`
2. Notificación: "❌ Calificación rechazada — Verifica si entregó el proyecto final"
3. Vuelve a `/profesor/calificaciones-proponer` con la misma asignación
4. Bitácora muestra los 6 estados (5 ✅ + 1 ❌)
5. Modifica calificación de Kevin a 7.0 y reenvía
6. Orientador recibe nueva notificación → puede validar

### ESCENA D — Alumno (Kevin) ve calificación y reclama

1. Login: `kevin.rojas@epo221.edu.mx` / `TEMPORALEPO221!`
2. Notificación: "📊 Nueva calificación disponible"
3. Sidebar → **"Calificaciones"** → verá Mat P1: 7.0
4. Si considera que merecía más, click **"Solicitar revisión"**
5. Motivo: "Considero que mi calificación debió ser mayor — entregué la actividad #5 a tiempo"
6. Adjunto opcional: foto del cuaderno
7. Click Enviar → solicitud creada en estado `abierta`

### ESCENA E — Pablo responde la solicitud

1. Login: `pablo@epo221.mx`
2. Notificación: "💬 Nueva solicitud de revisión"
3. Sidebar → **"Solicitudes"**
4. Lee el motivo de Kevin
5. En la sección **"💬 Conversación"** escribe respuesta
6. Click **✉️ Enviar**

### ESCENA F — Orientador VE la conversación automáticamente

1. Login como el orientador
2. Sidebar → **"🧭 Orientación"** → **"Acompañar solicitudes"**
3. Ve la solicitud de Kevin aunque no la creó él ni recibió mensaje directo (trigger automático)
4. Puede agregar mensaje propio acompañando

### ESCENA G — Cierre del ticket

Cualquiera de los 3 (alumno, maestro, orientador) puede dar **🔒 Cerrar** desde la conversación. Reabrir disponible si hay nuevo asunto.

### ESCENA H — Probar cuentas combo (opcional)

Con las cuentas test:
- `prof.orientador@test.epo221.mx`: verifica que el sidebar muestra TANTO "Docencia" como "🧭 Orientación"
- `orientador.solo@test.epo221.mx`: solo ve "🧭 Orientación"
- `prof.solo@test.epo221.mx`: solo ve "Docencia"

---

## 4. URLs CLAVE

| Quién | URL | Qué prueba |
|---|---|---|
| Maestro | `/profesor/calificaciones-proponer` | Envía calificaciones |
| Orientador | `/profesor/orientacion/calificaciones` | Valida/rechaza |
| Orientador | `/profesor/orientacion/solicitudes` | Acompaña tickets |
| Alumno | `/alumno/calificaciones` | Ve calificaciones |
| Alumno | `/alumno/solicitudes` | Reclama + chat |
| Maestro | `/profesor/solicitudes` | Responde |
| Admin | `/admin/usuarios` | Reset contraseñas |
| Admin | `/admin/alumnos` | Importación masiva |
| Admin | `/admin/usuarios/nuevo` | Alta unificada |

---

## 5. IMPORTACIÓN MASIVA — flujo nuevo

Si necesitas dar de alta más alumnos durante la prueba:

1. `/admin/alumnos` → **📥 Descargar plantilla XLSX**
2. Llena el Excel (mínimo CURP + Nombre + Apellido Paterno + Matrícula)
3. Vuelve a `/admin/alumnos` → arrastra el archivo o haz clic para seleccionar
4. **📥 Importar alumnos**
5. Verás resumen con conteos + botón **"📥 Descargar credenciales XLSX"**
6. El XLSX descargado tiene la lista de credenciales (email + password) lista para imprimir

### Reglas automáticas (sin intervención manual)
- Email: `nombre.apellido@epo221.edu.mx` (auto-generado)
- Password: `TEMPORALEPO221!` (universal)
- Vinculación a ficha: automática
- Si el CURP ya existe: actualiza datos sin duplicar

---

## 6. DEBUGGING — si algo falla

### Alumno no entra
1. Verifica el email exacto: `nombre.apellido@epo221.edu.mx` (todo minúsculas)
2. Si dice "Cuenta no vinculada": el layout auto-vincula al recargar la página. Pide al alumno **pull-to-refresh**.
3. Si aún falla: en `/admin/usuarios` busca al alumno → 🔑 **Temporal** para resetear

### Orientador no ve sus grupos
- Verifica en `/admin/grupos` que el grupo tenga `orientador_id` asignado al profesor correcto

### Maestro no encuentra asignación al enviar calificaciones
- Verifica en `/admin/asignaciones` que la materia esté asignada a ese profesor en ese grupo y ciclo activo

### Solicitud no llega al orientador
- Trigger SQL `set_solicitud_orientador` debería rellenar `orientador_id` automáticamente
- Si está NULL: ejecutar manualmente `UPDATE solicitudes_revision SET orientador_id = (lookup) WHERE id = ...`

---

## 7. AL FINALIZAR LA PRUEBA

Recopilar:
- ✅ Cosas que funcionaron bien
- ⚠️ Cosas confusas o difíciles para el usuario
- 🐛 Bugs encontrados
- 💡 Sugerencias de mejora

Subir feedback a `/admin/auditoria` o como Issue en GitHub para tracking.

---

## 8. VERIFICACIONES HECHAS ANTES DEL SÁBADO

- ✅ Bug RLS arreglado — alumnos sí ven su propia ficha
- ✅ Bug logout 404 arreglado
- ✅ Bug "Tu cuenta no está vinculada" arreglado
- ✅ Emails actualizados al patrón `nombre.apellido@epo221.edu.mx`
- ✅ Passwords reseteadas a `TEMPORALEPO221!` para todos los alumnos
- ✅ Auto-vinculación en layout como red de seguridad
- ✅ Trigger `set_solicitud_orientador` activo
- ✅ Trigger `max_orientador_grupos` activo (máx 4 grupos por orientador)
- ✅ RPC `aplicar_propuesta_calificacion` con SECURITY DEFINER
- ✅ Plantilla XLSX descargable actualizada con nuevas reglas
- ✅ Botón descargar credenciales tras importación masiva

---

**Listo para producción real.**
