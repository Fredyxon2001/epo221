-- ============================================================
-- EPO 221 — Esquema de base de datos
-- Bachillerato General Estatal (BGE) · CCT 15EBH0409B
-- ============================================================
-- Convenciones:
--   * snake_case en tablas y columnas
--   * Todas las PK son UUID salvo catálogos estables (código de materia, CURP natural)
--   * Timestamps siempre con timezone (timestamptz)
--   * Todo con RLS activado; políticas al final del archivo
--   * Compatible con el CSV oficial de calificaciones (mapeo al final)
-- ============================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto";    -- gen_random_uuid()
create extension if not exists "citext";      -- texto case-insensitive (emails, CURP)

-- ============================================================
-- 1. CATÁLOGOS BASE
-- ============================================================

-- Ciclos escolares (ej. 2025-2026 periodo 2025B)
create table ciclos_escolares (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null,          -- "2025-2026"
  periodo       text not null,          -- "2025A" / "2025B"
  fecha_inicio  date,
  fecha_fin     date,
  activo        boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (codigo, periodo)
);

-- Campos disciplinares del BGE (matemáticas, ciencias, etc.)
create table campos_disciplinares (
  id      smallserial primary key,
  nombre  text not null unique
);

-- Materias (UAC — Unidades de Aprendizaje Curricular en BGE)
create table materias (
  id                  uuid primary key default gen_random_uuid(),
  clave               text unique,                        -- clave oficial SEIEM si aplica
  nombre              text not null,
  semestre            smallint not null check (semestre between 1 and 6),
  campo_disciplinar_id smallint references campos_disciplinares(id),
  tipo                text not null check (tipo in ('obligatoria','paraescolar','capacitacion','optativa')),
  horas_semestrales   smallint,
  activo              boolean not null default true,
  created_at          timestamptz not null default now()
);
create index on materias (semestre);

-- Grupos (1°6, 2°3, etc. por ciclo)
create table grupos (
  id          uuid primary key default gen_random_uuid(),
  ciclo_id    uuid not null references ciclos_escolares(id),
  grado       smallint not null check (grado between 1 and 3),
  semestre    smallint not null check (semestre between 1 and 6),
  grupo       smallint not null,                    -- número de grupo
  turno       text check (turno in ('matutino','vespertino')),
  carrera     text default 'BACHILLERATO GENERAL',
  unique (ciclo_id, semestre, grupo, turno)
);

-- ============================================================
-- 2. PERSONAS (alumnos, profesores, admin)
-- ============================================================
-- Todas las personas con login tienen fila en auth.users (Supabase Auth)
-- y fila en `perfiles` con su rol. Alumnos y profesores extienden perfiles.

create type rol_usuario as enum ('alumno','profesor','admin','staff');

create table perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  rol         rol_usuario not null,
  nombre      text not null,
  email       citext unique,
  telefono    text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Alumnos — CURP como identificador natural (así viene en el CSV)
create table alumnos (
  id               uuid primary key default gen_random_uuid(),
  perfil_id        uuid unique references perfiles(id) on delete set null,  -- null si aún no tiene login
  curp             citext unique not null check (char_length(curp) = 18),
  matricula        text unique,
  nombre           text not null,
  apellido_paterno text not null,
  apellido_materno text,
  fecha_nacimiento date,
  sexo             char(1) check (sexo in ('H','M')),
  email            citext,
  telefono         text,
  -- Datos de contacto / domicilio
  direccion        text,
  codigo_postal    text,
  municipio        text,
  estado           text default 'México',
  -- Datos académicos
  generacion       text,                      -- ej. "2025-2028"
  escuela_procedencia text,
  promedio_secundaria numeric(4,2),
  -- Tutor
  tutor_nombre     text,
  tutor_telefono   text,
  tutor_parentesco text,
  tutor_email      citext,
  -- Otros
  foto_url         text,                      -- Supabase Storage
  observaciones    text,
  estatus          text not null default 'activo'
                   check (estatus in ('activo','baja_temporal','baja_definitiva','egresado')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on alumnos (apellido_paterno, apellido_materno, nombre);

-- Profesores
create table profesores (
  id               uuid primary key default gen_random_uuid(),
  perfil_id        uuid unique references perfiles(id) on delete set null,
  rfc              text unique,
  nombre           text not null,
  apellido_paterno text,
  apellido_materno text,
  email            citext,
  telefono         text,
  activo           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- 3. INSCRIPCIONES Y ASIGNACIONES
-- ============================================================

-- Alumno inscrito en un grupo en un ciclo
create table inscripciones (
  id         uuid primary key default gen_random_uuid(),
  alumno_id  uuid not null references alumnos(id) on delete cascade,
  grupo_id   uuid not null references grupos(id),
  ciclo_id   uuid not null references ciclos_escolares(id),
  fecha_inscripcion date not null default current_date,
  estatus    text not null default 'activa' check (estatus in ('activa','cancelada','baja')),
  unique (alumno_id, ciclo_id)
);

-- Asignación: (materia + grupo + profesor + ciclo) — esto es `idAsignacion` del CSV
create table asignaciones (
  id          uuid primary key default gen_random_uuid(),
  materia_id  uuid not null references materias(id),
  grupo_id    uuid not null references grupos(id),
  profesor_id uuid references profesores(id),
  ciclo_id    uuid not null references ciclos_escolares(id),
  created_at  timestamptz not null default now(),
  unique (materia_id, grupo_id, ciclo_id)
);

-- ============================================================
-- 4. CALIFICACIONES
-- ============================================================
-- Estructura oficial: 3 parciales (P1/P2/P3) + hasta 4 extraordinarios (E1–E4)
-- con folio. Faltas por parcial. Escala 5–10 (o 0 si no evaluado).

create table calificaciones (
  id              uuid primary key default gen_random_uuid(),
  alumno_id       uuid not null references alumnos(id) on delete cascade,
  asignacion_id   uuid not null references asignaciones(id) on delete cascade,

  -- Parciales
  p1              numeric(4,2) check (p1 is null or p1 between 0 and 10),
  p2              numeric(4,2) check (p2 is null or p2 between 0 and 10),
  p3              numeric(4,2) check (p3 is null or p3 between 0 and 10),
  faltas_p1       smallint default 0,
  faltas_p2       smallint default 0,
  faltas_p3       smallint default 0,

  -- Extraordinarios (hasta 4)
  e1              numeric(4,2), folio_e1 text,
  e2              numeric(4,2), folio_e2 text,
  e3              numeric(4,2), folio_e3 text,
  e4              numeric(4,2), folio_e4 text,

  -- Promedio final calculado (generated column)
  promedio_final  numeric(4,2) generated always as (
    greatest(
      coalesce((coalesce(p1,0) + coalesce(p2,0) + coalesce(p3,0)) / nullif(
        (case when p1 is not null then 1 else 0 end
       + case when p2 is not null then 1 else 0 end
       + case when p3 is not null then 1 else 0 end), 0), 0),
      coalesce(e1,0), coalesce(e2,0), coalesce(e3,0), coalesce(e4,0)
    )
  ) stored,

  capturado_por   uuid references perfiles(id),
  updated_at      timestamptz not null default now(),
  unique (alumno_id, asignacion_id)
);
create index on calificaciones (alumno_id);
create index on calificaciones (asignacion_id);

-- ============================================================
-- 5. PAGOS (solo registro — sin pasarela)
-- ============================================================

-- Catálogo de conceptos (inscripción, cuota, extraordinario, constancia, asesoría...)
create table conceptos_pago (
  id          uuid primary key default gen_random_uuid(),
  clave       text unique not null,                 -- "INSCRIPCION_2025B", "CUOTA_OCT_2025"
  nombre      text not null,
  descripcion text,
  monto       numeric(10,2) not null check (monto >= 0),
  tipo        text not null check (tipo in ('inscripcion','cuota','extraordinario','constancia','asesoria','credencial','material','evento','otro')),
  ciclo_id    uuid references ciclos_escolares(id),
  obligatorio boolean not null default false,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Cargo: concepto asignado a un alumno específico
create table cargos (
  id           uuid primary key default gen_random_uuid(),
  alumno_id    uuid not null references alumnos(id) on delete cascade,
  concepto_id  uuid not null references conceptos_pago(id),
  monto        numeric(10,2) not null,              -- se copia del concepto (puede tener descuento)
  fecha_limite date,
  estatus      text not null default 'pendiente'
               check (estatus in ('pendiente','en_revision','pagado','cancelado','vencido')),
  notas        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on cargos (alumno_id, estatus);

-- Pago: comprobante subido por alumno y validación del admin
create table pagos (
  id              uuid primary key default gen_random_uuid(),
  cargo_id        uuid not null references cargos(id) on delete cascade,
  alumno_id       uuid not null references alumnos(id),   -- denormalizado para RLS rápida
  monto_pagado    numeric(10,2) not null,
  metodo          text not null check (metodo in ('transferencia','ventanilla','efectivo','otro')),
  referencia      text,                                   -- folio SPEI / número de ficha
  fecha_pago      date not null,
  comprobante_url text,                                   -- Supabase Storage path
  subido_por      uuid references perfiles(id),
  subido_en       timestamptz not null default now(),
  validado_por    uuid references perfiles(id),
  validado_en     timestamptz,
  folio_recibo    text unique,                            -- se genera al validar
  rechazado_motivo text,
  created_at      timestamptz not null default now()
);
create index on pagos (alumno_id);
create index on pagos (cargo_id);

-- ============================================================
-- 6. CONTENIDO PÚBLICO (landing)
-- ============================================================

create table noticias (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  slug       text unique not null,
  resumen    text,
  contenido  text,                    -- markdown
  imagen_url text,
  publicada  boolean not null default false,
  fecha_pub  timestamptz,
  autor_id   uuid references perfiles(id),
  created_at timestamptz not null default now()
);

create table convocatorias (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  descripcion text,
  archivo_url text,
  vigente_desde date,
  vigente_hasta date,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 6.5 EXPEDIENTE DIGITAL DEL ALUMNO
-- ============================================================
-- Documentos escaneados (acta, CURP, certificado de secundaria, etc.)

create table documentos_alumno (
  id          uuid primary key default gen_random_uuid(),
  alumno_id   uuid not null references alumnos(id) on delete cascade,
  tipo        text not null check (tipo in (
                'acta_nacimiento','curp','certificado_secundaria',
                'comprobante_domicilio','fotografia','ine_tutor',
                'carta_buena_conducta','cartilla_vacunacion','otro')),
  nombre      text,
  archivo_url text not null,                  -- Supabase Storage
  subido_por  uuid references perfiles(id),
  subido_en   timestamptz not null default now(),
  validado    boolean not null default false,
  notas       text
);
create index on documentos_alumno (alumno_id);

alter table documentos_alumno enable row level security;
create policy docs_select on documentos_alumno for select
  using (alumno_id = mi_alumno_id() or es_admin());
create policy docs_write_admin on documentos_alumno for all
  using (es_admin()) with check (es_admin());

-- ============================================================
-- 7. AUDITORÍA (quién cambió qué)
-- ============================================================

create table auditoria (
  id         bigserial primary key,
  usuario_id uuid references perfiles(id),
  tabla      text not null,
  registro_id text,
  accion     text not null check (accion in ('insert','update','delete')),
  cambios    jsonb,
  ip         inet,
  created_at timestamptz not null default now()
);
create index on auditoria (tabla, registro_id);
create index on auditoria (usuario_id, created_at desc);

-- ============================================================
-- 8. TRIGGERS — updated_at automático
-- ============================================================

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger t_perfiles_updated      before update on perfiles       for each row execute function touch_updated_at();
create trigger t_alumnos_updated       before update on alumnos        for each row execute function touch_updated_at();
create trigger t_calificaciones_updated before update on calificaciones for each row execute function touch_updated_at();
create trigger t_cargos_updated        before update on cargos         for each row execute function touch_updated_at();

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

alter table perfiles         enable row level security;
alter table alumnos          enable row level security;
alter table profesores       enable row level security;
alter table inscripciones    enable row level security;
alter table asignaciones     enable row level security;
alter table calificaciones   enable row level security;
alter table conceptos_pago   enable row level security;
alter table cargos           enable row level security;
alter table pagos            enable row level security;
alter table noticias         enable row level security;
alter table convocatorias    enable row level security;
alter table auditoria        enable row level security;

-- Helper: ¿es admin el usuario actual?
create or replace function es_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from perfiles where id = auth.uid() and rol in ('admin','staff')
  );
$$;

-- Helper: ¿es profesor?
create or replace function es_profesor() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from perfiles where id = auth.uid() and rol = 'profesor'
  );
$$;

-- Helper: id del alumno vinculado al usuario actual
create or replace function mi_alumno_id() returns uuid
language sql stable security definer as $$
  select id from alumnos where perfil_id = auth.uid();
$$;

-- ── Políticas ────────────────────────────────────────────────

-- PERFILES: cada quien ve el suyo; admin ve todos
create policy perfiles_select_self on perfiles for select
  using (id = auth.uid() or es_admin());
create policy perfiles_update_admin on perfiles for all
  using (es_admin()) with check (es_admin());

-- ALUMNOS: el alumno ve el suyo; profesor ve alumnos de sus grupos; admin todo
create policy alumnos_select_self on alumnos for select
  using (
    perfil_id = auth.uid()
    or es_admin()
    or (es_profesor() and exists (
      select 1 from inscripciones i
      join asignaciones a on a.grupo_id = i.grupo_id and a.ciclo_id = i.ciclo_id
      join profesores p on p.id = a.profesor_id
      where i.alumno_id = alumnos.id and p.perfil_id = auth.uid()
    ))
  );
create policy alumnos_write_admin on alumnos for all
  using (es_admin()) with check (es_admin());

-- CALIFICACIONES: alumno ve las suyas; profesor ve/edita las de sus asignaciones; admin todo
create policy calif_select on calificaciones for select
  using (
    alumno_id = mi_alumno_id()
    or es_admin()
    or exists (
      select 1 from asignaciones a
      join profesores p on p.id = a.profesor_id
      where a.id = calificaciones.asignacion_id and p.perfil_id = auth.uid()
    )
  );
create policy calif_write_profesor on calificaciones for all
  using (
    es_admin()
    or exists (
      select 1 from asignaciones a
      join profesores p on p.id = a.profesor_id
      where a.id = calificaciones.asignacion_id and p.perfil_id = auth.uid()
    )
  )
  with check (
    es_admin()
    or exists (
      select 1 from asignaciones a
      join profesores p on p.id = a.profesor_id
      where a.id = calificaciones.asignacion_id and p.perfil_id = auth.uid()
    )
  );

-- CARGOS Y PAGOS: alumno ve los suyos; puede subir comprobante; admin valida
create policy cargos_select on cargos for select
  using (alumno_id = mi_alumno_id() or es_admin());
create policy cargos_write_admin on cargos for all
  using (es_admin()) with check (es_admin());

create policy pagos_select on pagos for select
  using (alumno_id = mi_alumno_id() or es_admin());
create policy pagos_insert_alumno on pagos for insert
  with check (alumno_id = mi_alumno_id() or es_admin());
create policy pagos_update_admin on pagos for update
  using (es_admin()) with check (es_admin());

-- PÚBLICO: noticias y convocatorias visibles si publicadas/vigentes
create policy noticias_public_read on noticias for select
  using (publicada = true or es_admin());
create policy noticias_write_admin on noticias for all
  using (es_admin()) with check (es_admin());

create policy convoc_public_read on convocatorias for select using (true);
create policy convoc_write_admin on convocatorias for all
  using (es_admin()) with check (es_admin());

-- Asignaciones / inscripciones / profesores: lectura autenticada, escritura admin
create policy insc_read on inscripciones for select using (auth.uid() is not null);
create policy insc_write on inscripciones for all using (es_admin()) with check (es_admin());

create policy asig_read on asignaciones for select using (auth.uid() is not null);
create policy asig_write on asignaciones for all using (es_admin()) with check (es_admin());

create policy prof_read on profesores for select using (auth.uid() is not null);
create policy prof_write on profesores for all using (es_admin()) with check (es_admin());

create policy conceptos_read on conceptos_pago for select using (auth.uid() is not null);
create policy conceptos_write on conceptos_pago for all using (es_admin()) with check (es_admin());

-- AUDITORÍA: solo admin lee, sistema escribe
create policy audit_read_admin on auditoria for select using (es_admin());

-- ============================================================
-- MAPEO AL CSV OFICIAL (referencia para importación/exportación)
-- ============================================================
-- Columna CSV              →  Tabla.columna
-- curp                     →  alumnos.curp
-- nombre                   →  alumnos.nombre
-- apellidoPaterno          →  alumnos.apellido_paterno
-- apellidoMaterno          →  alumnos.apellido_materno
-- faltasP1/P2/P3           →  calificaciones.faltas_p1/p2/p3
-- calificacionP1/P2/P3     →  calificaciones.p1/p2/p3
-- calificacionE1..E4       →  calificaciones.e1..e4
-- folioE1..E4              →  calificaciones.folio_e1..e4
-- horasSemestrales         →  materias.horas_semestrales
-- nombreUAC                →  materias.nombre
-- idAsignacion             →  asignaciones.id
-- cct                      →  (constante — variable de entorno)
-- cicloEscolar             →  ciclos_escolares.codigo
-- periodo                  →  ciclos_escolares.periodo
-- carrera                  →  grupos.carrera
-- idEstudiante             →  alumnos.id
-- grado / semestre / grupo →  grupos.grado / semestre / grupo
-- ============================================================
