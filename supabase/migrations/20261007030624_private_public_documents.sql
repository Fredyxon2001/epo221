-- New uploaded documents stay private until the application's authorization check.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('documentos-escolares','documentos-escolares',false,20971520,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
alter table public.documentos_publicos add column pdf_storage_path text;
alter table public.documentos_publicos add column docx_storage_path text;
alter table public.documentos_publicos add column publicado_en timestamptz;
update public.documentos_publicos set publicado_en=updated_at where publicada;
alter table public.documentos_publicos add constraint public_document_pdf_binding check(
  pdf_storage_path is null or (pdf_storage_path ~ ('^'||id::text||'/[0-9a-f-]{36}\.pdf$') and pdf_url='/api/public/documentos/'||id::text||'/pdf'));
alter table public.documentos_publicos add constraint public_document_docx_binding check(
  docx_storage_path is null or (docx_storage_path ~ ('^'||id::text||'/[0-9a-f-]{36}\.docx$') and docx_url='/api/public/documentos/'||id::text||'/docx'));
-- A publication permanently fixes the version and file identities. Withdraw from the
-- catalog with publicada=false; create a new record for a replacement version.
create function public.public_document_version_guard() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if tg_op='UPDATE' and old.publicado_en is not null then
    if row(new.pdf_url,new.docx_url,new.pdf_storage_path,new.docx_storage_path,new.version,new.ciclo_id)
       is distinct from row(old.pdf_url,old.docx_url,old.pdf_storage_path,old.docx_storage_path,old.version,old.ciclo_id) then
      raise exception 'Crea una nueva versión del documento publicado' using errcode='23514';
    end if;
    new.publicado_en:=old.publicado_en;
  elsif new.publicada then new.publicado_en:=now();
  else new.publicado_en:=null;
  end if;
  return new;
end $$;
revoke all on function public.public_document_version_guard() from public,anon,authenticated;
create trigger public_document_version_guard before insert or update on public.documentos_publicos for each row execute function public.public_document_version_guard();
