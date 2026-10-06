-- Audience checks belong in RLS, including REST clients and private attachments.
create function public.security_can_read_notice(p_aviso_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.security_session_valid() and exists (
    select 1 from public.avisos v where v.id=p_aviso_id and (
      public.es_admin() or v.autor_id=auth.uid() or v.alcance='todos'
      or (v.alcance='profesores' and exists(select 1 from public.profesores p where p.perfil_id=auth.uid()))
      or (v.alcance='alumno' and exists(select 1 from public.alumnos al where al.id=v.alumno_id and al.perfil_id=auth.uid()))
      or (v.alcance in ('grupo','grupos') and (
        exists(select 1 from public.inscripciones i join public.alumnos al on al.id=i.alumno_id
          where i.grupo_id=any(v.grupo_ids) and i.estatus='activa' and al.perfil_id=auth.uid())
        or exists(select 1 from public.asignaciones a join public.profesores p on p.id=a.profesor_id
          where a.grupo_id=any(v.grupo_ids) and p.perfil_id=auth.uid())
        or exists(select 1 from public.grupos g join public.profesores p on p.id=g.orientador_id
          where g.id=any(v.grupo_ids) and p.perfil_id=auth.uid())
      ))
    )
  );
$$;
revoke all on function public.security_can_read_notice(uuid) from public,anon;
grant execute on function public.security_can_read_notice(uuid) to authenticated,service_role;
drop policy avisos_select_all_auth on public.avisos;
create policy avisos_read_audience on public.avisos for select to authenticated
  using(public.security_can_read_notice(id));
-- Tutor contacts are not authenticated accounts in this schema. Existing tutor-only
-- notices remain available to the author/admin until an explicit guardian model exists.
create policy avisos_writer_role on public.avisos as restrictive for insert to authenticated
  with check(exists(select 1 from public.perfiles p where p.id=auth.uid() and p.rol in ('admin','staff','director','profesor')));
create policy avisos_lecturas_audience on public.avisos_lecturas as restrictive for insert to authenticated
  with check(user_id=auth.uid() and public.security_can_read_notice(aviso_id));
create policy avisos_attachments_read on storage.objects for select to authenticated
  using(bucket_id='mensajes' and exists(select 1 from public.avisos v
    where split_part(name,'/',1)='avisos' and v.id::text=split_part(name,'/',2)
      and v.adjunto_url=name and public.security_can_read_notice(v.id)));
create policy avisos_attachments_insert on storage.objects for insert to authenticated
  with check(bucket_id='mensajes' and split_part(name,'/',1)='avisos'
    and exists(select 1 from public.avisos v where v.id::text=split_part(name,'/',2) and v.autor_id=auth.uid()));
create policy avisos_attachments_delete on storage.objects for delete to authenticated
  using(bucket_id='mensajes' and split_part(name,'/',1)='avisos'
    and exists(select 1 from public.avisos v where v.id::text=split_part(name,'/',2) and v.autor_id=auth.uid()));
