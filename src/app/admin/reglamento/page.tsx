import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { crearVersion, marcarVigente } from './actions';

export default async function ReglamentoAdmin() {
  const supabase = createClient();
  const { data: versiones } = await supabase
    .from('reglamento_versiones')
    .select('*')
    .order('publicado_at', { ascending: false });

  const vigente = (versiones ?? []).find((v: any) => v.vigente);

  let firmas: any[] = [];
  if (vigente) {
    const { data } = await supabase
      .from('reglamento_firmas')
      .select('firmado_at, firmante:perfiles(nombre, email, rol)')
      .eq('reglamento_id', vigente.id)
      .order('firmado_at', { ascending: false });
    firmas = data ?? [];
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sistema · Cumplimiento"
        title="📜 Reglamento institucional"
        description="Publica versiones del reglamento. Alumnos/personal lo firman digitalmente desde su panel."
      />

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold">➕ Publicar nueva versión</summary>
          <form action={crearVersion} className="mt-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <input name="version" required placeholder="Versión (ej. 2026.1)" className="border rounded px-2 py-1.5" />
              <input name="titulo" required placeholder="Título" className="border rounded px-2 py-1.5" />
            </div>
            <textarea name="contenido_md" required rows={10} className="w-full border rounded px-2 py-1.5 font-mono text-xs"
              placeholder="Contenido en Markdown…&#10;&#10;## 1. Asistencia&#10;...&#10;&#10;## 2. Conducta&#10;..." />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="vigente" defaultChecked /> Marcar como vigente (reemplaza la anterior)
            </label>
            <button className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-3 py-1.5 rounded text-sm">Publicar versión</button>
          </form>
        </details>
      </Card>

      <Card>
        <h2 className="font-semibold text-sm mb-3">Versiones publicadas</h2>
        {!versiones?.length ? (
          <EmptyState icon="📜" title="Sin versiones" description="Publica la primera." />
        ) : (
          <ul className="space-y-2">
            {versiones.map((v: any) => (
              <li key={v.id} className={`border rounded p-3 flex justify-between items-center gap-3 ${v.vigente ? 'bg-verde-claro/10 border-verde' : ''}`}>
                <div>
                  <div className="font-semibold">{v.titulo} <span className="text-xs text-gray-500">v{v.version}</span></div>
                  <div className="text-xs text-gray-500">Publicado: {new Date(v.publicado_at).toLocaleString('es-MX')}</div>
                </div>
                <div className="flex gap-2 items-center">
                  {v.vigente && <Badge tone="verde" size="sm">VIGENTE</Badge>}
                  {!v.vigente && (
                    <form action={marcarVigente}>
                      <input type="hidden" name="id" value={v.id} />
                      <button className="text-xs bg-verde-oscuro text-white px-3 py-1 rounded">Marcar vigente</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {vigente && (
        <Card>
          <h2 className="font-semibold text-sm mb-3">✍️ Firmas de la versión vigente ({firmas.length})</h2>
          {!firmas.length ? (
            <div className="text-xs text-gray-500">Aún no hay firmas.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase border-b">
                <tr><th className="text-left p-2">Nombre</th><th className="text-left p-2">Rol</th><th className="text-left p-2">Email</th><th className="text-left p-2">Firmado</th></tr>
              </thead>
              <tbody>
                {firmas.map((f: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{f.firmante?.nombre ?? '—'}</td>
                    <td className="p-2 text-xs"><Badge tone="verde" size="sm">{f.firmante?.rol}</Badge></td>
                    <td className="p-2 text-xs">{f.firmante?.email}</td>
                    <td className="p-2 text-xs text-gray-500">{new Date(f.firmado_at).toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
