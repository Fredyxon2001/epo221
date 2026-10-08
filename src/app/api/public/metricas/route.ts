import { type NextRequest } from 'next/server';
import { CONSENT_COOKIE, CONSENT_VERSION, parseConsent } from '@/lib/cookie-consent';
import { sameOrigin } from '@/lib/security/policy';
import { rateLimit } from '@/lib/security/rate-limit';
import { adminClient } from '@/lib/supabase/admin';
import { metricBucket, parsePublicMetricPayload } from '@/lib/performance/public-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const response = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers.get('origin'), req.url) ||
      (req.headers.get('sec-fetch-site') && req.headers.get('sec-fetch-site') !== 'same-origin')) return response(403);
  const consent = parseConsent(req.cookies.get(CONSENT_COOKIE)?.value);
  if (consent?.version !== CONSENT_VERSION || !consent.analytics) return response(403);
  if (!/^application\/json(?:\s*;.*)?$/i.test(req.headers.get('content-type') ?? '')) return response(415);
  const length = req.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > 1024)) return response(413);
  if (!req.body) return response(400);
  // Do not rely on Content-Length: reject oversized chunked bodies too.
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 1024) { await reader.cancel(); return response(413); }
      chunks.push(part.value);
    }
  } catch { return response(400); }
  finally { reader.releaseLock(); }
  let payload;
  try { payload = parsePublicMetricPayload(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { return response(400); }
  if (!payload) return response(400);
  try {
    // Distributed global budget; no IP, visitor hash or account identifier stored.
    if (!await rateLimit('public-metrics-global', 1200, 60, 'all-visitors')) return response(429);
    const { error } = await adminClient().rpc('record_public_metrics', {
      p_route: payload.route, p_device: payload.device,
      p_samples: payload.samples.map(sample => ({ name: sample.name, bucket: metricBucket(sample.name, sample.value) })),
    });
    return response(error ? 503 : 204);
  } catch { return response(503); }
}
