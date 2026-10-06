-- Administrative helpers remain unavailable to anon. Only authenticated policies call them.
do $$declare p record;begin
  for p in select tablename,policyname from pg_policies where schemaname='public' and roles::text[] && array['public','anon']
    and (coalesce(qual,'')||coalesce(with_check,'')) ~ '(es_admin|es_profesor|es_finanzas|security_)' and policyname<>'noticias_public_read'
  loop execute format('alter policy %I on public.%I to authenticated',p.policyname,p.tablename); end loop;
end $$;
alter policy noticias_public_read on public.noticias using(publicada and deleted_at is null);
grant select(updated_at) on public.noticias,public.albumes to anon,authenticated;
