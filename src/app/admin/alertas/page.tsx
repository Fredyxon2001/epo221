// Centro de alertas automáticas: revisa el ciclo activo y lista anomalías.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/privado/ui';
import { construirAlertas, nivelStyle } from '@/lib/alertas';

export default async function AlertasPage() {
  const supabase = createClient();
  const alertas = await construirAlertas(supabase);

  const porNivel = {
    danger: alertas.filter((a) => a.nivel === 'danger').length,
    warning: alertas.filter((a) => a.nivel === 'warning').length,
    info: alertas.filter((a) => a.nivel === 'info').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operación"
        title="Alertas automáticas"
        description="El sistema revisa el ciclo activo y detecta anomalías que requieren atención."
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-rose-600 font-semibold">Críticas</div>
          <div className="font-serif text-3xl text-rose-700 mt-1">{porNivel.danger}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-amber-600 font-semibold">Advertencias</div>
          <div className="font-serif text-3xl text-amber-700 mt-1">{porNivel.warning}</div>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-sky-600 font-semibold">Informativas</div>
          <div className="font-serif text-3xl text-sky-700 mt-1">{porNivel.info}</div>
        </div>
      </div>

      <Card eyebrow="Detalle" title={alertas.length ? `${alertas.length} alertas` : 'Todo en orden'}>
        {alertas.length === 0 ? (
          <EmptyState icon="✅" title="Sin alertas" description="No se detectaron anomalías en el ciclo activo." />
        ) : (
          <div className="space-y-3">
            {alertas.map((a, i) => {
              const s = nivelStyle[a.nivel];
              return (
                <div key={i} className={`rounded-xl border ${s.border} ${s.bg} p-4 flex items-start gap-3`}>
                  <div className="text-2xl shrink-0">{s.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${s.text}`}>{a.titulo}</div>
                    <div className="text-sm text-gray-700 mt-0.5">{a.descripcion}</div>
                    {a.url && (
                      <Link href={a.url} className="inline-block mt-2 text-xs font-semibold text-verde hover:underline">
                        Ir a resolver →
                      </Link>
                    )}
                  </div>
                  <Badge tone={a.nivel === 'danger' ? 'rosa' : a.nivel === 'warning' ? 'dorado' : 'azul'} size="sm">
                    {a.nivel}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
