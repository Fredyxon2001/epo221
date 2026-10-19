/** Application budgets; not platform limits. Unknown failures never prove revocation. */
export const AUTH_FETCH_TIMEOUT_MS = 10_000;
export const PROXY_ACCESS_TIMEOUT_MS = 8_000;
export function invalidSessionError(error: unknown, status?: number, authService = true): boolean {
  const value = error && typeof error === 'object' ? error as { status?: number; code?: string; name?: string } : {};
  const code = status ?? value.status;
  if (code === 402 || code === 429 || (typeof code === 'number' && code >= 500)) return false;
  // Database403 may only mean a missing grant; it cannot prove Auth revocation.
  return code === 401 || (authService && code === 403) || ['bad_jwt', 'session_not_found', 'session_expired', 'refresh_token_not_found', 'refresh_token_already_used', 'user_not_found'].includes(value.code ?? '');
}
export async function authBeforeDeadline<T>(work: (signal: AbortSignal) => Promise<T>, milliseconds: number, parent?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let reject: (error: TypeError) => void = () => {};
  const stopped = new Promise<never>((_, fail) => { reject = fail; });
  const cancel = () => { controller.abort(); reject(new TypeError('No se pudo verificar el acceso temporalmente.')); };
  if (parent?.aborted) cancel(); else parent?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, milliseconds);
  try { return await Promise.race([Promise.resolve().then(() => { if (controller.signal.aborted) throw new TypeError('Comprobación cancelada.'); return work(controller.signal); }), stopped]); }
  finally { clearTimeout(timer); parent?.removeEventListener('abort', cancel); }
}
/** Only the configured Auth service's quota/rate statuses become retryable for auth-js. */
export function resilientAuthFetch(supabaseUrl: string, fetcher: typeof fetch = fetch, parent?: AbortSignal, milliseconds = AUTH_FETCH_TIMEOUT_MS): typeof fetch {
  let auth: URL | undefined;
  try { const base = new URL(supabaseUrl.replace(/\/+$/, '') + '/'); if (['http:', 'https:'].includes(base.protocol) && !base.username && !base.password && !base.search && !base.hash) auth = new URL('auth/v1/', base); } catch { /* Invalid scope cannot transform another service. */ }
  return (input, init) => {
    let scoped = false;
    try { const target = new URL(input instanceof Request ? input.url : String(input)); scoped = !!auth && !target.username && !target.password && target.origin === auth.origin && target.pathname.startsWith(auth.pathname); } catch { /* Fetch reports invalid input. */ }
    // Other clients keep their original Storage/PostgREST timing and caller signal.
    if (!scoped && !parent) return fetcher(input, init);
    const caller = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    const sources = [caller, parent].filter((value): value is AbortSignal => !!value);
    for (const source of sources) { if (source.aborted) cancel(); else source.addEventListener('abort', cancel, { once: true }); }
    return authBeforeDeadline(async requestSignal => {
      const response = await fetcher(input, { ...init, signal: requestSignal });
      if (requestSignal.aborted || (scoped && (response.status === 402 || response.status === 429))) {
        void response.body?.cancel().catch(() => {});
        throw new TypeError('El servicio de acceso no está disponible temporalmente.');
      }
      // Keep cancellation/deadline active through Auth JSON (or proxy read) bodies,
      // retaining the original Response and headers for the SDK. Other DB/Storage
      // consumers bypass this wrapper above.
      if (response.body) await response.clone().arrayBuffer();
      if (requestSignal.aborted) throw new TypeError('Comprobación cancelada.');
      return response;
    }, milliseconds, controller.signal).finally(() => { for (const source of sources) source.removeEventListener('abort', cancel); });
  };
}
