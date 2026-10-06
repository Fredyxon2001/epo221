export const ADMIN_ROLES = ['admin', 'staff', 'director'] as const;
export const FINANCE_ROLES = [...ADMIN_ROLES, 'finanzas'] as const;
export const PRIVILEGED_ROLES = FINANCE_ROLES;
export type Role = 'admin' | 'staff' | 'director' | 'finanzas' | 'profesor' | 'alumno';

export function hasRole(role: string | null | undefined, allowed: readonly string[]) {
  return !!role && allowed.includes(role);
}
export function safeRedirect(value: string, fallback: string) {
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://local.invalid');
    return url.origin === 'https://local.invalid' && /^\/(alumno|profesor|admin|director|perfil|seguridad|cambiar-password)(\/|$)/.test(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}
export function panelForRole(role: string | null | undefined) {
  return hasRole(role, ['admin', 'staff', 'finanzas']) ? '/admin'
    : role === 'director' ? '/director' : role === 'profesor' ? '/profesor'
    : role === 'alumno' ? '/alumno' : '/login?error=perfil';
}
export function sameOrigin(origin: string | null, expected: string) {
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(expected).origin; } catch { return false; }
}
