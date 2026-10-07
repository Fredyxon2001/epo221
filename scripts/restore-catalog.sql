-- Read-only schema metadata for the encrypted application restore rehearsal.
-- Save the result as ignored security-backups/restore-catalog.json before an outage.
-- Does NOT export Auth credentials, RLS, functions, triggers or infrastructure.
select jsonb_build_object(
  'enums', (select coalesce(jsonb_agg(e),'[]') from (
    select n.nspname as schema,t.typname as name,jsonb_agg(x.enumlabel order by x.enumsortorder) as labels
    from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum x on x.enumtypid=t.oid
    where n.nspname='public' group by n.nspname,t.typname
  ) e),
  'tables', (select jsonb_agg(j) from (
    select c.relname as name,
      (select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
        'nullable',not a.attnotnull,'generated',a.attgenerated,'identity',a.attidentity,
        'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum)
       from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
       where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) as columns,
      (select coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'kind',k.contype,
        'def',pg_get_constraintdef(k.oid,true),
        'auth',case when k.contype='f' and k.confrelid='auth.users'::regclass then
          (select jsonb_agg(a.attname order by u.ord) from unnest(k.conkey) with ordinality u(num,ord)
           join pg_attribute a on a.attrelid=c.oid and a.attnum=u.num)
          else '[]'::jsonb end)),'[]') from pg_constraint k where k.conrelid=c.oid) as constraints
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' order by c.relname
  ) j)
) as catalog;
