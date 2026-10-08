-- Anonymous aggregate counters only. No event rows, visitor IDs, IPs or URLs.
create table public.public_performance_daily (
  day date not null default ((now() at time zone 'UTC')::date),
  route text not null check (route in ('/publico','/publico/oferta','/publico/guia','/publico/convocatorias','/publico/descargas','/publico/noticias','/publico/albumes','/publico/conoce','/publico/contacto')),
  device text not null check (device in ('mobile','desktop')),
  metric text not null check (metric in ('LCP','INP','CLS')),
  bucket smallint not null check (bucket >= 0 and bucket <= case when metric='INP' then 14 else 13 end),
  samples bigint not null default 1 check (samples between 1 and 100000),
  primary key (day,route,device,metric,bucket)
);
alter table public.public_performance_daily enable row level security;
revoke all on table public.public_performance_daily from public,anon,authenticated;
grant select,insert,update,delete on table public.public_performance_daily to service_role;

create function public.purge_public_metrics() returns void language sql security invoker
set search_path=pg_catalog as $$
  delete from public.public_performance_daily where day < (now() at time zone 'UTC')::date - 29;
$$;
revoke all on function public.purge_public_metrics() from public,anon,authenticated;
grant execute on function public.purge_public_metrics() to service_role;

create function public.record_public_metrics(p_route text,p_device text,p_samples jsonb)
returns void language plpgsql security invoker set search_path=pg_catalog as $$
declare
  sample jsonb; metric_name text; metric_bucket smallint; seen text[] := array[]::text[];
begin
  if p_route is null or p_route not in ('/publico','/publico/oferta','/publico/guia','/publico/convocatorias','/publico/descargas','/publico/noticias','/publico/albumes','/publico/conoce','/publico/contacto')
    or p_device is null or p_device not in ('mobile','desktop') then raise exception 'Invalid category'; end if;
  if p_samples is null or jsonb_typeof(p_samples) <> 'array' then raise exception 'Invalid samples'; end if;
  if jsonb_array_length(p_samples) not between 1 and 3 then raise exception 'Invalid sample count'; end if;
  for sample in select value from jsonb_array_elements(p_samples) loop
    if jsonb_typeof(sample) <> 'object' then raise exception 'Invalid sample'; end if;
    if (select count(*) from jsonb_object_keys(sample)) <> 2 or not (sample ? 'name' and sample ? 'bucket') then raise exception 'Invalid sample keys'; end if;
    metric_name := sample->>'name';
    if metric_name is null or metric_name not in ('LCP','INP','CLS') or metric_name = any(seen)
      or jsonb_typeof(sample->'bucket') <> 'number' or (sample->>'bucket') !~ '^(?:[0-9]|1[0-4])$' then raise exception 'Invalid metric'; end if;
    metric_bucket := (sample->>'bucket')::smallint;
    if metric_bucket > (case when metric_name='INP' then 14 else 13 end) then raise exception 'Invalid bucket'; end if;
    seen := array_append(seen,metric_name);
    insert into public.public_performance_daily(day,route,device,metric,bucket,samples)
      values ((now() at time zone 'UTC')::date,p_route,p_device,metric_name,metric_bucket,1)
    on conflict (day,route,device,metric,bucket) do update
      set samples=least(public.public_performance_daily.samples+1,100000);
  end loop;
  perform public.purge_public_metrics();
end;
$$;
revoke all on function public.record_public_metrics(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_public_metrics(text,text,jsonb) to service_role;

create function public.read_public_metrics()
returns table(route text,device text,metric text,bucket smallint,samples bigint)
language sql stable security invoker set search_path=pg_catalog as $$
  select d.route,d.device,d.metric,d.bucket,sum(d.samples)::bigint
  from public.public_performance_daily d
  where day >= (now() at time zone 'UTC')::date - 29
  group by d.route,d.device,d.metric,d.bucket
  order by d.route,d.device,d.metric,d.bucket;
$$;
revoke all on function public.read_public_metrics() from public,anon,authenticated;
grant execute on function public.read_public_metrics() to service_role;
