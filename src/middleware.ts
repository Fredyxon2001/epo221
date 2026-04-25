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
    // Ya autenticado: redirigir a su panel según rol
    const { data: perfil } = await supabase
      .from('perfiles').select('rol').eq('id', user.id).single();
    const panel = perfil?.rol === 'admin' || perfil?.rol === 'staff' ? '/admin'
                : perfil?.rol === 'director' ? '/director'
                : perfil?.rol === 'profesor' ? '/profesor'
                : '/alumno';
    return NextResponse.redirect(new URL(panel, req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)'],
};
