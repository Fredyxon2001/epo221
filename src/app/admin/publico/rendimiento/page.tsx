import { requireIdentity } from '@/lib/security/access';
import { adminClient } from '@/lib/supabase/admin';
import { summarizeMetrics, type MetricAggregate } from '@/lib/performance/public-metrics';
import Link from 'next/link';

export default async function PerformancePage() {
  await requireIdentity();
  // SQL groups the 30-day window before the Data API limit (at most 774 rows).
  const { data, error } = await adminClient().rpc('read_public_metrics');
  const summary = error ? [] : summarizeMetrics((data ?? []) as MetricAggregate[]);
  return <main className="mx-auto max-w-6xl space-y-5 p-6">
    <Link href="/admin/publico" className="text-teal-800 underline">Volver al sitio público</Link>
    <h1 className="text-2xl font-semibold">Rendimiento público real</h1>
    <p>Últimos 30 días UTC, únicamente visitas públicas que autorizaron la medición. No representa a todos los visitantes ni a usuarios únicos. Cada documento aporta como máximo una muestra por métrica; no se registran navegaciones internas posteriores.</p>
    <p>El p75 es el límite superior aproximado del intervalo que contiene el percentil 75. El intervalo final incluye valores acotados y se muestra como «Más de», sin inventar un límite superior. Solo se muestran conteos y resultados con al menos 20 muestras por ruta, tipo de pantalla y métrica. No se almacenan mediciones individuales, cuentas ni expedientes.</p>
    <p>Referencias: LCP ≤2500 ms, INP ≤200 ms y CLS ≤0.1. Un resultado no certifica accesibilidad ni ausencia de fallos.</p>
    {error ? <p role="alert">La medición no está disponible. Comprueba la migración y el servicio; no se muestran ceros como si fueran resultados.</p>
      : summary.length === 0 ? <p>Aún no hay muestras autorizadas. La falta de datos no significa que el sitio cumpla las referencias.</p>
      : <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><caption className="sr-only">Métricas agregadas por ruta pública y pantalla</caption>
        <thead><tr>{['Ruta', 'Pantalla', 'Métrica', 'Muestras', 'p75 aproximado'].map(label => <th key={label} scope="col" className="border-b p-3">{label}</th>)}</tr></thead>
        <tbody>{summary.map(row => <tr key={`${row.route}:${row.device}:${row.metric}`}>
          <th scope="row" className="border-b p-3 font-normal">{row.route}</th><td className="border-b p-3">{row.device === 'mobile' ? 'Móvil' : 'Escritorio'}</td><td className="border-b p-3">{row.metric}</td>
          <td className="border-b p-3">{row.samples ?? 'Menos de 20'}</td><td className="border-b p-3">{row.p75Above !== null ? `Más de ${row.p75Above}${row.metric === 'CLS' ? '' : ' ms'} (intervalo final)` : row.p75UpperBound === null ? 'Muestra insuficiente' : `${row.p75UpperBound}${row.metric === 'CLS' ? '' : ' ms'}`}</td>
        </tr>)}</tbody></table></div>}
  </main>;
}
