-- Institutional proposals start pending. No legal approval, names, dates or targets are invented.
create table public.operacion_revisiones (
  id uuid primary key default gen_random_uuid(),
  tema text not null unique check(tema in ('publicaciones','calendario_formatos','privacidad','fotografias','recuperacion_mfa','retenciones','continuidad','contactos')),
  titulo text not null check(length(titulo) between 1 and 200),
  area_responsable text not null check(length(trim(area_responsable)) between 1 and 120),
  periodicidad_dias integer not null default 90 check(periodicidad_dias between 1 and 366),
  ciclo_id uuid references public.ciclos_escolares(id),
  folio_referencia text not null default '' check(length(folio_referencia)<=200),
  referencia_url text not null default '' check(length(referencia_url)<=2000 and (referencia_url='' or referencia_url ~ '^https://[^[:space:]]+$')),
  detalle text not null default '' check(length(detalle)<=12000),
  fecha_revision date,
  proxima_revision date,
  objetivo_rpo_minutos integer check(objetivo_rpo_minutos between 0 and 43200),
  objetivo_rto_minutos integer check(objetivo_rto_minutos between 1 and 43200),
  estado text not null default 'borrador' check(estado in ('borrador','aprobado')),
  huella_solicitada text check(huella_solicitada is null or huella_solicitada ~ '^[0-9a-f]{64}$'),
  huella_aprobada text,
  fuentes_solicitadas text check(fuentes_solicitadas is null or fuentes_solicitadas ~ '^[0-9a-f]{64}$'),
  fuentes_aprobadas text,
  snapshot_aprobado jsonb,
  aprobado_por uuid references public.perfiles(id) on delete set null,
  aprobado_en timestamptz,
  revision integer not null default 1,
  actualizado_por uuid references public.perfiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check(fecha_revision is null or proxima_revision is null or fecha_revision<=proxima_revision)
);
create table public.operacion_historial (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.operacion_revisiones(id) on delete cascade,
  actor_id uuid references public.perfiles(id) on delete set null,
  actor_rol text not null,
  accion text not null check(accion in ('borrador','aprobacion')),
  version integer not null,
  datos jsonb not null,
  created_at timestamptz not null default now()
);
create index operacion_historial_revision_date on public.operacion_historial(revision_id,created_at desc);
alter table public.operacion_revisiones enable row level security;
alter table public.operacion_historial enable row level security;
revoke all on public.operacion_revisiones,public.operacion_historial from anon,authenticated;
grant select on public.operacion_revisiones,public.operacion_historial to authenticated;
grant update(titulo,area_responsable,periodicidad_dias,ciclo_id,folio_referencia,referencia_url,detalle,fecha_revision,proxima_revision,objetivo_rpo_minutos,objetivo_rto_minutos,estado,huella_solicitada,fuentes_solicitadas) on public.operacion_revisiones to authenticated;
grant insert on public.operacion_historial to authenticated;
create policy operation_reviews_read on public.operacion_revisiones for select to authenticated using((select public.es_admin()));
create policy operation_reviews_update on public.operacion_revisiones for update to authenticated using((select public.es_admin())) with check((select public.es_admin()));
create policy operation_history_read on public.operacion_historial for select to authenticated using((select public.es_admin()));
-- Only the AFTER trigger can append. Direct insertion would allow fabricated evidence.
create policy operation_history_append on public.operacion_historial for insert to authenticated with check(pg_trigger_depth()=1 and (select public.es_admin()) and actor_id=(select auth.uid()));
insert into public.operacion_revisiones(tema,titulo,area_responsable) values
('publicaciones','Revisión del contenido público','Dirección / Control Escolar'),
('calendario_formatos','Calendario, guías y formatos por ciclo','Control Escolar'),
('privacidad','Aviso institucional y medios de atención','Dirección'),
('fotografias','Autorización y revisión de fotografías','Dirección'),
('recuperacion_mfa','Recuperación verificada de acceso y MFA','TI / Dirección'),
('retenciones','Catálogo y plazos de conservación','Dirección / Control Escolar / Finanzas'),
('continuidad','Respaldo, restauración y objetivos RPO/RTO','TI / Dirección'),
('contactos','Contacto institucional y atención de trámites','Control Escolar');

-- SECURITY INVOKER preserves JWT/RLS. Whitelist public fields; never hash bank or student records.
create function public.operation_public_snapshot(p_tema text) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb:='{"schema":1}'::jsonb; section jsonb;
begin
  if not public.es_admin() then raise exception 'Acceso no autorizado' using errcode='42501'; end if;
  if p_tema not in ('publicaciones','calendario_formatos','privacidad','fotografias','recuperacion_mfa','retenciones','continuidad','contactos') then raise exception 'Tema inválido'; end if;
  if p_tema in ('publicaciones','privacidad','fotografias','contactos') then
    select coalesce(jsonb_agg((select jsonb_object_agg(key,to_jsonb(c)->key) from unnest(array['nombre_escuela','cct','direccion','telefono','email','email2','horario','mapa_embed_url','facebook_url','instagram_url','tiktok_url','youtube_url','whatsapp_url','spotify_url','logo_url','lema','mision','vision','historia','hero_titulo','hero_subtitulo','hero_imagen_url','total_alumnos','total_generaciones','aniversario','porcentaje_aprobacion','valores']) key) order by c.id),'[]'::jsonb) into section from public.sitio_config c;
    result:=result||jsonb_build_object('configuracion_publica',section);
  end if;
  if p_tema in ('publicaciones','calendario_formatos','recuperacion_mfa','retenciones','continuidad') then
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'codigo',codigo,'periodo',periodo,'inicio',fecha_inicio,'fin',fecha_fin,'activo',activo) order by id),'[]'::jsonb) into section from public.ciclos_escolares;
    result:=result||jsonb_build_object('ciclos',section);
  end if;
  if p_tema in ('publicaciones','calendario_formatos','contactos') then
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'titulo',titulo,'descripcion',descripcion,'archivo_url',archivo_url,'desde',vigente_desde,'hasta',vigente_hasta) order by id),'[]'::jsonb) into section from public.convocatorias where deleted_at is null;
    result:=result||jsonb_build_object('convocatorias',section);
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'ciclo',ciclo_id,'ciclo_label',ciclo_label,'titulo',titulo,'requisitos',requisitos,'fechas',fechas,'preguntas',preguntas) order by id),'[]'::jsonb) into section from public.guias_escolares where publicada;
    result:=result||jsonb_build_object('guias_publicadas',section);
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'titulo',titulo,'descripcion',descripcion,'audiencia',audiencia,'ciclo',ciclo_id,'version',version,'vigente',vigente,'pdf',pdf_url,'docx',docx_url) order by id),'[]'::jsonb) into section from public.documentos_publicos where publicada;
    result:=result||jsonb_build_object('documentos_publicados',section);
  end if;
  if p_tema in ('publicaciones','privacidad') then
    select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'slug',p.slug,'titulo',p.titulo,'contenido',to_jsonb(p)->'contenido','orden',to_jsonb(p)->'orden') order by p.id),'[]'::jsonb) into section from public.paginas_publicas p where p.publicada and p.deleted_at is null;
    result:=result||jsonb_build_object('paginas_publicadas',section);
  end if;
  if p_tema='publicaciones' then
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'slug',slug,'titulo',titulo,'resumen',resumen,'contenido',contenido,'fecha',fecha_pub,'imagen',imagen_url) order by id),'[]'::jsonb) into section from public.noticias where publicada and deleted_at is null;
    result:=result||jsonb_build_object('noticias_publicadas',section);
    select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'nombre',to_jsonb(m)->'nombre','semestre',to_jsonb(m)->'semestre','campo',to_jsonb(m)->'campo_id','tipo',to_jsonb(m)->'tipo','horas',to_jsonb(m)->'horas_semestrales') order by m.id),'[]'::jsonb) into section from public.materias m where m.activo and m.deleted_at is null;
    result:=result||jsonb_build_object('materias_publicas',section);
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'nombre',nombre) order by id),'[]'::jsonb) into section from public.campos_disciplinares;
    result:=result||jsonb_build_object('campos_publicos',section);
  end if;
  if p_tema in ('publicaciones','fotografias') then
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'slug',slug,'titulo',titulo,'descripcion',descripcion,'portada',portada_url,'fecha',fecha_evento) order by id),'[]'::jsonb) into section from public.albumes where publicado and deleted_at is null;
    result:=result||jsonb_build_object('albumes_publicados',section);
    select coalesce(jsonb_agg((select jsonb_object_agg(key,to_jsonb(f)->key) from unnest(array['id','album_id','foto_url','caption','orden']) key) order by f.id),'[]'::jsonb) into section from public.album_fotos f join public.albumes a on a.id=f.album_id where a.publicado and a.deleted_at is null;
    result:=result||jsonb_build_object('fotografias_publicadas',section);
  end if;
  return result;
end $$;
revoke all on function public.operation_public_snapshot(text) from public,anon;
grant execute on function public.operation_public_snapshot(text) to authenticated;

create function public.operation_public_fingerprint(p_tema text) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare snapshot jsonb; summary jsonb;
begin
  snapshot:=public.operation_public_snapshot(p_tema);
  select coalesce(jsonb_object_agg(key,jsonb_array_length(value)),'{}'::jsonb) into summary from jsonb_each(snapshot) where jsonb_typeof(value)='array';
  return jsonb_build_object('huella',encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),'resumen',summary);
end $$;
revoke all on function public.operation_public_fingerprint(text) from public,anon;
grant execute on function public.operation_public_fingerprint(text) to authenticated;

create function public.operation_review_guard() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare role_name text; snapshot jsonb; fingerprint text; today date:=(now() at time zone 'America/Mexico_City')::date;
begin
  -- FK SET NULL when an account is removed may unlink audit actors without changing the review.
  -- No authenticated client has UPDATE grants on these actor columns. Keep the evidence intact.
  if pg_trigger_depth()>1 and (to_jsonb(new)-'aprobado_por'-'actualizado_por')=(to_jsonb(old)-'aprobado_por'-'actualizado_por')
    and (new.aprobado_por is not distinct from old.aprobado_por or new.aprobado_por is null)
    and (new.actualizado_por is not distinct from old.actualizado_por or new.actualizado_por is null) then return new; end if;
  if not public.es_admin() then raise exception 'Acceso no autorizado' using errcode='42501'; end if;
  select rol::text into role_name from public.perfiles where id=auth.uid();
  if new.estado='aprobado' then
    if role_name not in ('admin','director') or auth.jwt()->>'aal'<>'aal2' then raise exception 'Solo Dirección o Administración con MFA aprueban' using errcode='42501'; end if;
    if length(trim(new.folio_referencia))<3 or length(trim(new.detalle))<30 or new.fecha_revision is null or new.proxima_revision is null
      or new.fecha_revision>today or new.proxima_revision<today or new.proxima_revision>new.fecha_revision+new.periodicidad_dias then
      raise exception 'Completa referencia, revisión realizada y próxima revisión válida' using errcode='23514';
    end if;
    if new.tema='continuidad' and (new.objetivo_rpo_minutos is null or new.objetivo_rto_minutos is null) then raise exception 'Define los objetivos RPO y RTO acordados' using errcode='23514'; end if;
    snapshot:=public.operation_public_snapshot(new.tema);
    fingerprint:=encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
    if new.huella_solicitada is distinct from fingerprint then raise exception 'Cambió el contenido; vuelve a revisarlo' using errcode='40001'; end if;
    if new.tema in ('publicaciones','privacidad','fotografias') and new.fuentes_solicitadas is null then raise exception 'Revisa las páginas informativas actuales' using errcode='23514'; end if;
    new.fuentes_aprobadas:=new.fuentes_solicitadas;
    new.snapshot_aprobado:=snapshot;new.huella_aprobada:=fingerprint;new.aprobado_por:=auth.uid();new.aprobado_en:=now();
  else
    new.snapshot_aprobado:=null;new.huella_aprobada:=null;new.fuentes_aprobadas:=null;new.aprobado_por:=null;new.aprobado_en:=null;
  end if;
  new.huella_solicitada:=null;new.fuentes_solicitadas:=null;new.actualizado_por:=auth.uid();new.updated_at:=now();new.revision:=old.revision+1;
  return new;
end $$;
revoke all on function public.operation_review_guard() from public,anon,authenticated;
create trigger operation_review_guard before update on public.operacion_revisiones for each row execute function public.operation_review_guard();

create function public.operation_review_history() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare role_name text;
begin
  if new.revision=old.revision then return new; end if;
  select rol::text into role_name from public.perfiles where id=auth.uid();
  insert into public.operacion_historial(revision_id,actor_id,actor_rol,accion,version,datos)
  values(new.id,auth.uid(),role_name,case when new.estado='aprobado' then 'aprobacion' else 'borrador' end,new.revision,
    jsonb_build_object('titulo',new.titulo,'area_responsable',new.area_responsable,'periodicidad_dias',new.periodicidad_dias,'ciclo_id',new.ciclo_id,'folio_referencia',new.folio_referencia,'referencia_url',new.referencia_url,'detalle',new.detalle,'fecha_revision',new.fecha_revision,'proxima_revision',new.proxima_revision,'objetivo_rpo_minutos',new.objetivo_rpo_minutos,'objetivo_rto_minutos',new.objetivo_rto_minutos,'huella_aprobada',new.huella_aprobada,'fuentes_aprobadas',new.fuentes_aprobadas,'snapshot_aprobado',new.snapshot_aprobado));
  return new;
end $$;
revoke all on function public.operation_review_history() from public,anon,authenticated;
create trigger operation_review_history after update on public.operacion_revisiones for each row execute function public.operation_review_history();

create function public.operation_approve_review(p_id uuid,p_revision integer,p_huella text,p_fuentes text default null) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare review public.operacion_revisiones;
begin
  if not public.es_admin() or not exists(select 1 from public.perfiles where id=auth.uid() and rol in ('admin','director')) then raise exception 'Acceso no autorizado' using errcode='42501'; end if;
  select * into review from public.operacion_revisiones where id=p_id for update;
  if not found then raise exception 'Revisión inexistente'; end if;
  if review.revision<>p_revision then raise exception 'La revisión cambió; recarga antes de aprobar' using errcode='40001'; end if;
  update public.operacion_revisiones set estado='aprobado',huella_solicitada=p_huella,fuentes_solicitadas=p_fuentes where id=p_id;
end $$;
revoke all on function public.operation_approve_review(uuid,integer,text,text) from public,anon;
grant execute on function public.operation_approve_review(uuid,integer,text,text) to authenticated;
