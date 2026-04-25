# Pasos de despliegue — CMS público + auditoría

> Fecha: 2026-04-16
> Archivos afectados: `sql/2026-04-16-publico-cms.sql`, nuevas rutas en `/admin/publico/*` y `/publico/*`.

## 1. Correr la migración SQL en Supabase

En el Dashboard de Supabase → SQL Editor → New query → pega y ejecuta:

```
sistema/sql/2026-04-16-publico-cms.sql
```

La migración es idempotente (usa `if not exists` / `on conflict`), puedes re-ejecutarla sin miedo.

Crea:

- `sitio_config` (fila única id=1)
- `paginas_publicas`
- `albumes`, `album_fotos`
- `audit_log` + trigger `fn_audit_trigger` + triggers en materias, noticias, convocatorias, calificaciones, pagos, alumnos, asignaciones
- Columna `deleted_at` en materias/noticias/convocatorias (soft-delete)
- Policies RLS para todas las nuevas tablas

## 2. Crear el bucket de Storage

En Supabase Dashboard → Storage → **New bucket**:

- Nombre: `publico`
- Public bucket: **sí** (activado)

O bien vía SQL:

```sql
insert into storage.buckets (id, name, public)
values ('publico', 'publico', true)
on conflict (id) do nothing;
```

Este bucket se usa para:

- Fotos de álbumes (`albumes/{albumId}/...`)
- Imagen del hero (`hero/...`)

## 3. Variables de entorno

Asegúrate de tener en `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # requerido para subida de archivos
```

## 4. Flujo para el administrador

1. Login como admin → menú **🌐 Sitio público**.
2. Ir a **Configuración del sitio** → llenar nombre, CCT, dirección, teléfono, email, horario, mapa.
3. Ir a **Redes sociales** → pegar URLs de Facebook/Instagram/TikTok.
4. Ir a **Página de inicio** → editar hero (título, subtítulo, imagen de fondo).
5. **Álbumes** → crear álbum → subir fotos (multiselección).
6. **Páginas personalizadas** → crear páginas libres (aparecen automáticas en el nav).
7. **Noticias** y **Convocatorias** ya existían — seguir usándolas normalmente.

## 5. Visor de auditoría

Menú **🔍 Auditoría** muestra todos los INSERT/UPDATE/DELETE en tablas críticas, con quién lo hizo y el diff JSON.

## 6. Verificar que funciona

- `/publico` → hero debe mostrar el texto editado
- `/publico` → sección "Galería" con los álbumes publicados
- `/publico/albumes` → lista de álbumes
- `/publico/albumes/[slug]` → detalle con todas las fotos
- `/publico/contacto` → muestra datos del `sitio_config` + mapa
- `/publico/p/[slug]` → cualquier página personalizada
- Botones flotantes de redes visibles abajo-derecha en todo `/publico/*`

## 7. Lo que sigue (fuera de esta entrega)

- Capturar calificaciones por parcial con bloqueo por fechas
- Boletas PDF con `@react-pdf/renderer`
- Control de asistencias
- Import/export Excel masivo de alumnos
- Cmd+K (búsqueda global)
- Tests E2E con Playwright
