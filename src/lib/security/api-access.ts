import 'server-only';
import { NextResponse } from 'next/server';
import { sessionIdentity } from './access';
import { PRIVILEGED_ROLES, hasRole, sameOrigin } from './policy';
import { rateLimit } from './rate-limit';

export async function apiAccess(req: Request, roles: readonly string[] | null = null) {
  const identity = await sessionIdentity();
  if (!identity) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
  if (roles && !hasRole(identity.profile.rol, roles)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  if (identity.profile.debe_cambiar_password || ((hasRole(identity.profile.rol, PRIVILEGED_ROLES) || identity.needsMfa) && identity.aal !== 'aal2')) {
    return NextResponse.json({ error: 'Completa el cambio de contraseña y la verificación de seguridad' }, { status: 403 });
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !sameOrigin(req.headers.get('origin'), req.url)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
  }
  try {
    if (!await rateLimit('api', 120, 60, identity.user.id)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  } catch { return NextResponse.json({ error: 'Control de seguridad no disponible' }, { status: 503 }); }
  return null;
}
