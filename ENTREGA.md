# Guía de entrega del sistema a la escuela

Este documento describe cómo **transferir la propiedad completa** del sistema a la administración de la EPO 221, sin dejar ninguna dependencia del desarrollador original.

---

## Principio clave

**Ninguna credencial, URL o correo personal está escrita en el código**. Todo vive en variables de entorno. Eso significa que mudar el sistema a otras cuentas = cambiar variables, nada de código.

---

## Cuentas que la escuela debe crear

Antes de iniciar la transferencia, la escuela debe tener un **correo institucional activo** (ej. `sistemas@epo221.edu.mx`). Con ese correo crean:

| Servicio | Plan | Uso |
|---|---|---|
| [GitHub](https://github.com) | Free | Código fuente |
| [Supabase](https://supabase.com) | Free (500 MB) | Base de datos, auth, archivos |
| [Vercel](https://vercel.com) | Free Hobby | Hosting del sitio |

---

## Procedimiento de transferencia

### Paso 1 — Transferir el repositorio de GitHub

Desde la cuenta del desarrollador:

1. `github.com/{usuario}/epo221-sistema` → **Settings** → **Transfer ownership**
2. Escribe el nombre de usuario u organización de la escuela
3. La escuela recibe un email y acepta la transferencia
4. El desarrollador puede permanecer como colaborador temporal si se requiere soporte

### Paso 2 — Crear el nuevo proyecto Supabase de la escuela

Opción A (recomendada): **Transfer project**

1. Escuela crea organización en Supabase
2. Dashboard del proyecto actual → **Settings → General → Transfer project**
3. Se transfieren base de datos, auth, storage, claves. Todo.

Opción B (respaldo manual):

1. Escuela crea su proyecto nuevo
2. En el proyecto viejo: Supabase → **Database → Backups → Download**
3. En el proyecto nuevo: SQL Editor → ejecutar el backup
4. Re-subir archivos del bucket (hay script en `scripts/migrate-storage.ts`, por implementar)

### Paso 3 — Re-desplegar en Vercel de la escuela

Más simple que transferir:

1. La escuela entra a su Vercel (con el correo institucional)
2. **Add New → Project** → importa el repo de GitHub (ya transferido)
3. Captura las **nuevas** variables de entorno del Supabase de la escuela
4. Deploy

El proyecto Vercel del desarrollador puede eliminarse después.

### Paso 4 — Rotar claves (por seguridad)

Aunque el desarrollador ya no tenga acceso, por higiene:

1. Supabase: **Settings → API → Reset anon key + service_role key**
2. Actualizar las variables en Vercel
3. Re-deploy

### Paso 5 — Eliminar al desarrollador como colaborador

- GitHub: **Settings → Collaborators** → remove
- Supabase: **Settings → Team** → remove
- Vercel: **Settings → Members** → remove

---

## Checklist final de entrega

- [ ] Repo transferido a GitHub de la escuela
- [ ] Proyecto Supabase a nombre de la escuela (con correo institucional)
- [ ] Proyecto Vercel a nombre de la escuela
- [ ] Dominio apuntando al deploy de la escuela (si aplica)
- [ ] Claves rotadas post-transferencia
- [ ] Al menos 2 administradores con acceso (no un solo punto de falla)
- [ ] Correo institucional configurado como SMTP (para reset de contraseñas)
- [ ] Backup automático activado en Supabase (Settings → Backups)
- [ ] Documento `SETUP.md` revisado por el nuevo equipo técnico
- [ ] Capacitación entregada al personal de Control Escolar

---

## Costos recurrentes

| Servicio | Costo | Cuándo deja de ser gratis |
|---|---|---|
| GitHub | $0 | Siempre gratis para educativos |
| Supabase | $0 | Al superar 500 MB de DB, 1 GB de storage, 50k MAU |
| Vercel | $0 | Al superar 100 GB de banda/mes |
| Dominio | Variable | Solo si compran dominio propio |

Para una escuela de ~800 alumnos el uso queda cómodamente dentro del plan gratuito
los primeros 2-3 años. Después puede requerir el plan Pro de Supabase (~$25 USD/mes).

---

## Soporte post-entrega

Se sugiere que la escuela designe a un **responsable técnico** (profesor de TIC o
personal de sistemas del subsistema) que:

1. Sea miembro de las 3 cuentas (GitHub, Supabase, Vercel)
2. Sepa hacer el `npm install && npm run dev` para pruebas locales
3. Aplique updates del repo de vez en cuando (`git pull`, Vercel redeployea solo)

El sistema no requiere mantenimiento continuo. Solo:
- Revisar pagos pendientes (diario/semanal)
- Cargar calificaciones al final de cada parcial
- Publicar noticias y convocatorias cuando aplique
