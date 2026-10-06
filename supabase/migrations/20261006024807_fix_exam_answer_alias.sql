-- Disambiguate the PL/pgSQL record from the aggregation SQL alias.
create or replace function public.security_exam_answer(
  p_intento_id uuid,p_actor_id uuid,p_answers jsonb,p_submit boolean default false
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare i public.examen_intentos; e public.examenes; v_question public.examen_preguntas;
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
      select * into v_question from public.examen_preguntas where id=v_key::uuid and examen_id=e.id;
      if v_question.id is null or length(v_answer)>10000 then raise exception 'Respuesta inválida.'; end if;
      v_answer:=btrim(v_answer); v_correct:=null; v_points:=null;
      if v_question.tipo in ('opcion_multiple','verdadero_falso') then
        if v_answer<>'' and not exists(select 1 from jsonb_array_elements(v_question.opciones) o where o->>'clave'=v_answer)
          then raise exception 'Opción inválida.'; end if;
        v_correct:=v_answer=v_question.respuesta_correcta; v_points:=case when v_correct then v_question.puntos else 0 end;
      end if;
      insert into public.examen_respuestas(intento_id,pregunta_id,respuesta,correcta,puntos_obtenidos)
        values(i.id,v_question.id,v_answer,v_correct,v_points)
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
