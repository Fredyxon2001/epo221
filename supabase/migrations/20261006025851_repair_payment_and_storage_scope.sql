-- Financial writes are atomic and restricted to guarded server actions.
create function public.security_payment_submit(p_actor_id uuid,p_cargo_id uuid,p_method text,p_reference text,p_path text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_cargo public.cargos; v_student uuid; v_id uuid;
begin
  select id into v_student from public.alumnos where perfil_id=p_actor_id;
  select * into v_cargo from public.cargos where id=p_cargo_id for update;
  if v_student is null or v_cargo.id is null or v_cargo.alumno_id<>v_student then raise exception 'Cargo no disponible.'; end if;
  if v_cargo.estatus not in ('pendiente','vencido') then raise exception 'Este cargo ya está pagado o en revisión.'; end if;
  if p_method not in ('transferencia','ventanilla','efectivo') or length(p_reference)>200 then raise exception 'Datos del pago inválidos.'; end if;
  if not exists(select 1 from storage.objects where bucket_id='comprobantes' and name=p_path)
    or split_part(p_path,'/',1)<>v_student::text then raise exception 'No se recibió el comprobante.'; end if;
  insert into public.pagos(cargo_id,alumno_id,monto_pagado,metodo,referencia,fecha_pago,comprobante_url,subido_por)
    values(v_cargo.id,v_student,v_cargo.monto,p_method,nullif(btrim(p_reference),''),current_date,p_path,p_actor_id) returning id into v_id;
  update public.cargos set estatus='en_revision' where id=v_cargo.id;
  return v_id;
end $$;

create function public.security_payment_review(p_actor_id uuid,p_pago_id uuid,p_cargo_id uuid,p_approve boolean,p_reason text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_payment public.pagos; v_cargo public.cargos; v_paid numeric;
begin
  if not exists(select 1 from public.perfiles where id=p_actor_id and activo and rol in ('admin','staff','director','finanzas'))
    then raise exception 'No autorizado.'; end if;
  select cargo_id into v_payment.cargo_id from public.pagos where id=p_pago_id;
  if v_payment.cargo_id is null or v_payment.cargo_id<>p_cargo_id then raise exception 'El pago no corresponde al cargo.'; end if;
  select * into v_cargo from public.cargos where id=p_cargo_id for update;
  select * into v_payment from public.pagos where id=p_pago_id for update;
  if v_payment.validado_en is not null then raise exception 'El pago ya fue validado.'; end if;
  if not p_approve and (p_reason is null or length(btrim(p_reason))<3 or length(p_reason)>500)
    then raise exception 'Indica el motivo del rechazo.'; end if;
  if p_approve then
    if v_payment.comprobante_url is null then raise exception 'El pago no tiene comprobante.'; end if;
    update public.pagos set validado_por=p_actor_id,validado_en=now(),rechazado_motivo=null,
      folio_recibo='R-'||extract(year from now())::text||'-'||upper(left(replace(gen_random_uuid()::text,'-',''),12)) where id=v_payment.id;
  else
    update public.pagos set rechazado_motivo=btrim(p_reason),validado_por=null,validado_en=null where id=v_payment.id;
  end if;
  select coalesce(sum(monto_pagado),0) into v_paid from public.pagos where cargo_id=v_cargo.id and validado_en is not null;
  update public.cargos set estatus=case when v_paid>=v_cargo.monto then 'pagado' else 'pendiente' end where id=v_cargo.id;
end $$;
revoke all on function public.security_payment_submit(uuid,uuid,text,text,text),public.security_payment_review(uuid,uuid,uuid,boolean,text)
  from public,anon,authenticated;
grant execute on function public.security_payment_submit(uuid,uuid,text,text,text),public.security_payment_review(uuid,uuid,uuid,boolean,text) to service_role;
revoke insert,update,delete on public.pagos,public.cargos from authenticated;

-- Restrict attachments to the owner or the actual class/counselor relationship.
create function public.security_storage_resource_scope(p_bucket text,p_name text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select case
    when p_bucket not in ('tareas','portafolio','chat-grupal') then true
    when public.es_admin() then true
    when p_bucket='tareas' then exists(
      select 1 from public.entregas_tarea e join public.alumnos al on al.id=e.alumno_id
      where e.archivo_url=p_name and al.perfil_id=auth.uid()
    ) or exists(
      select 1 from public.tareas t join public.asignaciones a on a.id=t.asignacion_id
      join public.profesores p on p.id=a.profesor_id
      where t.id::text=split_part(p_name,'/',1) and p.perfil_id=auth.uid()
    )
    when p_bucket='portafolio' then exists(select 1 from public.alumnos al
      where al.id::text=split_part(p_name,'/',1) and public.security_can_read_student(al.id))
    when p_bucket='chat-grupal' then exists(select 1 from public.asignaciones a
      where a.id::text=split_part(p_name,'/',1) and public.security_can_read_assignment(a.id))
    else false end;
$$;
revoke all on function public.security_storage_resource_scope(text,text) from public,anon;
grant execute on function public.security_storage_resource_scope(text,text) to authenticated,service_role;
create policy security_storage_resource_gate on storage.objects as restrictive for select to authenticated
  using(public.security_storage_resource_scope(bucket_id,name));
