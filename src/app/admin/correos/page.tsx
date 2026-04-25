import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';

const ESTADO_STYLE: Record<string, string> = {
  enviado: 'bg-verde-claro/40 text-verde-oscuro',
  error: 'bg-rose-100 text-rose-700',
  skipped: 'bg-gray-100 text-gray-600',
};

export default async function CorreosLogPage() {
  const supabase = createClient();
  const { data: logs } = await supabase
    .from('correo_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const dist: Record<string, number> = { enviado: 0, error: 0, skipped: 0 };
  for (const l of logs ?? []) dist[(l as any).estado] = (dist[(l as any).estado] ?? 0) + 1;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Notificaciones"
        title="📧 Bitácora de correos"
        description="Resumen de envíos automáticos a tutores. Configura RESEND_API_KEY y CORREO_REMITENTE en Vercel para activar entrega."
      />

      <div className="grid grid-cols-3 gap-3">
        {(['enviado', 'error', 'skipped'] as const).map((e) => (
          <Card key={e}>
            <div className="text-xs text-gray-500 uppercase">{e}</div>
            <div className="text-3xl font-bold text-verde-oscuro tabular-nums">{dist[e] ?? 0}</div>
          </Card>
        ))}
      </div>

      <Card eyebrow="Últimos 200 envíos" title="Bitácora">
        {(logs ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Aún no hay correos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-2 py-1">Fecha</th>
                  <th className="px-2 py-1">Tipo</th>
                  <th className="px-2 py-1">Destinatario</th>
                  <th className="px-2 py-1">Asunto</th>
                  <th className="px-2 py-1">Estado</th>
                  <th className="px-2 py-1">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs!.map((l: any) => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString('es-MX')}</td>
                    <td className="px-2 py-1">{l.tipo}</td>
                    <td className="px-2 py-1 max-w-[200px] truncate">{l.destinatario}</td>
                    <td className="px-2 py-1 max-w-[260px] truncate">{l.asunto ?? '—'}</td>
                    <td className="px-2 py-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${ESTADO_STYLE[l.estado] ?? 'bg-gray-100'}`}>{l.estado}</span>
                    </td>
                    <td className="px-2 py-1 max-w-[260px] truncate text-rose-700">{l.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
