-- Integrity, atomic cycle transitions, published guidance and idempotent risk alerts.
alter table public.ciclos_escolares add column cerrado_en timestamptz;
alter table public.ciclos_escolares add column cerrado_por uuid references public.perfiles(id);
alter table public.ciclos_escolares add constraint ciclo_closed_inactive check(cerrado_en is null or not activo);
create unique index ciclo_unico_activo on public.ciclos_escolares(activo) where activo;

create table public.ciclo_historial (
  id uuid primary key default gen_random_uuid(), ciclo_id uuid not null references public.ciclos_escolares(id) on delete cascade,
  accion text not null check(accion in ('activar','cerrar','reabrir')), motivo text not null,
  diagnostico jsonb not null, actor_id uuid not null references public.perfiles(id), created_at timestamptz not null default now()
);
create index ciclo_historial_cycle_date on public.ciclo_historial(ciclo_id,created_at desc);
alter table public.ciclo_historial enable row level security;
revoke all on public.ciclo_historial from anon;
create policy cycle_history_read on public.ciclo_historial for select to authenticated using(public.es_admin() and public.security_session_valid());
grant select on public.ciclo_historial to authenticated;
revoke insert,update,delete on public.ciclo_historial from authenticated,anon;

create function public.security_cycle_diagnostic(p_cycle uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.ciclos_escolares; missing_grades integer; no_subjects integer; inconsistent integer; reviews integer; payments integer; enrolled integer;
begin
  if not public.security_session_valid() or not public.es_admin() then raise exception 'Acceso no autorizado' using errcode='42501'; end if;
  select * into c from public.ciclos_escolares where id=p_cycle;
  if not found then raise exception 'Ciclo inexistente'; end if;
  select count(*) into enrolled from public.inscripciones where ciclo_id=p_cycle and estatus='activa';
  select count(*) into inconsistent from public.inscripciones i join public.grupos g on g.id=i.grupo_id where i.ciclo_id=p_cycle and g.ciclo_id<>p_cycle;
  select count(*) into no_subjects from public.inscripciones i where i.ciclo_id=p_cycle and i.estatus='activa' and not exists(select 1 from public.asignaciones a where a.ciclo_id=p_cycle and a.grupo_id=i.grupo_id);
  select count(*) into missing_grades from public.inscripciones i join public.asignaciones a on a.grupo_id=i.grupo_id and a.ciclo_id=i.ciclo_id
    left join public.calificaciones k on k.alumno_id=i.alumno_id and k.asignacion_id=a.id
    where i.ciclo_id=p_cycle and i.estatus='activa' and (k.id is null or k.p1 is null or k.p2 is null or k.p3 is null or k.promedio_final is null);
  select count(*) into reviews from public.solicitudes_revision r join public.asignaciones a on a.id=r.asignacion_id where a.ciclo_id=p_cycle and r.estado in ('abierta','respondida');
  reviews:=reviews+(select count(*) from public.solicitudes_parcial where ciclo_id=p_cycle and estado='pendiente');
  select count(*) into payments from public.pagos p where p.validado_en is null and p.rechazado_motivo is null and exists(select 1 from public.inscripciones i where i.ciclo_id=p_cycle and i.alumno_id=p.alumno_id);
  return jsonb_build_object('version',1,'inscripciones',enrolled,'calificaciones_incompletas',missing_grades,'sin_materias',no_subjects,'inscripciones_inconsistentes',inconsistent,'revisiones_pendientes',reviews,'pagos_por_revisar',payments,
    'fechas_validas',c.fecha_inicio is not null and c.fecha_fin is not null and c.fecha_inicio<=c.fecha_fin and c.fecha_fin<=current_date,
    'puede_cerrar',c.cerrado_en is null and enrolled>0 and missing_grades=0 and no_subjects=0 and inconsistent=0 and reviews=0 and c.fecha_inicio is not null and c.fecha_fin is not null and c.fecha_inicio<=c.fecha_fin and c.fecha_fin<=current_date);
end $$;
revoke all on function public.security_cycle_diagnostic(uuid) from public,anon;
grant execute on function public.security_cycle_diagnostic(uuid) to authenticated;

create function public.security_cycle_transition(p_cycle uuid,p_action text,p_reason text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.ciclos_escolares; d jsonb;
begin
  if not public.security_session_valid() or not public.es_admin() then raise exception 'Acceso no autorizado' using errcode='42501'; end if;
  if p_action not in ('activar','cerrar','reabrir') or length(trim(coalesce(p_reason,''))) not between 10 and 1000 then raise exception 'Acción o motivo inválido'; end if;
  -- Serialize transitions and lock academic writers out until the transaction commits.
  perform pg_advisory_xact_lock(2212026);
  select * into c from public.ciclos_escolares where id=p_cycle for update;
  if not found then raise exception 'Ciclo inexistente'; end if;
  d:=public.security_cycle_diagnostic(p_cycle);
  if p_action='activar' then
    if c.cerrado_en is not null then raise exception 'Reabre el ciclo antes de activarlo'; end if;
    update public.ciclos_escolares set activo=false where activo and id<>p_cycle;
    update public.ciclos_escolares set activo=true where id=p_cycle;
  elsif p_action='cerrar' then
    if not (d->>'puede_cerrar')::boolean then raise exception 'Resuelve las incidencias del diagnóstico antes de cerrar'; end if;
    update public.ciclos_escolares set activo=false,cerrado_en=now(),cerrado_por=auth.uid() where id=p_cycle;
  else
    if c.cerrado_en is null then raise exception 'El ciclo ya está abierto'; end if;
    update public.ciclos_escolares set cerrado_en=null,cerrado_por=null where id=p_cycle;
  end if;
  insert into public.ciclo_historial(ciclo_id,accion,motivo,diagnostico,actor_id) values(p_cycle,p_action,trim(p_reason),d,auth.uid());
  return d;
end $$;
revoke all on function public.security_cycle_transition(uuid,text,text) from public,anon;
grant execute on function public.security_cycle_transition(uuid,text,text) to authenticated;
-- Lifecycle fields cannot be changed directly, including via authenticated APIs.
revoke update,delete on public.ciclos_escolares from authenticated;
grant update(codigo,periodo,fecha_inicio,fecha_fin) on public.ciclos_escolares to authenticated;
revoke insert on public.ciclos_escolares from authenticated;
grant insert(codigo,periodo,fecha_inicio,fecha_fin) on public.ciclos_escolares to authenticated;
drop policy ciclos_admin_write on public.ciclos_escolares;
create policy ciclos_admin_write on public.ciclos_escolares for all to authenticated using(public.es_admin() and public.security_session_valid()) with check(public.es_admin() and public.security_session_valid());
create trigger ciclo_audit after insert or update or delete on public.ciclos_escolares for each row execute function public.fn_audit_trigger();

create function public.security_cycle_write_guard() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare row_data jsonb; cid uuid; closed_at timestamptz;
begin
  for row_data in select value from jsonb_array_elements(case when tg_op='INSERT' then jsonb_build_array(to_jsonb(new)) when tg_op='DELETE' then jsonb_build_array(to_jsonb(old)) else jsonb_build_array(to_jsonb(old),to_jsonb(new)) end) loop
    if tg_table_name in ('asignaciones','inscripciones','solicitudes_parcial') then cid:=(row_data->>'ciclo_id')::uuid;
    elsif tg_table_name='entregas_tarea' then select a.ciclo_id into cid from public.tareas t join public.asignaciones a on a.id=t.asignacion_id where t.id=(row_data->>'tarea_id')::uuid;
    else select ciclo_id into cid from public.asignaciones where id=(row_data->>'asignacion_id')::uuid; end if;
    select cerrado_en into closed_at from public.ciclos_escolares where id=cid for share;
    if closed_at is not null then raise exception 'Ciclo cerrado: solicita reapertura con motivo antes de modificar registros'; end if;
  end loop;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.security_cycle_write_guard() from public,anon,authenticated;
do $$declare t text;begin
  foreach t in array array['calificaciones','inscripciones','asignaciones','tareas','entregas_tarea','solicitudes_revision','solicitudes_parcial'] loop
    execute format('create trigger cycle_write_guard before insert or update or delete on public.%I for each row execute function public.security_cycle_write_guard()',t);
  end loop;
end $$;

create table public.guias_escolares (
  id uuid primary key default gen_random_uuid(), ciclo_id uuid not null unique references public.ciclos_escolares(id),
  ciclo_label text not null check(length(ciclo_label) between 1 and 100), titulo text not null check(length(titulo) between 1 and 200),
  requisitos text not null default '' check(length(requisitos)<=10000), fechas text not null default '' check(length(fechas)<=10000),
  preguntas text not null default '' check(length(preguntas)<=10000), publicada boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.guias_escolares enable row level security;
revoke all on public.guias_escolares from anon;
create policy guide_public on public.guias_escolares for select to anon,authenticated using(publicada);
create policy guide_admin on public.guias_escolares for all to authenticated using(public.es_admin() and public.security_session_valid()) with check(public.es_admin() and public.security_session_valid());
grant select on public.guias_escolares to anon,authenticated;
grant insert,update,delete on public.guias_escolares to authenticated;
create trigger guide_touch before update on public.guias_escolares for each row execute function public.touch_updated_at();
create trigger guide_audit after insert or update or delete on public.guias_escolares for each row execute function public.fn_audit_trigger();

alter table public.noticias add column updated_at timestamptz not null default now();
alter table public.albumes add column updated_at timestamptz not null default now();
-- Existing creation dates are the earliest evidenced change; do not manufacture daily lastmod values.
update public.noticias set updated_at=coalesce(fecha_pub,created_at);
update public.albumes set updated_at=created_at;
create trigger news_touch before update on public.noticias for each row execute function public.touch_updated_at();
create trigger album_touch before update on public.albumes for each row execute function public.touch_updated_at();

create table public.riesgo_ejecuciones (
  id uuid primary key default gen_random_uuid(), ciclo_id uuid not null references public.ciclos_escolares(id) on delete cascade,
  origen text not null check(origen in ('cron_reglas','manual_admin')), dia date not null default (now() at time zone 'America/Mexico_City')::date,
  created_at timestamptz not null default now()
);
create unique index riesgo_daily_cron on public.riesgo_ejecuciones(ciclo_id,dia) where origen='cron_reglas';
create index riesgo_latest_cycle on public.riesgo_snapshots(ciclo_id,alumno_id,created_at desc);
drop policy riesgo_snap_orientador_read on public.riesgo_snapshots;
create policy riesgo_snap_orientador_read on public.riesgo_snapshots for select to authenticated using(exists(select 1 from public.inscripciones i join public.grupos g on g.id=i.grupo_id join public.profesores p on p.id=g.orientador_id where i.alumno_id=riesgo_snapshots.alumno_id and i.ciclo_id=riesgo_snapshots.ciclo_id and i.estatus='activa' and p.perfil_id=auth.uid()));
create function public.security_latest_risk(p_cycle uuid) returns setof public.riesgo_snapshots
language sql stable security invoker set search_path=public,pg_temp as $$
  select distinct on (alumno_id) * from public.riesgo_snapshots where ciclo_id=p_cycle order by alumno_id,created_at desc;
$$;
revoke all on function public.security_latest_risk(uuid) from public,anon;
grant execute on function public.security_latest_risk(uuid) to authenticated,service_role;
alter table public.riesgo_ejecuciones enable row level security;
revoke all on public.riesgo_ejecuciones from anon,authenticated;
create function public.security_save_risk_run(p_cycle uuid,p_rows jsonb,p_origin text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare run_id uuid; newly_critical uuid[]; recipients record; alerts integer:=0;
begin
  if p_origin not in ('cron_reglas','manual_admin') or jsonb_typeof(p_rows)<>'array' then raise exception 'Entrada inválida'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_cycle::text,221));
  insert into public.riesgo_ejecuciones(ciclo_id,origen) values(p_cycle,p_origin) on conflict do nothing returning id into run_id;
  if run_id is null then return jsonb_build_object('duplicada',true,'notificaciones',0); end if;
  if exists(select 1 from jsonb_to_recordset(p_rows) as r(alumno_id uuid,score int,nivel text) where score not between 0 and 100 or nivel not in ('bajo','medio','alto','critico') or not exists(select 1 from public.inscripciones i where i.alumno_id=r.alumno_id and i.ciclo_id=p_cycle and i.estatus='activa')) then raise exception 'Resultado de riesgo inválido'; end if;
  select array_agg(r.alumno_id) into newly_critical from jsonb_to_recordset(p_rows) as r(alumno_id uuid,nivel text)
    where r.nivel='critico' and coalesce((select nivel from public.riesgo_snapshots s where s.ciclo_id=p_cycle and s.alumno_id=r.alumno_id order by created_at desc limit 1),'bajo')<>'critico';
  insert into public.riesgo_snapshots(alumno_id,ciclo_id,score,nivel,factores,recomendacion,generado_por)
    select alumno_id,p_cycle,score,nivel,factores,recomendacion,p_origin from jsonb_to_recordset(p_rows) as r(alumno_id uuid,score smallint,nivel text,factores jsonb,recomendacion text);
  for recipients in select pr.perfil_id,count(distinct i.alumno_id) n from public.inscripciones i join public.grupos g on g.id=i.grupo_id join public.profesores pr on pr.id=g.orientador_id join public.perfiles p on p.id=pr.perfil_id and p.activo
    where i.ciclo_id=p_cycle and i.estatus='activa' and i.alumno_id=any(newly_critical) group by pr.perfil_id loop
    insert into public.notificaciones(user_id,tipo,titulo,mensaje,url) values(recipients.perfil_id,'riesgo','Alumnos en riesgo crítico',recipients.n||' alumno(s) entraron en riesgo crítico. Revisa su seguimiento.','/profesor/riesgo');
    alerts:=alerts+1;
  end loop;
  return jsonb_build_object('duplicada',false,'notificaciones',alerts);
end $$;
revoke all on function public.security_save_risk_run(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.security_save_risk_run(uuid,jsonb,text) to service_role;
