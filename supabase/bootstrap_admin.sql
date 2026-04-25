-- ============================================================
-- Crear el primer usuario administrador
-- EJECUTAR UNA SOLA VEZ después de schema.sql + views.sql + storage.sql
-- ============================================================
-- Pasos:
-- 1. Ir a Supabase Dashboard → Authentication → Users → "Add user"
-- 2. Crear un usuario con email (puede ser tu correo institucional) y contraseña
-- 3. Copiar el UUID generado
-- 4. Reemplazar 'UUID_DEL_USUARIO' abajo y ejecutar
-- ============================================================

insert into perfiles (id, rol, nombre, email)
values (
  'UUID_DEL_USUARIO',          -- ← reemplazar
  'admin',
  'Administrador del Sistema',
  'admin@epo221.edu.mx'        -- ← reemplazar por correo real
)
on conflict (id) do update set rol = 'admin';
