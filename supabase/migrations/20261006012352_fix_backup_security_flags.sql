create or replace function public.security_backup_snapshot() returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare t record; rows jsonb; data jsonb:='{}'; cols jsonb:='{}'; begin
  for t in select tablename from pg_tables where schemaname='public' and tablename not in
    ('security_rate_limits','security_events','imports_credenciales','push_webhook_config','push_subscriptions') order by tablename
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(row)),''[]''::jsonb) from public.%I row',t.tablename) into rows;
    data:=data||jsonb_build_object(t.tablename,rows);
    select jsonb_agg(jsonb_build_object('name',column_name,'type',udt_schema||'.'||udt_name,'nullable',is_nullable,'default',column_default) order by ordinal_position) into rows
      from information_schema.columns where table_schema='public' and table_name=t.tablename;
    cols:=cols||jsonb_build_object(t.tablename,rows);
  end loop;
  return jsonb_build_object('version',1,'created_at',now(),'data',data,'columns',cols,
    'storage',(select coalesce(jsonb_agg(jsonb_build_object('bucket_id',bucket_id,'name',name,'size',coalesce(metadata->>'size','0'))),'[]'::jsonb) from storage.objects where bucket_id<>'security-backups'),
    'buckets',(select coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) from storage.buckets b where id<>'security-backups'));
end $$;
