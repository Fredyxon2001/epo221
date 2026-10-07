-- Public documents are versioned independently of the internal active-cycle switch.
create table public.documentos_publicos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check(length(titulo) between 1 and 200),
  descripcion text not null default '' check(length(descripcion)<=2000),
  audiencia text not null check(audiencia in ('inscripcion','reinscripcion','general')),
  ciclo_id uuid references public.ciclos_escolares(id),
  version text not null check(length(version) between 1 and 100),
  vigente boolean not null default false,
  publicada boolean not null default false,
  pdf_url text not null default '' check(length(pdf_url)<=2000),
  docx_url text not null default '' check(length(docx_url)<=2000),
  updated_at timestamptz not null default now(),
  constraint public_document_has_file check(pdf_url<>'' or docx_url<>''),
  constraint public_document_current_cycle check(not vigente or ciclo_id is not null)
);
alter table public.documentos_publicos enable row level security;
revoke all on public.documentos_publicos from anon,authenticated;
grant select on public.documentos_publicos to anon,authenticated;
grant insert,update,delete on public.documentos_publicos to authenticated;
create policy public_document_read on public.documentos_publicos for select to anon,authenticated using(publicada);
create policy public_document_admin on public.documentos_publicos for all to authenticated
  using(public.es_admin() and public.security_session_valid())
  with check(public.es_admin() and public.security_session_valid());
create index public_documents_published_cycle on public.documentos_publicos(ciclo_id,updated_at desc) where publicada;
create trigger public_document_touch before update on public.documentos_publicos for each row execute function public.touch_updated_at();
create trigger public_document_audit after insert or update or delete on public.documentos_publicos for each row execute function public.fn_audit_trigger();
-- Retain the existing upload limit and image/PDF MIME list; add only DOCX.
update storage.buckets set allowed_mime_types=array_append(allowed_mime_types,'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
where id='publico' and allowed_mime_types is not null and not ('application/vnd.openxmlformats-officedocument.wordprocessingml.document'=any(allowed_mime_types));
-- Existing files keep their original content and are explicitly historical.
insert into public.documentos_publicos(titulo,descripcion,audiencia,version,vigente,publicada,pdf_url,docx_url) values
('Solicitud de inscripción','Formato histórico. Confirma su uso con Control Escolar antes de entregarlo.','inscripcion','Archivo anterior a octubre de 2026',false,true,'/descargas/solicitud-inscripcion.pdf','/descargas/solicitud-inscripcion.docx'),
('Solicitud de reinscripción','Formato histórico. Confirma su uso con Control Escolar antes de entregarlo.','reinscripcion','Archivo anterior a octubre de 2026',false,true,'/descargas/solicitud-reinscripcion.pdf','/descargas/solicitud-reinscripcion.docx'),
('Reglamento escolar','Documento histórico. Consulta la versión aplicable con Control Escolar.','general','Archivo anterior a octubre de 2026',false,true,'/descargas/reglamento-escolar.pdf','/descargas/reglamento-escolar.docx'),
('Carta compromiso','Formato histórico. Confirma su uso con Control Escolar antes de entregarlo.','general','Archivo anterior a octubre de 2026',false,true,'/descargas/carta-compromiso.pdf','/descargas/carta-compromiso.docx');
-- Orientation only: no invented dates, amounts, eligibility or mandatory documents.
-- Do not overwrite a guide already prepared by the school.
insert into public.guias_escolares(ciclo_id,ciclo_label,titulo,requisitos,fechas,preguntas,publicada)
select id,codigo,'Orientación escolar · '||codigo,
$guide$1. Revisa las convocatorias publicadas en el sitio para identificar el trámite que te corresponde.
2. Consulta Descargas y comprueba el ciclo, la versión y la vigencia antes de llenar un formato. Los archivos históricos sirven como referencia y requieren confirmación en Control Escolar.
3. Confirma con Control Escolar los documentos, las firmas y la forma de entrega que corresponden a tu caso. No entregues documentos personales mediante enlaces o cuentas no confirmados por la escuela.
4. Si ya tienes cuenta, consulta tus avisos, calendario y pendientes dentro del sistema o de la app móvil.$guide$,
$guide$Las fechas, el proceso de admisión y los requisitos específicos deben estar publicados por la escuela en una convocatoria o confirmarse con Control Escolar. Esta orientación no anuncia inscripciones abiertas ni establece montos, cupos o fechas.
Consulta Convocatorias y Contacto para obtener información vigente. Si no hay una convocatoria vigente, confirma el siguiente proceso con la escuela antes de realizar un trámite.$guide$,
$guide$¿Cómo sé qué formato debo usar?
Comprueba el ciclo y la versión en Descargas. Si aparece como histórico, confirma su uso con Control Escolar.

¿Dónde reviso fechas y requisitos de ingreso?
En Convocatorias y en la guía publicada para el ciclo. Si no están publicados, pregunta a Control Escolar desde los medios de Contacto.

¿Necesito una cuenta para consultar el sitio público?
No. Oferta, noticias, convocatorias, guía y descargas son públicas. Tus calificaciones, tareas y mensajes requieren iniciar sesión.

¿Cómo ingreso al sistema o a la app?
Utiliza la cuenta entregada por la escuela. Cambia la contraseña inicial cuando se solicite y completa la verificación de seguridad si corresponde. Si no tienes acceso, solicita ayuda a Control Escolar; no compartas tu contraseña.

¿La app y el sitio muestran la misma guía?
Sí, consultan las guías escolares publicadas por la escuela. La guía de uso dentro del sistema explica las funciones habilitadas para tu rol.$guide$,true
from public.ciclos_escolares where activo on conflict(ciclo_id) do nothing;
