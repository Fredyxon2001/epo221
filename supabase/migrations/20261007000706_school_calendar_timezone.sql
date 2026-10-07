-- Dates follow the school calendar, regardless of provider server timezone.
create or replace function public.security_cycle_diagnostic(p_cycle uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.ciclos_escolares; missing_grades integer; no_subjects integer; inconsistent integer; reviews integer; payments integer; enrolled integer;
begin
  if not public.security_session_valid() or not public.es_admin() then raise exception 'Acceso no autorizado' using errcode='42501'; end if;
  select * into c from public.ciclos_escolares where id=p_cycle;
  if not found then raise exception 'Ciclo inexistente'; end if;
  select count(*) into enrolled from public.inscripciones where ciclo_id=p_cycle and estatus='activa';
  select count(*) into inconsistent from public.inscripciones i join public.grupos g on g.id=i.grupo_id where i.ciclo_id=p_cycle and g.ciclo_id<>p_cycle;
  select count(*) into no_subjects from public.inscripciones i where i.ciclo_id=p_cycle and i.estatus='activa' and not exists(select 1 from public.asignaciones a where a.ciclo_id=p_cycle and a.grupo_id=i.grupo_id);
  select count(*) into missing_grades from public.inscripciones i join public.asignaciones a on a.grupo_id=i.grupo_id and a.ciclo_id=i.ciclo_id
    left join public.calificaciones k on k.alumno_id=i.alumno_id and k.asignacion_id=a.id
    where i.ciclo_id=p_cycle and i.estatus='activa' and (k.id is null or k.p1 is null or k.p2 is null or k.p3 is null or k.promedio_final is null);
  select count(*) into reviews from public.solicitudes_revision r join public.asignaciones a on a.id=r.asignacion_id where a.ciclo_id=p_cycle and r.estado in ('abierta','respondida');
  reviews:=reviews+(select count(*) from public.solicitudes_parcial where ciclo_id=p_cycle and estado='pendiente');
  select count(*) into payments from public.pagos p where p.validado_en is null and p.rechazado_motivo is null and exists(select 1 from public.inscripciones i where i.ciclo_id=p_cycle and i.alumno_id=p.alumno_id);
  return jsonb_build_object('version',1,'inscripciones',enrolled,'calificaciones_incompletas',missing_grades,'sin_materias',no_subjects,'inscripciones_inconsistentes',inconsistent,'revisiones_pendientes',reviews,'pagos_por_revisar',payments,
    'fechas_validas',c.fecha_inicio is not null and c.fecha_fin is not null and c.fecha_inicio<=c.fecha_fin and c.fecha_fin<=(now() at time zone 'America/Mexico_City')::date,
    'puede_cerrar',c.cerrado_en is null and enrolled>0 and missing_grades=0 and no_subjects=0 and inconsistent=0 and reviews=0 and c.fecha_inicio is not null and c.fecha_fin is not null and c.fecha_inicio<=c.fecha_fin and c.fecha_fin<=(now() at time zone 'America/Mexico_City')::date);
end $$;
