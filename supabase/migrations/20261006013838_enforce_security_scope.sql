-- Apply after deploying the password/MFA bootstrap flow.
create function public.security_session_alive() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.perfiles p join auth.sessions s on s.user_id=p.id
    where p.id=auth.uid() and p.activo and s.id=nullif(auth.jwt()->>'session_id','')::uuid
      and (p.password_reset_at is null or coalesce((auth.jwt()->>'iat')::bigint,0)>=extract(epoch from date_trunc('second',p.password_reset_at))));
$$;
revoke all on function public.security_session_alive() from public;
grant execute on function public.security_session_alive() to anon,authenticated,service_role;
create function public.security_session_valid() returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select public.security_session_alive() and exists(select 1 from public.perfiles p where p.id=auth.uid() and p.activo
    and not coalesce(p.debe_cambiar_password,false)
    and (p.rol not in ('admin','staff','director','finanzas') or coalesce(auth.jwt()->>'aal','aal1')='aal2')
    and (coalesce(auth.jwt()->>'aal','aal1')='aal2' or not exists(select 1 from auth.mfa_factors f where f.user_id=p.id and f.status='verified')));
$$;
create function public.security_revoke_user_sessions(p_user_id uuid,p_keep_session uuid default null) returns void language sql security definer set search_path=public,pg_temp as $$
  delete from auth.sessions where user_id=p_user_id and (p_keep_session is null or id<>p_keep_session);
$$;
revoke all on function public.security_revoke_user_sessions(uuid,uuid) from public,anon,authenticated;
grant execute on function public.security_revoke_user_sessions(uuid,uuid) to service_role;
revoke all on function public.security_session_valid() from public;
grant execute on function public.security_session_valid() to anon, authenticated, service_role;

create or replace function public.es_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.security_session_valid() and exists(select 1 from public.perfiles p where p.id=auth.uid() and p.rol in ('admin','staff','director'));
$$;
create or replace function public.es_profesor() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.security_session_valid() and exists(select 1 from public.perfiles p where p.id=auth.uid() and p.rol='profesor');
$$;
create function public.security_is_student_counselor(p_alumno_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.security_session_valid() and exists(select 1 from public.inscripciones i join public.grupos g on g.id=i.grupo_id
    join public.profesores p on p.id=g.orientador_id where i.alumno_id=p_alumno_id and i.estatus='activa' and p.perfil_id=auth.uid());
$$;
create function public.security_can_read_student(p_alumno_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.security_session_valid() and (
    public.es_admin() or exists(select 1 from public.alumnos a where a.id=p_alumno_id and a.perfil_id=auth.uid())
    or public.security_is_student_counselor(p_alumno_id)
    or exists(select 1 from public.inscripciones i join public.asignaciones a on a.grupo_id=i.grupo_id and a.ciclo_id=i.ciclo_id
      join public.profesores p on p.id=a.profesor_id where i.alumno_id=p_alumno_id and i.estatus='activa' and p.perfil_id=auth.uid()));
$$;
create function public.security_can_read_assignment(p_asignacion_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.security_session_valid() and (public.es_admin()
    or exists(select 1 from public.asignaciones a join public.profesores p on p.id=a.profesor_id where a.id=p_asignacion_id and p.perfil_id=auth.uid())
    or exists(select 1 from public.asignaciones a join public.grupos g on g.id=a.grupo_id join public.profesores p on p.id=g.orientador_id where a.id=p_asignacion_id and p.perfil_id=auth.uid())
    or exists(select 1 from public.asignaciones a join public.inscripciones i on i.grupo_id=a.grupo_id and i.ciclo_id=a.ciclo_id
      join public.alumnos al on al.id=i.alumno_id where a.id=p_asignacion_id and i.estatus='activa' and al.perfil_id=auth.uid()));
$$;
create function public.security_can_contact_professor(p_profesor_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.security_session_valid() and (public.es_admin()
    or exists(select 1 from public.profesores p where p.id=p_profesor_id and p.perfil_id=auth.uid())
    or exists(select 1 from public.asignaciones a join public.grupos g on g.id=a.grupo_id join public.profesores p on p.id=g.orientador_id where a.profesor_id=p_profesor_id and p.perfil_id=auth.uid())
    or exists(select 1 from public.asignaciones a join public.inscripciones i on i.grupo_id=a.grupo_id and i.ciclo_id=a.ciclo_id
      join public.alumnos al on al.id=i.alumno_id where a.profesor_id=p_profesor_id and i.estatus='activa' and al.perfil_id=auth.uid())
    or exists(select 1 from public.grupos g join public.inscripciones i on i.grupo_id=g.id join public.alumnos al on al.id=i.alumno_id
      where g.orientador_id=p_profesor_id and i.estatus='activa' and al.perfil_id=auth.uid()));
$$;
revoke all on function public.security_is_student_counselor(uuid), public.security_can_read_student(uuid), public.security_can_read_assignment(uuid), public.security_can_contact_professor(uuid) from public,anon;
grant execute on function public.security_is_student_counselor(uuid), public.security_can_read_student(uuid), public.security_can_read_assignment(uuid), public.security_can_contact_professor(uuid) to authenticated,service_role;
create or replace function public.puede_ver_perfil(perfil_objetivo uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select perfil_objetivo=auth.uid() or public.es_admin() or exists(select 1 from public.alumnos a where a.perfil_id=perfil_objetivo and public.security_can_read_student(a.id)) or exists(select 1 from public.profesores p where p.perfil_id=perfil_objetivo and public.security_can_contact_professor(p.id));
$$;
drop policy alumnos_select_self on public.alumnos;
create policy alumnos_select_scope on public.alumnos for select to authenticated using(public.security_can_read_student(id));
drop policy insc_read on public.inscripciones;
create policy insc_read_scope on public.inscripciones for select to authenticated using(public.security_can_read_student(alumno_id));
drop policy asig_read on public.asignaciones;
create policy asig_read_scope on public.asignaciones for select to authenticated using(public.security_can_read_assignment(id));
drop policy prof_read on public.profesores;
create policy prof_read_scope on public.profesores for select to authenticated using(public.security_can_contact_professor(id));
drop policy as_select on public.asistencias;
create policy as_read_scope on public.asistencias for select to authenticated using(public.security_can_read_student(alumno_id) and public.security_can_read_assignment(asignacion_id));
drop policy bitacora_select on public.bitacora_clase;
create policy bitacora_read_scope on public.bitacora_clase for select to authenticated using(public.security_can_read_assignment(asignacion_id));
drop policy avisos_lecturas_select_propio on public.avisos_lecturas;
create policy avisos_lecturas_read_scope on public.avisos_lecturas for select to authenticated using(user_id=auth.uid() or public.es_admin());

-- RLS alone does not prevent students from writing grade columns in their own row.
revoke insert,update,delete on public.examen_intentos, public.examen_respuestas, public.entregas_tarea,
 public.calificaciones_propuestas, public.solicitudes_modificacion_ficha, public.eval_docente_respuestas, public.push_webhook_config from public,anon,authenticated;
revoke all on public.push_webhook_config from public,anon,authenticated;
-- Students may read questions and their answers, never answer keys or live grading.
revoke select on public.examen_preguntas,public.examen_respuestas from public,anon,authenticated;
grant select(id,examen_id,orden,tipo,enunciado,puntos,opciones,created_at,es_banco,tema,dificultad,materia_id,autor_id) on public.examen_preguntas to authenticated;
grant select(id,intento_id,pregunta_id,respuesta) on public.examen_respuestas to authenticated;

-- Direct client access to private data also requires password setup and MFA.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='public' and tablename not in
    ('perfiles','security_rate_limits','security_events','imports_credenciales','sitio_config','noticias','convocatorias','albumes','album_fotos','paginas_publicas','bloques_inicio','redes_sociales','campos_disciplinares','materias','ciclos_escolares','aprendizajes_esperados')
  loop
    execute format('create policy security_session_gate on public.%I as restrictive for all to authenticated using(public.security_session_valid()) with check(public.security_session_valid())', t.tablename);
  end loop;
end $$;
-- Own profile remains readable so login/password/MFA can bootstrap safely.
create policy security_profile_gate on public.perfiles as restrictive for all to authenticated
using(id=auth.uid() or public.security_session_valid()) with check(public.security_session_valid());

alter extension citext set schema extensions;
alter extension unaccent set schema extensions;
