// Recovery links never trust a client supplied Host or forwarded header.

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
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (process.env.NODE_ENV !== 'production' || (url.protocol === 'https:' && ['epo221.edu.mx', 'www.epo221.edu.mx'].includes(url.hostname))) return url.origin;
    } catch { /* Use the institutional domain. */ }
  }
  return process.env.NODE_ENV === 'production' ? DOMINIO_PRODUCCION : 'http://localhost:3000';
}
