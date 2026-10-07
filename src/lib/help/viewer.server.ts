import 'server-only';
import { sessionIdentity } from '@/lib/security/access';
import { hasRole, PRIVILEGED_ROLES } from '@/lib/security/policy';
import type { HelpRole } from './catalog';

/** Minimal validated identity for an explicitly requested shared-page tour. */
export async function getHelpViewer(): Promise<{ id: string; role: HelpRole } | null> {
  const identity = await sessionIdentity();
  if (!identity || identity.profile.debe_cambiar_password
    || ((hasRole(identity.profile.rol, PRIVILEGED_ROLES) || identity.needsMfa) && identity.aal !== 'aal2')) return null;
  return { id: identity.user.id, role: identity.profile.rol as HelpRole };
}
