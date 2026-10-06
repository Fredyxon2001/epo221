-- Finance inbox uses the caller's JWT. Read scope does not grant direct writes.
create policy finance_read_cargos on public.cargos
for select to authenticated
using (
  public.security_session_valid()
  and exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'finanzas' and p.activo)
);
create policy finance_read_pagos on public.pagos
for select to authenticated
using (
  public.security_session_valid()
  and exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'finanzas' and p.activo)
);
