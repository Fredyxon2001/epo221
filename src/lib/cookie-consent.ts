export const CONSENT_COOKIE = 'epo221-cookie-consent';
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60;

export type CookieConsent = { version: number; external: boolean; savedAt: number };

export function parseConsent(value: string | undefined, now = Date.now()): CookieConsent | null {
  if (!value) return null;
  try {
    const data = JSON.parse(decodeURIComponent(value));
    if (data?.version !== CONSENT_VERSION || typeof data.external !== 'boolean' ||
        typeof data.savedAt !== 'number' || !Number.isFinite(data.savedAt) ||
        data.savedAt > now || now - data.savedAt >= CONSENT_MAX_AGE * 1000) return null;
    return { version: CONSENT_VERSION, external: data.external, savedAt: data.savedAt };
  } catch { return null; }
}

export function safeMapUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const hosts = ['www.google.com', 'maps.google.com', 'www.google.com.mx'];
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.port && hosts.includes(url.hostname) &&
      (url.pathname === '/maps/embed' || url.pathname.startsWith('/maps/embed/') ||
        ((url.pathname === '/maps' || url.pathname === '/maps/') && url.searchParams.get('output') === 'embed'))
      ? url.href : null;
  } catch { return null; }
}
