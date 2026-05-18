// Middleware: refresca sesión de Supabase y protege rutas por rol.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  const zonasProtegidas = ['/alumno', '/profesor', '/admin', '/director', '/cambiar-password'];
  const requiereAuth = zonasProtegidas.some((p) => path.startsWith(p));

  if (requiereAuth && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  // Forzar cambio de contraseña si el flag está activo
  if (user && requiereAuth && path !== '/cambiar-password' && path !== '/logout') {
    const { data: perfilPwd } = await supabase
      .from('perfiles').select('debe_cambiar_password').eq('id', user.id).maybeSingle();
    if (perfilPwd?.debe_cambiar_password) {
      return NextResponse.redirect(new URL('/cambiar-password', req.url));
    }
  }

  if (user && path === '/login') {
    // Ya autenticado: redirigir a su panel según rol.
    // Usar fetch directo al REST API con service role para evitar problemas de RLS/cookies.
    let rol: string | null = null;
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/perfiles?id=eq.${user.id}&select=rol`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
        },
      );
      const data = await r.json();
      rol = data?.[0]?.rol ?? null;
    } catch {}
    // Fallback: si no se pudo leer, intentar con el client supabase normal
    if (!rol) {
      const { data: perfil } = await supabase
        .from('perfiles').select('rol').eq('id', user.id).maybeSingle();
      rol = perfil?.rol ?? null;
    }
    const panel = rol === 'admin' || rol === 'staff' || rol === 'finanzas' ? '/admin'
                : rol === 'director' ? '/director'
                : rol === 'profesor' ? '/profesor'
                : rol === 'alumno' ? '/alumno'
                : '/admin'; // si no se pudo determinar, prueba con admin (no romper login)
    return NextResponse.redirect(new URL(panel, req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)'],
};
