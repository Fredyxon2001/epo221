export const CONSENT_COOKIE = 'epo221-cookie-consent';
export const CONSENT_VERSION = 2;
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60;

export type CookieConsent = { version: number; external: boolean; analytics: boolean; savedAt: number };

export function parseConsent(value: string | undefined, now = Date.now()): CookieConsent | null {
  if (!value) return null;
  try {
    const data = JSON.parse(decodeURIComponent(value));
    // Version 1 only authorized Maps. Preserve that choice without extending it.
    if (![1, CONSENT_VERSION].includes(data?.version) || typeof data.external !== 'boolean' ||
        (data.version === CONSENT_VERSION && typeof data.analytics !== 'boolean') ||
        typeof data.savedAt !== 'number' || !Number.isFinite(data.savedAt) ||
        data.savedAt > now || now - data.savedAt >= CONSENT_MAX_AGE * 1000) return null;
    return { version: data.version, external: data.external, analytics: data.version === CONSENT_VERSION && data.analytics === true, savedAt: data.savedAt };
  } catch { return null; }
}

export function readBrowserConsent(): CookieConsent | null {
  try {
    return parseConsent(document.cookie.split('; ').find(item => item.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1));
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
