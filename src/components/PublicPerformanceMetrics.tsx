'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { readBrowserConsent } from '@/lib/cookie-consent';
import { isPublicMetricRoute, METRIC_BUCKETS, type MetricName } from '@/lib/performance/public-metrics';

// web-vitals has no unsubscribe API. Retired generations never inspect metrics,
// keep data or send; its internal public timing observers end at document unload.
export function PublicPerformanceMetrics({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const documentRoute = useRef(pathname);
  const navigated = useRef(false);
  const collected = useRef(new Set<MetricName>());
  useEffect(() => {
    if (pathname !== documentRoute.current) navigated.current = true;
    if (!enabled || navigated.current || !pathname || !isPublicMetricRoute(pathname) || location.search) return;
    let active = true;
    const device = innerWidth < 768 ? 'mobile' : 'desktop';
    const requests = new Set<AbortController>();
    const stop = () => { active = false; requests.forEach(request => request.abort()); requests.clear(); };
    const authorized = () => active && !navigated.current && location.pathname === pathname && !location.search && readBrowserConsent()?.analytics === true;
    const changed = () => { if (!authorized()) stop(); };
    window.addEventListener('epo:consent-changed', stop);
    window.addEventListener('popstate', changed);
    window.addEventListener('focus', changed);
    void import('web-vitals').then(({ onLCP, onINP, onCLS }) => {
      if (!authorized()) return;
      const report = (metric: { name: string; value: number }) => {
        if (!authorized()) { stop(); return; }
        const name = metric.name as MetricName;
        if (!Object.hasOwn(METRIC_BUCKETS, name) || collected.current.has(name) || !Number.isFinite(metric.value) || metric.value < 0) return;
        collected.current.add(name);
        // Never read metric.id, entries, attribution, navigationURL or DOM nodes.
        const value = Math.min(metric.value, METRIC_BUCKETS[name].at(-1)!);
        const request = new AbortController(); requests.add(request);
        void fetch('/api/public/metricas', {
          method: 'POST', credentials: 'same-origin', keepalive: true, signal: request.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ route: pathname, device, samples: [{ name, value: Math.round(value * 10000) / 10000 }] }),
        }).catch(() => {}).finally(() => requests.delete(request));
      };
      onLCP(report); onINP(report); onCLS(report);
    }).catch(() => {});
    return () => {
      stop(); window.removeEventListener('epo:consent-changed', stop);
      window.removeEventListener('popstate', changed); window.removeEventListener('focus', changed);
    };
  }, [enabled, pathname]);
  return null;
}
