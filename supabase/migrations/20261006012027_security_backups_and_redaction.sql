create function public.security_redact_jsonb(value jsonb) returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare result jsonb; begin
  if jsonb_typeof(value)='object' then
    select coalesce(jsonb_object_agg(key, public.security_redact_jsonb(val)), '{}'::jsonb) into result
    from jsonb_each(value) as entry(key,val) where key !~* '(password|token|secret|cookie|credential|credencial|authorization|service_role)';
  elsif jsonb_typeof(value)='array' then
    select coalesce(jsonb_agg(public.security_redact_jsonb(val)), '[]'::jsonb) into result from jsonb_array_elements(value) as entry(val);
  else result:=value; end if;
  return result;
end $$;
revoke all on function public.security_redact_jsonb(jsonb) from public,anon,authenticated;
grant execute on function public.security_redact_jsonb(jsonb) to service_role;
create or replace function public.fn_audit_trigger() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); actor_email text; before_row jsonb; after_row jsonb; begin
  select email into actor_email from auth.users where id=actor;
  before_row:=public.security_redact_jsonb(to_jsonb(old)); after_row:=public.security_redact_jsonb(to_jsonb(new));
  insert into public.audit_log(tabla,operacion,registro_id,diff,actor_id,actor_email)
    values(tg_table_name,tg_op,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id'),
      case tg_op when 'INSERT' then jsonb_build_object('after',after_row) when 'DELETE' then jsonb_build_object('before',before_row) else jsonb_build_object('before',before_row,'after',after_row) end,actor,actor_email);
  return coalesce(new,old);
end $$;
create or replace function public.fn_auditoria_trigger() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.auditoria(usuario_id,tabla,registro_id,accion,cambios)
    values(auth.uid(),tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id'),lower(tg_op),
      public.security_redact_jsonb(case tg_op when 'INSERT' then jsonb_build_object('after',to_jsonb(new)) when 'DELETE' then jsonb_build_object('before',to_jsonb(old)) else jsonb_build_object('before',to_jsonb(old),'after',to_jsonb(new)) end));
  return coalesce(new,old);
end $$;
revoke all on function public.fn_audit_trigger(),public.fn_auditoria_trigger() from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('security-backups','security-backups',false,52428800,array['application/octet-stream'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create function public.security_backup_snapshot() returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare t record; rows jsonb; data jsonb:='{}'; cols jsonb:='{}'; begin
  for t in select tablename from pg_tables where schemaname='public' and tablename not in
    ('security_rate_limits','security_events','imports_credenciales','push_webhook_config','push_subscriptions') order by tablename
  loop
    execute format('select coalesce(jsonb_agg(public.security_redact_jsonb(to_jsonb(row))),''[]''::jsonb) from public.%I row',t.tablename) into rows;
    data:=data||jsonb_build_object(t.tablename,rows);
    select jsonb_agg(jsonb_build_object('name',column_name,'type',udt_schema||'.'||udt_name,'nullable',is_nullable,'default',column_default) order by ordinal_position) into rows
      from information_schema.columns where table_schema='public' and table_name=t.tablename;
    cols:=cols||jsonb_build_object(t.tablename,rows);
  end loop;
  return jsonb_build_object('version',1,'created_at',now(),'data',data,'columns',cols,
    'storage',(select coalesce(jsonb_agg(jsonb_build_object('bucket_id',bucket_id,'name',name,'size',coalesce(metadata->>'size','0'))),'[]'::jsonb) from storage.objects where bucket_id<>'security-backups'),
    'buckets',(select coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) from storage.buckets b where id<>'security-backups'));
end $$;
revoke all on function public.security_backup_snapshot() from public,anon,authenticated;
grant execute on function public.security_backup_snapshot() to service_role;
create function public.security_backup_validate(p_snapshot jsonb) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare entry record; actual bigint; expected bigint; total bigint:=0; tables integer:=0; begin
  if p_snapshot->>'version'<>'1' or jsonb_typeof(p_snapshot->'data')<>'object' then raise exception 'Invalid snapshot'; end if;
  for entry in select key,value from jsonb_each(p_snapshot->'data') loop
    if entry.key !~ '^[a-z_]+$' or not exists(select 1 from pg_tables where schemaname='public' and tablename=entry.key) then raise exception 'Invalid snapshot table'; end if;
    execute format('create temp table security_restore_check (like public.%I including constraints) on commit drop',entry.key);
    execute format('insert into pg_temp.security_restore_check select * from jsonb_populate_recordset(null::public.%I,$1)',entry.key) using entry.value;
    select count(*) into actual from pg_temp.security_restore_check;
    expected:=jsonb_array_length(entry.value);
    if actual<>expected then raise exception 'Snapshot count mismatch'; end if;
    total:=total+actual; tables:=tables+1;
    drop table pg_temp.security_restore_check;
  end loop;
  return jsonb_build_object('ok',true,'tables',tables,'rows',total);
end $$;
revoke all on function public.security_backup_validate(jsonb) from public,anon,authenticated;
grant execute on function public.security_backup_validate(jsonb) to service_role;

-- Reject active content in uploads; existing objects remain untouched.
update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'] where id in ('avatares','fotos','noticias');
update storage.buckets set file_size_limit=20971520,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','application/pdf'] where id='publico';
update storage.buckets set file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'] where id='comprobantes';
update storage.buckets set file_size_limit=coalesce(file_size_limit,52428800),allowed_mime_types=array[
 'image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','text/csv','application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation',
 'application/zip','application/x-zip-compressed','application/octet-stream','video/mp4','video/webm','audio/mpeg','audio/wav','audio/ogg']
 where id in ('expedientes','exports','mensajes','solicitudes','tareas','portafolio','chat-grupal','planeaciones');
update storage.buckets set allowed_mime_types=array['application/vnd.android.package-archive','application/octet-stream'] where id='app-movil';
