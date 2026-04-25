-- ============================================================
-- Buckets de Supabase Storage + políticas
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- Buckets (todos privados; acceso vía signed URL)
insert into storage.buckets (id, name, public) values
  ('comprobantes', 'comprobantes', false),   -- comprobantes de pago
  ('expedientes',  'expedientes',  false),   -- documentos del alumno (acta, CURP, etc.)
  ('exports',      'exports',      false),   -- CSVs generados
  ('fotos',        'fotos',        true),    -- fotos de perfil (públicas)
  ('noticias',     'noticias',     true)     -- imágenes de noticias
on conflict (id) do nothing;

-- ── Políticas de comprobantes ───────────────────────────────
-- Alumno sube en su carpeta {alumno_id}/...
create policy "alumno sube comprobante"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1]::uuid = (
      select id from public.alumnos where perfil_id = auth.uid()
    )
  );

create policy "alumno lee su comprobante"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (
      (storage.foldername(name))[1]::uuid = (select id from public.alumnos where perfil_id = auth.uid())
      or public.es_admin()
    )
  );

-- ── Expedientes: solo admin sube y lee ──────────────────────
create policy "admin gestiona expedientes"
  on storage.objects for all to authenticated
  using (bucket_id = 'expedientes' and public.es_admin())
  with check (bucket_id = 'expedientes' and public.es_admin());

create policy "alumno lee su expediente"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'expedientes'
    and (storage.foldername(name))[1]::uuid = (select id from public.alumnos where perfil_id = auth.uid())
  );

-- ── Exports: profesor y admin ───────────────────────────────
create policy "profes y admin usan exports"
  on storage.objects for all to authenticated
  using (bucket_id = 'exports' and (public.es_admin() or public.es_profesor()))
  with check (bucket_id = 'exports' and (public.es_admin() or public.es_profesor()));

-- ── Fotos y noticias: lectura pública, escritura admin ──────
create policy "fotos lectura publica"
  on storage.objects for select using (bucket_id in ('fotos','noticias'));

create policy "admin sube fotos y noticias"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('fotos','noticias') and public.es_admin());

create policy "admin actualiza fotos y noticias"
  on storage.objects for update to authenticated
  using (bucket_id in ('fotos','noticias') and public.es_admin());
