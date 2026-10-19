import 'server-only';

type Cookie = { name: string; value: string };
/** Match the default shared SSR cookie key; never clear unrelated browser state. */
function sessionKey(supabaseUrl: string) {
  return 'sb-' + new URL(supabaseUrl).hostname.split('.')[0] + '-auth-token';
}
export function localLogoutCookieNames(cookies: Cookie[], supabaseUrl: string): string[] {
  const key = sessionKey(supabaseUrl);
  return [...new Set([key, ...cookies.filter(cookie => cookie.name.startsWith(key + '.') && /^\d+$/.test(cookie.name.slice(key.length + 1))).map(cookie => cookie.name)])];
}
function existingAccessToken(cookies: Cookie[], supabaseUrl: string): string | null {
  try {
    const key = sessionKey(supabaseUrl), single = cookies.find(cookie => cookie.name === key);
    const chunks = cookies.filter(cookie => cookie.name.startsWith(key + '.') && /^\d+$/.test(cookie.name.slice(key.length + 1))).sort((a, b) => Number(a.name.slice(key.length + 1)) - Number(b.name.slice(key.length + 1)));
    if (!single && (chunks.length > 64 || chunks.some((cookie, index) => cookie.name !== key + '.' + index))) return null;
    let encoded = single?.value ?? '';
    if (encoded.length > 100000) return null;
    let bytes = Buffer.byteLength(encoded, 'utf8');
    if (bytes > 100000) return null;
    if (!single) for (const chunk of chunks) {
      if (chunk.value.length > 100000 - encoded.length) return null;
      const chunkBytes = Buffer.byteLength(chunk.value, 'utf8');
      if (chunkBytes > 100000 - bytes) return null;
      bytes += chunkBytes;
      encoded += chunk.value;
    }
    if (!encoded) return null;
    const raw = encoded.startsWith('base64-') ? Buffer.from(encoded.slice(7), 'base64url').toString('utf8') : encoded;
    const token = JSON.parse(raw)?.access_token;
    return typeof token === 'string' && token.length <= 10000 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) ? token : null;
  } catch { return null; }
}
/** Best effort only: local deletion never requires identity, refresh or remote availability. */
export async function bestEffortRemoteLogout(cookies: Cookie[], supabaseUrl: string, anonKey: string, options: { fetcher?: typeof fetch; milliseconds?: number; signal?: AbortSignal } = {}): Promise<void> {
  const token = existingAccessToken(cookies, supabaseUrl);
  if (!token || !anonKey || options.signal?.aborted) return;
  let endpoint: URL;
  try {
    const base = new URL(supabaseUrl.replace(/\/+$/, '') + '/');
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) return;
    endpoint = new URL('auth/v1/logout?scope=global', base);
  } catch { return; }
  const controller = new AbortController();
  let stop: () => void = () => {};
  const stopped = new Promise<void>(resolve => { stop = () => { controller.abort(); resolve(); }; });
  options.signal?.addEventListener('abort', stop, { once: true });
  if (options.signal?.aborted) stop();
  const timer = setTimeout(stop, options.milliseconds ?? 2000);
  try {
    const remote = Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      const response = await (options.fetcher ?? fetch)(endpoint.href, { method: 'POST', redirect: 'error', headers: { apikey: anonKey, Authorization: 'Bearer ' + token }, signal: controller.signal });
      void response.body?.cancel().catch(() => {});
    });
    await Promise.race([remote, stopped]);
  } catch { /* A rejected/revoked/expired token or outage cannot prevent local logout. */ }
  finally { clearTimeout(timer); controller.abort(); options.signal?.removeEventListener('abort', stop); }
}
