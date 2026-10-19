-- A guarded native request stages and validates bytes before this service-only transaction.
-- No client DML/Storage grants are broadened. Keep the existing text RPC intact.
create function public.security_mobile_submit_task_file(
  p_actor_id uuid,p_task_id uuid,p_comment text,p_file jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_student uuid; v_task public.tareas; v_id uuid; v_old_file text; v_cycle uuid; v_closed timestamptz;
begin
  select al.id into v_student from public.alumnos al join public.perfiles p on p.id=al.perfil_id
    where al.perfil_id=p_actor_id and al.deleted_at is null and p.activo and p.rol='alumno';
  select * into v_task from public.tareas where id=p_task_id for update;
  if v_student is null or v_task.id is null or not exists (
    select 1 from public.asignaciones a join public.inscripciones i on i.grupo_id=a.grupo_id and i.ciclo_id=a.ciclo_id
    where a.id=v_task.asignacion_id and i.alumno_id=v_student and i.estatus='activa'
  ) then raise exception 'Tarea no disponible.'; end if;
  select ciclo_id into v_cycle from public.asignaciones where id=v_task.asignacion_id;
  select cerrado_en into v_closed from public.ciclos_escolares where id=v_cycle for share;
  if not found or v_closed is not null then raise exception 'Ciclo cerrado.'; end if;
  if p_comment is null or length(btrim(p_comment))<1 or length(p_comment)>100000 then raise exception 'Respuesta inválida.'; end if;
  if v_task.fecha_apertura>now() then raise exception 'La tarea todavía no abre.'; end if;
  if v_task.cierra_estricto and v_task.fecha_entrega<now() then raise exception 'La tarea ya cerró.'; end if;
  if not v_task.permite_archivos or jsonb_typeof(p_file) is distinct from 'object'
    or coalesce(p_file->>'path','') !~ ('^'||p_task_id::text||'/[0-9a-f-]{36}[.][a-z0-9]+$')
    or coalesce(length(p_file->>'name'),0) not between 1 and 200
    or coalesce(length(p_file->>'type'),0) not between 1 and 150
    or coalesce((p_file->>'size')::bigint,0) not between 1 and 26214400
    then raise exception 'Archivo inválido.'; end if;
  select archivo_url into v_old_file from public.entregas_tarea
    where tarea_id=p_task_id and alumno_id=v_student for update;
  insert into public.entregas_tarea(tarea_id,alumno_id,comentario,archivo_url,archivo_nombre,archivo_tipo,archivo_tamano,entregado_at,estado)
    values(v_task.id,v_student,btrim(p_comment),p_file->>'path',p_file->>'name',p_file->>'type',(p_file->>'size')::bigint,now(),'entregada')
    on conflict(tarea_id,alumno_id) do update set comentario=excluded.comentario,archivo_url=excluded.archivo_url,
      archivo_nombre=excluded.archivo_nombre,archivo_tipo=excluded.archivo_tipo,archivo_tamano=excluded.archivo_tamano,
      entregado_at=excluded.entregado_at,estado=excluded.estado where public.entregas_tarea.calificacion is null
    returning id into v_id;
  if v_id is null then raise exception 'La entrega ya fue calificada.'; end if;
  return jsonb_build_object('id',v_id,'previous_path',v_old_file);
end $$;
revoke all on function public.security_mobile_submit_task_file(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.security_mobile_submit_task_file(uuid,uuid,text,jsonb) to service_role;

-- Exams use the same closed-cycle boundary on web actions and native APIs.
-- The cycle row share lock serializes writers with the existing close/reopen transaction.
create function public.security_exam_cycle_write_guard() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare row_data jsonb; v_exam uuid; v_cycle uuid; v_closed timestamptz;
begin
  for row_data in select value from jsonb_array_elements(case when tg_op='INSERT' then jsonb_build_array(to_jsonb(new)) when tg_op='DELETE' then jsonb_build_array(to_jsonb(old)) else jsonb_build_array(to_jsonb(old),to_jsonb(new)) end) loop
    if tg_table_name='examenes' then
      select ciclo_id into v_cycle from public.asignaciones where id=(row_data->>'asignacion_id')::uuid;
    else
      if tg_table_name in ('examen_preguntas','examen_intentos') then v_exam:=(row_data->>'examen_id')::uuid;
      else select examen_id into v_exam from public.examen_intentos where id=(row_data->>'intento_id')::uuid;
      end if;
      select a.ciclo_id into v_cycle from public.examenes e join public.asignaciones a on a.id=e.asignacion_id where e.id=v_exam;
    end if;
    -- A cascaded DELETE follows a parent DELETE already checked by this trigger.
    if v_cycle is null then
      if tg_op='DELETE' then continue; end if;
      raise exception 'Ciclo del examen no disponible.';
    end if;
    select cerrado_en into v_closed from public.ciclos_escolares where id=v_cycle for share;
    if not found or v_closed is not null then raise exception 'Ciclo cerrado: solicita reapertura antes de modificar el examen.'; end if;
  end loop;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.security_exam_cycle_write_guard() from public,anon,authenticated;
do $$declare t text;begin
  foreach t in array array['examenes','examen_preguntas','examen_intentos','examen_respuestas'] loop
    execute format('create trigger exam_cycle_write_guard before insert or update or delete on public.%I for each row execute function public.security_exam_cycle_write_guard()',t);
  end loop;
end $$;


-- Rollout readiness: new native writes stay unavailable until this complete boundary exists.
-- Metadata only; neither student records nor secrets are returned. A missing/misconfigured
-- function or row-level guard yields false. Do not gate legacy text submissions or reads.
create function public.security_mobile_learning_ready()
returns boolean language sql stable security invoker set search_path=pg_catalog as $$
  select coalesce(
    exists (
      select 1 from pg_catalog.pg_proc p
      where p.oid=pg_catalog.to_regprocedure('public.security_mobile_submit_task_file(uuid,uuid,text,jsonb)')
        and p.prosecdef and p.prorettype='pg_catalog.jsonb'::pg_catalog.regtype
    )
    and pg_catalog.has_function_privilege('service_role',
      pg_catalog.to_regprocedure('public.security_mobile_submit_task_file(uuid,uuid,text,jsonb)'), 'EXECUTE')
    and not pg_catalog.has_function_privilege('anon',
      pg_catalog.to_regprocedure('public.security_mobile_submit_task_file(uuid,uuid,text,jsonb)'), 'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',
      pg_catalog.to_regprocedure('public.security_mobile_submit_task_file(uuid,uuid,text,jsonb)'), 'EXECUTE')
    and (
      select count(*)=4
      from pg_catalog.pg_trigger t
      join pg_catalog.pg_class c on c.oid=t.tgrelid
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      join pg_catalog.pg_proc p on p.oid=t.tgfoid
      where n.nspname='public'
        and c.relname in ('examenes','examen_preguntas','examen_intentos','examen_respuestas')
        and t.tgname='exam_cycle_write_guard' and not t.tgisinternal
        and t.tgenabled in ('O','A') and t.tgtype=31 and t.tgnargs=0 and t.tgqual is null
        and t.tgfoid=pg_catalog.to_regprocedure('public.security_exam_cycle_write_guard()')
        and p.prosecdef and p.prorettype='pg_catalog.trigger'::pg_catalog.regtype
    ), false
  );
$$;
revoke all on function public.security_mobile_learning_ready() from public,anon,authenticated;
grant execute on function public.security_mobile_learning_ready() to service_role;
