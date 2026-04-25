import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const accionBadge: Record<string, string> = {
  insert: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
};

export default async function AdminAuditoria({
  searchParams,
}: {
  searchParams: { tabla?: string; accion?: string; page?: string };
}) {
  const supabase = createClient();
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('auditoria')
    .select('id, tabla, accion, registro_id, cambios, created_at, usuario_id, perfil:perfiles(nombre,email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (searchParams.tabla)  q = q.eq('tabla', searchParams.tabla);
  if (searchParams.accion) q = q.eq('accion', searchParams.accion);

  const { data: logs, count } = await q;

  // Lista de tablas únicas (consulta separada para que no dependa del filtro)
  const { data: tablasRows } = await supabase.rpc('tablas_auditoria_distintas').then(
    (r) => r,
    () => ({ data: null as any }),
  );
  const tablasUnicas: string[] =
    (tablasRows as any[] | null)?.map((r) => r.tabla) ??
    Array.from(new Set((logs ?? []).map((l: any) => l.tabla))).sort();

  const total = count ?? 0;
  const totalPaginas = Math.ceil(total / pageSize);

  const build = (overrides: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const m: Record<string, any> = {
      tabla:  searchParams.tabla,
      accion: searchParams.accion,
      page:   page > 1 ? page : undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/admin/auditoria${s ? `?${s}` : ''}`;
  };

  return (
    <div className="max-w-6xl space-y-4">
      <div>
        <h1 className="font-serif text-3xl text-verde">Auditoría</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registro de todos los cambios en tablas críticas. {total.toLocaleString('es-MX')} eventos.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-2 text-sm">
        <a
          href="/admin/auditoria"
          className={`px-3 py-1 rounded-full text-xs font-medium ${!searchParams.tabla && !searchParams.accion ? 'bg-verde text-white' : 'bg-gray-50 border hover:bg-gray-100'}`}
        >
          Todos
        </a>
        {tablasUnicas.map((t) => (
          <a
            key={t}
            href={build({ tabla: t, page: undefined })}
            className={`px-3 py-1 rounded-full text-xs font-medium ${searchParams.tabla === t ? 'bg-verde text-white' : 'bg-gray-50 border hover:bg-gray-100'}`}
          >
            {t}
          </a>
        ))}
        <span className="w-px bg-gray-200 mx-2" />
        {['insert', 'update', 'delete'].map((op) => (
          <a
            key={op}
            href={build({ accion: op, page: undefined })}
            className={`px-3 py-1 rounded-full text-xs font-medium ${searchParams.accion === op ? 'bg-verde text-white' : accionBadge[op]}`}
          >
            {op.toUpperCase()}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600 border-b">
            <tr>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Tabla</th>
              <th className="text-left p-3">Op</th>
              <th className="text-left p-3">Registro</th>
              <th className="text-left p-3">Usuario</th>
              <th className="text-left p-3">Cambios</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l: any) => (
              <tr key={l.id} className="border-t hover:bg-gray-50 align-top">
                <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString('es-MX')}
                </td>
                <td className="p-3 font-mono text-xs">{l.tabla}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${accionBadge[l.accion] ?? 'bg-gray-100'}`}>
                    {(l.accion ?? '').toUpperCase()}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs text-gray-600">{l.registro_id ?? '—'}</td>
                <td className="p-3 text-xs text-gray-600">
                  {l.perfil?.nombre ?? l.perfil?.email ?? '—'}
                </td>
                <td className="p-3">
                  <details>
                    <summary className="text-xs text-verde cursor-pointer hover:underline">Ver diff</summary>
                    <pre className="mt-2 p-2 bg-gray-900 text-green-300 text-[11px] rounded overflow-auto max-w-md max-h-60">
                      {JSON.stringify(l.cambios, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400 text-sm">
                Sin registros todavía.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Página {page} de {totalPaginas}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={build({ page: page - 1 })} className="px-3 py-1 border rounded hover:bg-gray-50">← Anterior</Link>
            )}
            {page < totalPaginas && (
              <Link href={build({ page: page + 1 })} className="px-3 py-1 border rounded hover:bg-gray-50">Siguiente →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
