# Guía de instalación — Sistema EPO 221

Esta guía sirve tanto para **desarrollo local** como para el primer despliegue en producción.

---

## 1. Requisitos previos

- Node.js 20+ ([nodejs.org](https://nodejs.org))
- Cuenta de [Supabase](https://supabase.com) (plan gratuito)
- Cuenta de [Vercel](https://vercel.com) (plan gratuito)
- Cuenta de [GitHub](https://github.com)

---

## 2. Crear el proyecto de Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Crea una **organización nueva** (recomendado: `EPO221-Sistemas`).
3. Crea el proyecto: nombre `epo221-produccion`, región más cercana (ej. `us-east-1`).
4. Guarda la contraseña de la base de datos.

Una vez creado, ve a **Settings → API** y copia:
- `Project URL` → será `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → será `SUPABASE_SERVICE_ROLE_KEY` (¡NUNCA exponer!)

---

## 3. Ejecutar los scripts SQL (en orden)

En Supabase → **SQL Editor** → New query. Ejecuta uno por uno:

1. `supabase/schema.sql` — crea todas las tablas, triggers y RLS
2. `supabase/views.sql` — crea las vistas de consulta
3. `supabase/storage.sql` — crea los buckets y sus políticas
4. `supabase/seed.sql` — carga el plan BGE y conceptos de pago base

---

## 4. Crear el primer administrador

1. Supabase → **Authentication → Users → Add user**
2. Email: el correo institucional (o tu correo temporalmente)
3. Password: una contraseña fuerte
4. Marca "Auto confirm user"
5. Copia el UUID del usuario creado
6. Ve a **SQL Editor** y ejecuta:

   ```sql
   insert into perfiles (id, rol, nombre, email)
   values ('PEGA_EL_UUID_AQUI', 'admin', 'Administrador', 'correo@epo221.edu.mx');
   ```

> Nota: el admin usa **email+password** (no CURP). Solo los alumnos entran con CURP.
> Para que el admin entre por `/login`, puedes modificar `actions.ts` más adelante
> o usar directamente la API de Supabase (detallado en la versión 1.0).

---

## 5. Configurar variables de entorno

```bash
cd sistema
cp .env.example .env.local
```

Edita `.env.local` con las 3 claves de Supabase (paso 2).

---

## 6. Instalar dependencias y correr en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000

- `/` → redirige a `/publico` (sitio público)
- `/login` → acceso alumnos y profesores
- `/admin` → panel administrativo (requiere ser admin)

---

## 7. Carga de datos

1. Entra como admin → `/admin/alumnos` → sube el `LIBRO INSCRIPCION.xlsx`.
   - Se crean alumnos y sus cuentas de acceso automáticamente.
   - Contraseña inicial = matrícula.
2. Crea ciclo escolar activo en `/admin/ciclos` (o ya viene del seed).
3. Crea grupos en `/admin/grupos` + asignaciones (materia+grupo+profesor).
4. Carga calificaciones: `/admin/calificaciones` → sube el CSV oficial.

---

## 8. Despliegue en Vercel

1. Crea repo nuevo en GitHub: `epo221-sistema`.
2. `git init && git add . && git commit -m "inicial" && git push`.
3. En Vercel → **Add New → Project** → importa el repo.
4. **Framework:** Next.js (detectado automáticamente).
5. **Root Directory:** `sistema` (si el repo contiene más cosas en la raíz).
6. Pega las 3 variables de entorno de Supabase.
7. Deploy.

---

## 9. Dominio (opcional)

- Si la escuela ya tiene dominio → Vercel → Settings → Domains → agregar.
- Si no, temporalmente se usa la URL `*.vercel.app` que asigna Vercel gratis.

---

## Solución de problemas comunes

| Error | Causa | Solución |
|---|---|---|
| `Invalid login credentials` | CURP sin cuenta creada | Importar alumno desde `/admin/alumnos` |
| Vistas no devuelven datos | RLS bloquea | Verificar que el usuario tenga perfil |
| Pagos no suben comprobante | Bucket no creado | Ejecutar `storage.sql` |
| Admin no puede entrar | Perfil no creado | Ejecutar el INSERT del paso 4 |
