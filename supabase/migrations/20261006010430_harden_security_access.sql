-- Service-only security infrastructure; no client receives service credentials.
create table public.security_rate_limits (
  key text primary key check (key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts >= 1),
  expires_at timestamptz not null
);
create index security_rate_limits_expiry on public.security_rate_limits(expires_at);
alter table public.security_rate_limits enable row level security;
revoke all on public.security_rate_limits from public, anon, authenticated;
grant all on public.security_rate_limits to service_role;
create function public.consume_security_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  if p_key !~ '^[0-9a-f]{64}$' or p_limit not between 1 and 10000 or p_window_seconds not between 1 and 86400 then raise exception 'Invalid rate limit parameters'; end if;
  insert into public.security_rate_limits(key, window_started_at, attempts, expires_at)
  values (p_key, now(), 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    attempts = case when security_rate_limits.expires_at <= now() then 1 else security_rate_limits.attempts + 1 end,
    window_started_at = case when security_rate_limits.expires_at <= now() then now() else security_rate_limits.window_started_at end,
    expires_at = case when security_rate_limits.expires_at <= now() then now() + make_interval(secs => p_window_seconds) else security_rate_limits.expires_at end
  returning attempts into n;
  return n <= p_limit;
end; $$;
revoke all on function public.consume_security_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_security_limit(text,integer,integer) to service_role;
create table public.security_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  event text not null check (length(event) <= 100),
  operation text not null check (length(operation) <= 200),
  created_at timestamptz not null default now()
);
create index security_events_created on public.security_events(created_at);
alter table public.security_events enable row level security;
revoke all on public.security_events from public, anon, authenticated;
grant select on public.security_events to authenticated;
grant all on public.security_events to service_role;
grant usage, select on sequence public.security_events_id_seq to service_role;
create policy security_events_admin_read on public.security_events for select to authenticated
using ((select auth.jwt()->>'aal') = 'aal2' and exists(select 1 from public.perfiles p where p.id=(select auth.uid()) and p.rol in ('admin','staff','director')));
alter table public.imports_credenciales add column credentials_ciphertext text;
alter table public.imports_credenciales add column expires_at timestamptz;
alter table public.imports_credenciales add column downloaded_at timestamptz;
create index imports_credenciales_expiry on public.imports_credenciales(expires_at) where credentials_ciphertext is not null;
-- Existing clients must not read credentials through PostgREST.
revoke all on public.imports_credenciales from public, anon, authenticated;
grant all on public.imports_credenciales to service_role;
-- RPCs that bypassed RLS without checking the caller are service-only.
revoke all on function public.crear_usuario_test(text,text,text,text) from public, anon, authenticated;
revoke all on function public.aplicar_propuesta_calificacion(uuid) from public, anon, authenticated;
revoke all on function public.eval_docente_agregado(uuid,uuid) from public, anon, authenticated;
grant execute on function public.aplicar_propuesta_calificacion(uuid) to service_role;
grant execute on function public.eval_docente_agregado(uuid,uuid) to service_role;
alter function public.crear_usuario_test(text,text,text,text) set search_path = public, extensions, pg_temp;
alter function public.aplicar_propuesta_calificacion(uuid) set search_path = public, extensions, pg_temp;
alter function public.eval_docente_agregado(uuid,uuid) set search_path = public, extensions, pg_temp;
alter function public.check_max_orientador_grupos() set search_path = public, extensions, pg_temp;
alter function public.set_solicitud_orientador() set search_path = public, extensions, pg_temp;
alter function public.slug_email_alumno(text,text) set search_path = public, extensions, pg_temp;
alter function public.trg_notificacion_push() set search_path = public, extensions, pg_temp;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prorettype='trigger'::regtype
  loop execute format('revoke all on function %s from public, anon, authenticated', f.signature); end loop;
end $$;
alter view public.companeros_directorio set (security_invoker = true);
revoke all on public.companeros_directorio from public, anon, authenticated;
grant select on public.companeros_directorio to service_role;
create function public.security_cleanup() returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.security_rate_limits where expires_at < now() - interval '1 day';
  delete from public.security_events where created_at < now() - interval '90 days';
  update public.imports_credenciales set credentials_ciphertext=null where expires_at<=now() and credentials_ciphertext is not null;
end; $$;
revoke all on function public.security_cleanup() from public, anon, authenticated;
grant execute on function public.security_cleanup() to service_role;
