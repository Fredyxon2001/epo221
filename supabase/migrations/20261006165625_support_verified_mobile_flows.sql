-- A minimal class directory; never expose the invoker view of full student rows.
create function public.security_mobile_classmates()
returns table(id uuid,nombre text,apellido_paterno text,apellido_materno text,foto_url text)
language sql stable security definer set search_path=public,pg_temp as $$
  select distinct other.id,other.nombre,other.apellido_paterno,other.apellido_materno,other.foto_url
  from public.alumnos me join public.inscripciones mine on mine.alumno_id=me.id and mine.estatus='activa'
  join public.inscripciones theirs on theirs.grupo_id=mine.grupo_id and theirs.ciclo_id=mine.ciclo_id and theirs.estatus='activa'
  join public.alumnos other on other.id=theirs.alumno_id and other.deleted_at is null
  where public.security_session_valid() and me.perfil_id=auth.uid() and other.id<>me.id;
$$;
revoke all on function public.security_mobile_classmates() from public,anon;
grant execute on function public.security_mobile_classmates() to authenticated,service_role;

-- Service-only atomic text submission; the HTTP handler verifies the caller JWT.
create function public.security_mobile_submit_task(p_actor_id uuid,p_task_id uuid,p_comment text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_student uuid; v_task public.tareas; v_id uuid;
begin
  select al.id into v_student from public.alumnos al join public.perfiles p on p.id=al.perfil_id
    where al.perfil_id=p_actor_id and al.deleted_at is null and p.activo and p.rol='alumno';
  select * into v_task from public.tareas where id=p_task_id for update;
  if v_student is null or v_task.id is null or not exists (
    select 1 from public.asignaciones a join public.inscripciones i on i.grupo_id=a.grupo_id and i.ciclo_id=a.ciclo_id
    where a.id=v_task.asignacion_id and i.alumno_id=v_student and i.estatus='activa'
  ) then raise exception 'Tarea no disponible.'; end if;
  if p_comment is null or length(btrim(p_comment))<1 or length(p_comment)>100000 then raise exception 'Respuesta inválida.'; end if;
  if v_task.fecha_apertura>now() then raise exception 'La tarea todavía no abre.'; end if;
  if v_task.cierra_estricto and v_task.fecha_entrega<now() then raise exception 'La tarea ya cerró.'; end if;
  insert into public.entregas_tarea(tarea_id,alumno_id,comentario,entregado_at,estado)
    values(v_task.id,v_student,btrim(p_comment),now(),'entregada')
    on conflict(tarea_id,alumno_id) do update set comentario=excluded.comentario,entregado_at=excluded.entregado_at,estado=excluded.estado
      where public.entregas_tarea.calificacion is null
    returning id into v_id;
  if v_id is null then raise exception 'La entrega ya fue calificada.'; end if;
  return v_id;
end $$;
revoke all on function public.security_mobile_submit_task(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.security_mobile_submit_task(uuid,uuid,text) to service_role;

-- Classmates can acknowledge received messages without rewriting sender/body/thread.
revoke update on public.mensajes_alumno from authenticated;
grant update(leido_at) on public.mensajes_alumno to authenticated;
create policy mensajes_alumno_ack_recipient on public.mensajes_alumno for update to authenticated
  using(public.mi_hilo_alumno(hilo_id) and not exists(select 1 from public.alumnos al where al.id=autor_id and al.perfil_id=auth.uid()))
  with check(public.mi_hilo_alumno(hilo_id) and not exists(select 1 from public.alumnos al where al.id=autor_id and al.perfil_id=auth.uid()));
