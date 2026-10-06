import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { randomBytes } from 'node:crypto';
import { authCookieOptions } from '@/lib/supabase/cookie-options';
import { contentSecurityPolicy } from '@/lib/security/csp';
import { hasRole, PRIVILEGED_ROLES, panelForRole } from '@/lib/security/policy';

export async function proxy(req: NextRequest) {
  const nonce = randomBytes(18).toString('base64');
  const csp = contentSecurityPolicy(nonce, process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NODE_ENV !== 'production');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  requestHeaders.set('x-pathname', req.nextUrl.pathname);
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  let res = next();
  const finish = (response: NextResponse) => {
    response.headers.set('Content-Security-Policy', csp);
    if (process.env.NODE_ENV === 'production') response.headers.set('Strict-Transport-Security', 'max-age=31536000');
    return response;
  };
  const go = (path: string) => {
    const response = NextResponse.redirect(new URL(path, req.url));
    res.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
    response.headers.set('Cache-Control', 'private, no-store');
    return finish(response);
  };
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        const prior = res.cookies.getAll();
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        requestHeaders.set('cookie', req.cookies.toString());
        res = next();
        prior.forEach(cookie => res.cookies.set(cookie));
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        res.headers.set('Cache-Control', 'private, no-store');
      },
    },
  });
  const { data: { user } } = await client.auth.getUser();
  const path = req.nextUrl.pathname;
  const protectedPage = /^\/(alumno|profesor|admin|director|perfil|seguridad|cambiar-password)(\/|$)/.test(path);
  if (protectedPage || user || /^\/(api|login|recuperar|auth)(\/|$)/.test(path) || res.cookies.getAll().length) res.headers.set('Cache-Control', 'private, no-store');
  if (protectedPage && !user) return go(`/login?redirect=${encodeURIComponent(path)}`);
  if (user && (protectedPage || path === '/login')) {
    const { data: profile } = await client.from('perfiles').select('rol,debe_cambiar_password').eq('id', user.id).maybeSingle();
    const { data: alive, error: sessionError } = await client.rpc('security_session_alive');
    if (sessionError || !alive) { await client.auth.signOut(); return go('/login?error=sesion'); }
    if (!profile || !['alumno','profesor','admin','staff','director','finanzas'].includes(profile.rol)) {
      if (path === '/login') return finish(res);
      return go('/login?error=perfil');
    }
    const { data: assurance } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsMfa = hasRole(profile.rol, PRIVILEGED_ROLES) || assurance?.nextLevel === 'aal2';
    const mfaDestination = `/seguridad?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    if (path !== '/seguridad' && assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') return go(mfaDestination);
    if (profile.debe_cambiar_password && !['/cambiar-password','/seguridad'].includes(path)) return go('/cambiar-password');
    if (!profile.debe_cambiar_password && needsMfa && assurance?.currentLevel !== 'aal2' && !['/seguridad','/cambiar-password'].includes(path)) return go(mfaDestination);
    const allowed = path.startsWith('/admin') ? ['admin','staff','director','finanzas'] : path.startsWith('/director') ? ['director','admin'] : path.startsWith('/profesor') ? ['profesor','admin','staff','director'] : path.startsWith('/alumno') ? ['alumno'] : null;
    if (allowed && !hasRole(profile.rol, allowed)) return go(panelForRole(profile.rol));
    if (profile.rol === 'finanzas' && path.startsWith('/admin') && !/^\/admin(?:$|\/(pagos|conceptos|extraordinarios|perfil|pendientes)(\/|$)|\/alumnos$)/.test(path)) return go('/admin');
    if (path === '/login') return go(panelForRole(profile.rol));
  }
  return finish(res);
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|woff2?)$).*)'] };
