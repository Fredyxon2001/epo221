-- ============================================================
--  EPO 221 · Migración: CMS público + auditoría + soft-delete
--  Fecha: 2026-04-16
--  Ejecutar en Supabase SQL Editor (orden de abajo hacia arriba).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Configuración global del sitio (fila única, id=1)
-- ------------------------------------------------------------
create table if not exists public.sitio_config (
  id              smallint primary key default 1,
  nombre_escuela  text    default 'EPO 221 "Nicolás Bravo"',
  cct             text    default '15EBH0409B',
  direccion       text,
  telefono        text,
  email           text,
  horario         text,
  mapa_embed_url  text,          -- iframe src de Google Maps
  facebook_url    text,
  instagram_url   text,
  tiktok_url      text,
  youtube_url     text,
  whatsapp_url    text,
  hero_titulo     text,
  hero_subtitulo  text,
  hero_imagen_url text,
  updated_at      timestamptz default now(),
  constraint sitio_config_singleton check (id = 1)
);

insert into public.sitio_config (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2. Páginas públicas personalizables (historia, misión, etc.)
-- ------------------------------------------------------------
create table if not exists public.paginas_publicas (
  id         bigserial primary key,
  slug       text unique not null,
  titulo     text not null,
  contenido  text,                 -- markdown o HTML
  publicada  boolean default true,
  orden      int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- ------------------------------------------------------------
-- 3. Álbumes de fotos (galería)
-- ------------------------------------------------------------
create table if not exists public.albumes (
  id         bigserial primary key,
  slug       text unique not null,
  titulo     text not null,
  descripcion text,
  portada_url text,
  fecha_evento date,
  publicado  boolean default true,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.album_fotos (
  id        bigserial primary key,
  album_id  bigint not null references public.albumes(id) on delete cascade,
  foto_url  text not null,
  caption   text,
  orden     int default 0,
  created_at timestamptz default now()
);

create index if not exists album_fotos_album_idx on public.album_fotos (album_id, orden);

-- Storage bucket para las fotos (ejecutar una vez en el dashboard o con la API)
-- En Supabase Dashboard > Storage > New bucket: 'publico' (público)
-- O bien:
--   insert into storage.buckets (id, name, public) values ('publico', 'publico', true)
--   on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 4. Soft-delete en tablas críticas
-- ------------------------------------------------------------
alter table public.materias      add column if not exists deleted_at timestamptz;
alter table public.noticias      add column if not exists deleted_at timestamptz;
alter table public.convocatorias add column if not exists deleted_at timestamptz;
-- Añade más tablas aquí según lo necesites:
-- alter table public.alumnos add column if not exists deleted_at timestamptz;

-- Índices parciales (sólo filas vivas)
create index if not exists materias_vivas_idx      on public.materias      (id) where deleted_at is null;
create index if not exists noticias_vivas_idx      on public.noticias      (id) where deleted_at is null;
create index if not exists convocatorias_vivas_idx on public.convocatorias (id) where deleted_at is null;

-- ------------------------------------------------------------
-- 5. Auditoría (audit log)
-- ------------------------------------------------------------
create table if not exists public.audit_log (
  id         bigserial primary key,
  tabla      text not null,
  operacion  text not null check (operacion in ('INSERT','UPDATE','DELETE')),
  registro_id text,
  diff       jsonb,              -- { before: {...}, after: {...} }
  actor_id   uuid references auth.users(id),
  actor_email text,
  created_at timestamptz default now()
);

create index if not exists audit_tabla_idx on public.audit_log (tabla, created_at desc);
create index if not exists audit_actor_idx on public.audit_log (actor_id,  created_at desc);

create or replace function public.fn_audit_trigger() returns trigger
language plpgsql security definer as $$
declare
  v_user uuid := auth.uid();
  v_email text;
begin
  select email into v_email from auth.users where id = v_user;

  insert into public.audit_log (tabla, operacion, registro_id, diff, actor_id, actor_email)
  values (
    tg_table_name,
    tg_op,
    coalesce((new.id)::text, (old.id)::text),
    case tg_op
      when 'INSERT' then jsonb_build_object('after',  to_jsonb(new))
      when 'DELETE' then jsonb_build_object('before', to_jsonb(old))
      else               jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
    end,
    v_user,
    v_email
  );

  return coalesce(new, old);
end $$;

-- Aplica el trigger a las tablas sensibles (idempotente)
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'materias','noticias','convocatorias',
    'calificaciones','pagos','alumnos','asignaciones'
  ]) loop
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name=t) then
      execute format('drop trigger if exists trg_audit_%1$s on public.%1$I', t);
      execute format('create trigger trg_audit_%1$s
                      after insert or update or delete on public.%1$I
                      for each row execute function public.fn_audit_trigger()', t);
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 6. RLS para las nuevas tablas
-- ------------------------------------------------------------
alter table public.sitio_config     enable row level security;
alter table public.paginas_publicas enable row level security;
alter table public.albumes          enable row level security;
alter table public.album_fotos      enable row level security;
alter table public.audit_log        enable row level security;

-- Helper para verificar rol admin/staff
create or replace function public.es_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol in ('admin','staff')
  );
$$;

-- sitio_config: lectura pública, escritura admin
drop policy if exists sc_select_pub on public.sitio_config;
create policy sc_select_pub on public.sitio_config for select using (true);
drop policy if exists sc_write_adm on public.sitio_config;
create policy sc_write_adm on public.sitio_config for all
  using (public.es_admin()) with check (public.es_admin());

-- paginas_publicas: lectura pública de publicadas, escritura admin
drop policy if exists pp_select_pub on public.paginas_publicas;
create policy pp_select_pub on public.paginas_publicas for select
  using (publicada = true and deleted_at is null);
drop policy if exists pp_all_adm on public.paginas_publicas;
create policy pp_all_adm on public.paginas_publicas for all
  using (public.es_admin()) with check (public.es_admin());

-- albumes / album_fotos: lectura pública, escritura admin
drop policy if exists al_select_pub on public.albumes;
create policy al_select_pub on public.albumes for select
  using (publicado = true and deleted_at is null);
drop policy if exists al_all_adm on public.albumes;
create policy al_all_adm on public.albumes for all
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists af_select_pub on public.album_fotos;
create policy af_select_pub on public.album_fotos for select using (true);
drop policy if exists af_all_adm on public.album_fotos;
create policy af_all_adm on public.album_fotos for all
  using (public.es_admin()) with check (public.es_admin());

-- audit_log: sólo admin puede leer
drop policy if exists au_select_adm on public.audit_log;
create policy au_select_adm on public.audit_log for select
  using (public.es_admin());

-- ============================================================
--  FIN migración
-- ============================================================
