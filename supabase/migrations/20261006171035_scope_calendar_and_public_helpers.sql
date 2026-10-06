-- Apply event audiences on the server, including direct mobile REST reads.
create policy calendar_audience_gate on public.eventos_calendario as restrictive for select to authenticated
  using(public.es_admin() or creado_por=auth.uid() or alcance='todos'
    or (alcance='alumnos' and exists(select 1 from public.alumnos al where al.perfil_id=auth.uid()))
    or (alcance='profesores' and exists(select 1 from public.profesores p where p.perfil_id=auth.uid()))
    or (alcance='grupos' and (
      exists(select 1 from public.inscripciones i join public.alumnos al on al.id=i.alumno_id
        where i.grupo_id=any(grupo_ids) and i.estatus='activa' and al.perfil_id=auth.uid())
      or exists(select 1 from public.asignaciones a join public.profesores p on p.id=a.profesor_id
        where a.grupo_id=any(grupo_ids) and p.perfil_id=auth.uid())
      or exists(select 1 from public.grupos g join public.profesores p on p.id=g.orientador_id
        where g.id=any(grupo_ids) and p.perfil_id=auth.uid())
    )));
create policy horarios_assignment_gate on public.horarios as restrictive for select to authenticated
  using(public.security_can_read_assignment(asignacion_id));
-- These helpers only support authenticated RLS. Keep those grants intact.
revoke execute on function public.es_admin(),public.es_profesor(),public.mi_alumno_id(),public.mi_hilo_alumno(uuid),public.puede_ver_perfil(uuid) from public,anon;
grant execute on function public.es_admin(),public.es_profesor(),public.mi_alumno_id(),public.mi_hilo_alumno(uuid),public.puede_ver_perfil(uuid) to authenticated,service_role;
