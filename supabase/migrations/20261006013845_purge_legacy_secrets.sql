-- Legacy credentials were checked against current Auth hashes: no matches remained.
-- Remove persisted plaintext and historic secret fields; keep academic records intact.
alter table public.security_events add column if not exists metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object');
update public.imports_credenciales set credenciales='[]'::jsonb where credenciales<>'[]'::jsonb;
update public.audit_log set diff=public.security_redact_jsonb(diff) where diff is not null and diff<>public.security_redact_jsonb(diff);
update public.auditoria set cambios=public.security_redact_jsonb(cambios) where cambios is not null and cambios<>public.security_redact_jsonb(cambios);
revoke all on function public.rls_auto_enable() from public,anon,authenticated;
-- Class contact directory exposes names, not RFC or private contact fields.
revoke select on public.profesores from public,anon,authenticated;
grant select(id,perfil_id,nombre,apellido_paterno,apellido_materno,activo,created_at,deleted_at,foto_url) on public.profesores to authenticated;
