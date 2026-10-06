-- Serialize attempts and answers. Only guarded server actions may call these RPCs.
create or replace function public.security_exam_start(p_examen_id uuid, p_actor_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare e public.examenes; v_student uuid; v_id uuid; v_number integer; v_count integer;
begin
  select * into e from public.examenes where id=p_examen_id for update;
  select id into v_student from public.alumnos where perfil_id=p_actor_id;
  if e.id is null or v_student is null or not exists (
    select 1 from public.asignaciones a join public.inscripciones i
      on i.grupo_id=a.grupo_id and i.ciclo_id=a.ciclo_id
    where a.id=e.asignacion_id and i.alumno_id=v_student and i.estatus='activa'
  ) then raise exception 'Examen no disponible.'; end if;
  select id into v_id from public.examen_intentos
    where examen_id=e.id and alumno_id=v_student and estado='en_curso' order by numero desc limit 1;
  if v_id is not null then return v_id; end if;
  if now()<e.fecha_apertura or now()>e.fecha_cierre then raise exception 'El examen está fuera de su horario.'; end if;
  if not exists(select 1 from public.examen_preguntas where examen_id=e.id) then raise exception 'El examen todavía no tiene preguntas.'; end if;
  select count(*),coalesce(max(numero),0)+1 into v_count,v_number
    from public.examen_intentos where examen_id=e.id and alumno_id=v_student;
  if v_count>=coalesce(e.intentos_max,1) then raise exception 'Has agotado los intentos.'; end if;
  insert into public.examen_intentos(examen_id,alumno_id,numero,estado)
    values(e.id,v_student,v_number,'en_curso') returning id into v_id;
  return v_id;
end $$;

create or replace function public.security_exam_answer(
  p_intento_id uuid,p_actor_id uuid,p_answers jsonb,p_submit boolean default false
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare i public.examen_intentos; e public.examenes; q public.examen_preguntas;
  v_key text; v_answer text; v_correct boolean; v_points numeric;
  v_deadline timestamptz; v_total numeric; v_score numeric; v_pending boolean; v_teacher uuid;
begin
  select * into i from public.examen_intentos where id=p_intento_id for update;
  if i.id is null or not exists(select 1 from public.alumnos where id=i.alumno_id and perfil_id=p_actor_id)
    then raise exception 'Intento no disponible.'; end if;
  if i.estado<>'en_curso' then
    if p_submit then return jsonb_build_object('ok',true); end if;
    raise exception 'El examen ya fue entregado.';
  end if;
  select * into e from public.examenes where id=i.examen_id;
  v_deadline:=least(e.fecha_cierre,i.inicio+make_interval(mins=>coalesce(e.duracion_min,60)));
  if now()<e.fecha_apertura then raise exception 'El examen todavía no abre.'; end if;
  if now()>v_deadline and not p_submit then raise exception 'El tiempo del examen terminó.'; end if;
  if jsonb_typeof(p_answers) is distinct from 'object' or octet_length(p_answers::text)>100000
    then raise exception 'Respuestas inválidas.'; end if;
  -- Late submissions freeze the answers already saved before the deadline.
  if now()<=v_deadline then
    for v_key,v_answer in select key,value from jsonb_each_text(p_answers) loop
      select * into q from public.examen_preguntas where id=v_key::uuid and examen_id=e.id;
      if q.id is null or length(v_answer)>10000 then raise exception 'Respuesta inválida.'; end if;
      v_answer:=btrim(v_answer); v_correct:=null; v_points:=null;
      if q.tipo in ('opcion_multiple','verdadero_falso') then
        if v_answer<>'' and not exists(select 1 from jsonb_array_elements(q.opciones) o where o->>'clave'=v_answer)
          then raise exception 'Opción inválida.'; end if;
        v_correct:=v_answer=q.respuesta_correcta; v_points:=case when v_correct then q.puntos else 0 end;
      end if;
      insert into public.examen_respuestas(intento_id,pregunta_id,respuesta,correcta,puntos_obtenidos)
        values(i.id,q.id,v_answer,v_correct,v_points)
        on conflict(intento_id,pregunta_id) do update set respuesta=excluded.respuesta,
          correcta=excluded.correcta,puntos_obtenidos=excluded.puntos_obtenidos;
    end loop;
  end if;
  if p_submit then
    select coalesce(sum(puntos),0) into v_total from public.examen_preguntas where examen_id=e.id;
    select coalesce(sum(r.puntos_obtenidos),0),coalesce(bool_or(q.tipo='abierta' and btrim(coalesce(r.respuesta,''))<>'' and r.puntos_obtenidos is null),false)
      into v_score,v_pending from public.examen_respuestas r join public.examen_preguntas q on q.id=r.pregunta_id
      where r.intento_id=i.id and q.examen_id=e.id;
    update public.examen_intentos set fin=now(),estado=case when v_pending then 'enviado' else 'calificado' end,
      calificacion=case when v_pending then null when v_total>0 then round(v_score/v_total*10,1) else 0 end where id=i.id;
    if v_pending then
      select p.perfil_id into v_teacher from public.asignaciones a join public.profesores p on p.id=a.profesor_id where a.id=e.asignacion_id;
      if v_teacher is not null then insert into public.notificaciones(user_id,tipo,titulo,mensaje,url)
        values(v_teacher,'examen','Examen por calificar: '||e.titulo,'Un alumno entregó respuestas abiertas.','/profesor/examenes'); end if;
    end if;
  end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.security_exam_grade(p_respuesta_id uuid,p_actor_id uuid,p_points numeric,p_correct boolean)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_attempt uuid; i public.examen_intentos; q public.examen_preguntas;
  v_total numeric; v_score numeric; v_pending boolean;
begin
  select intento_id into v_attempt from public.examen_respuestas where id=p_respuesta_id;
  select * into i from public.examen_intentos where id=v_attempt for update;
  if i.id is null or i.estado='en_curso' then raise exception 'El alumno todavía no entrega este examen.'; end if;
  if not exists(select 1 from public.examenes e join public.asignaciones a on a.id=e.asignacion_id
    join public.profesores p on p.id=a.profesor_id where e.id=i.examen_id and p.perfil_id=p_actor_id)
    and not exists(select 1 from public.perfiles where id=p_actor_id and activo and rol in ('admin','staff','director'))
    then raise exception 'Solo el docente asignado puede calificar.'; end if;
  select p.* into q from public.examen_respuestas r join public.examen_preguntas p on p.id=r.pregunta_id
    where r.id=p_respuesta_id and p.examen_id=i.examen_id;
  if q.id is null or q.tipo<>'abierta' or p_points is null or p_points<0 or p_points>q.puntos then raise exception 'Puntuación inválida.'; end if;
  update public.examen_respuestas set puntos_obtenidos=p_points,correcta=p_correct where id=p_respuesta_id;
  select coalesce(sum(puntos),0) into v_total from public.examen_preguntas where examen_id=i.examen_id;
  select coalesce(sum(r.puntos_obtenidos),0),coalesce(bool_or(p.tipo='abierta' and btrim(coalesce(r.respuesta,''))<>'' and r.puntos_obtenidos is null),false)
    into v_score,v_pending from public.examen_respuestas r join public.examen_preguntas p on p.id=r.pregunta_id
    where r.intento_id=i.id and p.examen_id=i.examen_id;
  update public.examen_intentos set estado=case when v_pending then 'enviado' else 'calificado' end,
    calificacion=case when v_pending then null when v_total>0 then round(v_score/v_total*10,1) else 0 end where id=i.id;
  return i.examen_id;
end $$;

revoke all on function public.security_exam_start(uuid,uuid) from public,anon,authenticated;
revoke all on function public.security_exam_answer(uuid,uuid,jsonb,boolean) from public,anon,authenticated;
revoke all on function public.security_exam_grade(uuid,uuid,numeric,boolean) from public,anon,authenticated;
grant execute on function public.security_exam_start(uuid,uuid),public.security_exam_answer(uuid,uuid,jsonb,boolean),
  public.security_exam_grade(uuid,uuid,numeric,boolean) to service_role;

-- Existing permissive policies also exposed exams to historical/inactive enrollments.
create policy security_exam_assignment_gate on public.examenes as restrictive for select to authenticated
  using(public.security_can_read_assignment(asignacion_id));
create policy security_task_assignment_gate on public.tareas as restrictive for select to authenticated
  using(public.security_can_read_assignment(asignacion_id));

-- Quarantine for direct uploads: no public access or client SQL policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('security-uploads','security-uploads',false,52428800,array['application/octet-stream']);
create function public.security_expired_upload_paths()
returns table(name text) language sql security definer set search_path = public,pg_temp as $$
  select o.name from storage.objects o where bucket_id='security-uploads'
    and created_at<now()-interval '3 hours' order by created_at limit 1000;
$$;
revoke all on function public.security_expired_upload_paths() from public,anon,authenticated;
grant execute on function public.security_expired_upload_paths() to service_role;
update storage.buckets set allowed_mime_types=allowed_mime_types || array[
  'application/vnd.oasis.opendocument.text','application/vnd.oasis.opendocument.spreadsheet','application/vnd.oasis.opendocument.presentation'
] where id in ('tareas','mensajes','planeaciones','solicitudes','portafolio','chat-grupal','expedientes');
