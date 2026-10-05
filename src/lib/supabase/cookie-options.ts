// Compartir atributos evita que navegador, servidor y middleware discrepen.
// Supabase SSR necesita leer sus tokens en el navegador: no usar HttpOnly
// sin migrar primero la autenticación y Realtime a una arquitectura de servidor.
export const authCookieOptions = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  httpOnly: false,
};
