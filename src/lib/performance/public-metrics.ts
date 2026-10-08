// Finite categories only: never accept arbitrary URLs, identifiers or DOM data.
export const PUBLIC_METRIC_ROUTES = ['/publico', '/publico/oferta', '/publico/guia', '/publico/convocatorias', '/publico/descargas', '/publico/noticias', '/publico/albumes', '/publico/conoce', '/publico/contacto'] as const;
export const METRIC_BUCKETS = {
  LCP: [0, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 30000, 60000],
  INP: [0, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2500, 5000, 10000],
  CLS: [0, .025, .05, .075, .1, .15, .2, .25, .35, .5, .75, 1, 2, 5],
} as const;
export type MetricName = keyof typeof METRIC_BUCKETS;
export type PublicMetricPayload = { route: string; device: 'mobile' | 'desktop'; samples: { name: MetricName; value: number }[] };
export const MIN_METRIC_SAMPLES = 20;
export function isPublicMetricRoute(route: string): boolean {
  return (PUBLIC_METRIC_ROUTES as readonly string[]).includes(route);
}
export function metricBucket(name: MetricName, value: number): number {
  return METRIC_BUCKETS[name].findIndex(bound => value <= bound);
}
export function parsePublicMetricPayload(input: unknown): PublicMetricPayload | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const p = input as Record<string, unknown>;
  if (Object.keys(p).sort().join(',') !== 'device,route,samples' || typeof p.route !== 'string' || !isPublicMetricRoute(p.route) ||
      typeof p.device !== 'string' || !['mobile', 'desktop'].includes(p.device) || !Array.isArray(p.samples) || p.samples.length < 1 || p.samples.length > 3) return null;
  const seen = new Set<string>();
  for (const sample of p.samples) {
    if (!sample || typeof sample !== 'object' || Array.isArray(sample) || Object.keys(sample).sort().join(',') !== 'name,value') return null;
    const { name, value } = sample;
    if (!['LCP', 'INP', 'CLS'].includes(name) || seen.has(name) || typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
        value > METRIC_BUCKETS[name as MetricName].at(-1)!) return null;
    seen.add(name);
  }
  return p as PublicMetricPayload;
}
export type MetricAggregate = { route: string; device: string; metric: MetricName; bucket: number; samples: number };
export function summarizeMetrics(rows: MetricAggregate[]) {
  const grouped = new Map<string, { route: string; device: string; metric: MetricName; counts: Map<number, number> }>();
  for (const row of rows) {
    const key = `${row.route}|${row.device}|${row.metric}`;
    const group = grouped.get(key) ?? { route: row.route, device: row.device, metric: row.metric, counts: new Map<number, number>() };
    group.counts.set(row.bucket, (group.counts.get(row.bucket) ?? 0) + row.samples);
    grouped.set(key, group);
  }
  return [...grouped.values()].map(group => {
    const samples = [...group.counts.values()].reduce((sum, n) => sum + n, 0);
    if (samples < MIN_METRIC_SAMPLES) return { route: group.route, device: group.device, metric: group.metric, samples: null, p75UpperBound: null, p75Above: null };
    let cumulative = 0, p75UpperBound: number | null = null, p75Above: number | null = null;
    for (const [bucket, count] of [...group.counts].sort(([a], [b]) => a - b)) {
      cumulative += count;
      if (cumulative >= Math.ceil(samples * .75)) {
        // The last bucket includes clamped outliers: it has no finite upper bound.
        if (bucket === METRIC_BUCKETS[group.metric].length - 1) p75Above = METRIC_BUCKETS[group.metric][bucket - 1];
        else p75UpperBound = METRIC_BUCKETS[group.metric][bucket] ?? null;
        break;
      }
    }
    return { route: group.route, device: group.device, metric: group.metric, samples, p75UpperBound, p75Above };
  });
}
