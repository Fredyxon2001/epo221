import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { randomBytes } from 'node:crypto';
import { authCookieOptions } from '@/lib/supabase/cookie-options';
import { authBeforeDeadline, invalidSessionError, PROXY_ACCESS_TIMEOUT_MS, resilientAuthFetch } from '@/lib/supabase/auth-resilience';
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
  const path = req.nextUrl.pathname;
  // The dedicated logout handler validates origin and retires only local project cookies.
  // It must remain reachable during an Auth outage; no other mutation bypasses checks.
  if (path === '/api/logout' && req.method === 'POST') { res.headers.set('Cache-Control', 'private, no-store'); return finish(res); }
  const protectedPage = /^\/(alumno|profesor|admin|director|perfil|seguridad|cambiar-password)(\/|$)/.test(path);
  let active = true;
  const unavailable = () => {
    const response = new NextResponse("<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Acceso temporalmente no disponible | EPO 221</title></head><body><main><h1>No pudimos verificar tu acceso</h1><p>El servicio no está disponible temporalmente. Conservamos tu sesión; puedes volver a intentar cuando se recupere.</p><p><a href=\"\">Reintentar</a></p><form method=\"post\" action=\"/api/logout\"><button type=\"submit\">Cerrar sesión en este navegador</button></form></main></body></html>", { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'Retry-After': '30' } });
    res.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
    return finish(response);
  };
  try { return await authBeforeDeadline(async signal => {
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookieOptions: authCookieOptions,
      global: { fetch: resilientAuthFetch(process.env.NEXT_PUBLIC_SUPABASE_URL!, fetch, signal) },
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          if (!active || signal.aborted) return;
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
    const checked = () => { if (!active || signal.aborted) throw new TypeError('Comprobación cancelada.'); };
    const retire = () => {
      checked();
      // Only this project's default Auth token/chunks; preserve consent and other sessions.
      const key = 'sb-' + new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0] + '-auth-token';
      const cookies = [...req.cookies.getAll(), ...res.cookies.getAll()];
      for (const cookie of cookies) if (cookie.name === key || (cookie.name.startsWith(key + '.') && /^\d+$/.test(cookie.name.slice(key.length + 1)))) {
        req.cookies.delete(cookie.name);
        res.cookies.set(cookie.name, '', { ...authCookieOptions, maxAge: 0 });
      }
      requestHeaders.set('cookie', req.cookies.toString());
      const retiredCookies = res.cookies.getAll();
      res = next();
      retiredCookies.forEach(cookie => res.cookies.set(cookie));
      res.headers.set('Cache-Control', 'private, no-store');
    };
    const { data: { user }, error: authError } = await client.auth.getUser();
    checked();
    if (protectedPage || user || /^\/(api|login|recuperar|auth)(\/|$)/.test(path) || res.cookies.getAll().length) res.headers.set('Cache-Control', 'private, no-store');
    if (authError && authError.name !== 'AuthSessionMissingError') {
      if (invalidSessionError(authError)) { retire(); if (protectedPage || path === '/login') return go('/login?error=sesion'); }
      else if (protectedPage || path === '/login') return unavailable();
      else return finish(res);
    }
    if (protectedPage && !user) return go('/login?redirect=' + encodeURIComponent(path));
    if (user && (protectedPage || path === '/login')) {
      const { data: profile, error: profileError, status: profileStatus } = await client.from('perfiles').select('rol,debe_cambiar_password').eq('id', user.id).maybeSingle();
      checked();
      if (profileError) { if (invalidSessionError(profileError, profileStatus, false)) { retire(); return go('/login?error=sesion'); } return unavailable(); }
      const { data: alive, error: sessionError, status: sessionStatus } = await client.rpc('security_session_alive');
      checked();
      if (sessionError) { if (invalidSessionError(sessionError, sessionStatus, false)) { retire(); return go('/login?error=sesion'); } return unavailable(); }
      if (alive === false) { retire(); return go('/login?error=sesion'); }
      if (alive !== true) return unavailable();
      if (!profile || !['alumno','profesor','admin','staff','director','finanzas'].includes(profile.rol)) {
        if (path === '/login') return finish(res);
        return go('/login?error=perfil');
      }
      const { data: assurance, error: mfaError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      checked();
      if (mfaError) { if (invalidSessionError(mfaError)) { retire(); return go('/login?error=sesion'); } return unavailable(); }
      if (!assurance) return unavailable();
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
  }, PROXY_ACCESS_TIMEOUT_MS, req.signal); } catch { return protectedPage || path === '/login' ? unavailable() : finish(res); }
  finally { active = false; }
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|woff2?)$).*)'] };
