export function contentSecurityPolicy(nonce: string, supabaseOrigin: string, development = false) {
  const origin = new URL(supabaseOrigin).origin;
  const websocket = origin.replace('https:', 'wss:');
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${origin}`,
    "font-src 'self' data:",
    `connect-src 'self' ${origin} ${websocket}${development ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    "frame-src https://www.google.com https://maps.google.com",
    `media-src 'self' blob: ${origin}`,
    "worker-src 'self' blob:",
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ...(!development ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}
