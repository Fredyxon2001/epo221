import { headers } from 'next/headers';

/** Dominio de producción; último recurso si no hay cabeceras ni variable. */
const DOMINIO_PRODUCCION = 'https://epo221.edu.mx';

/**
 * URL base del sitio para armar enlaces absolutos (por ejemplo, el destino de
 * los correos de recuperación de contraseña).
 *
 * Se deriva de las cabeceras del propio request en lugar de depender solo de
 * `NEXT_PUBLIC_APP_URL`: si esa variable quedaba sin configurar o apuntando a
 * `http://localhost:3000`, el enlace del correo llevaba al usuario a una
 * dirección inexistente y no había forma de notarlo hasta que alguien lo
 * reportaba. Vercel siempre envía `x-forwarded-host`, así que el enlace apunta
 * al dominio por el que realmente entró el usuario.
 */
export function baseUrl(): string {
  try {
    const h = headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // headers() no está disponible fuera de un request (p. ej. en un cron).
  }
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env && !env.includes('localhost')) return env.replace(/\/+$/, '');
  return DOMINIO_PRODUCCION;
}
