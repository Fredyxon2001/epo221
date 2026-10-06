-- Public-content policies still use es_admin(); it returns only the caller's boolean.
revoke execute on function public.security_session_alive(),public.security_session_valid(),public.es_profesor(),public.mi_alumno_id(),public.mi_hilo_alumno(uuid),public.puede_ver_perfil(uuid) from anon;

create function public.security_storage_read_allowed(p_bucket text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.security_session_valid() or exists(select 1 from storage.buckets where id=p_bucket and public);
$$;
revoke all on function public.security_storage_read_allowed(text) from public,anon;
grant execute on function public.security_storage_read_allowed(text) to authenticated,service_role;
create policy security_storage_read_gate on storage.objects as restrictive for select to authenticated using(public.security_storage_read_allowed(bucket_id));
create policy security_storage_insert_gate on storage.objects as restrictive for insert to authenticated with check(public.security_session_valid());
create policy security_storage_update_gate on storage.objects as restrictive for update to authenticated using(public.security_session_valid()) with check(public.security_session_valid());
create policy security_storage_delete_gate on storage.objects as restrictive for delete to authenticated using(public.security_session_valid());
