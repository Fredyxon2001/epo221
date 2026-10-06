import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { ADMIN_ROLES, PRIVILEGED_ROLES, hasRole } from './policy';
import { rateLimit } from './rate-limit';

export const sessionIdentity = cache(async () => {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data: profile } = await adminClient().from('perfiles')
    .select('rol, activo, debe_cambiar_password, password_reset_at').eq('id', user.id).maybeSingle();
  if (!profile || !profile.activo || !['admin','staff','director','finanzas','profesor','alumno'].includes(profile.rol)) return null;
  const { data: alive, error: sessionError } = await client.rpc('security_session_alive');
  if (sessionError || !alive) return null;
  const { data: assurance, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  return { user, profile, client, aal: error ? null : assurance?.currentLevel, needsMfa: assurance?.nextLevel === 'aal2' };
});

export async function requireIdentity(allowed: readonly string[] | null = ADMIN_ROLES) {
  const identity = await sessionIdentity();
  if (!identity) redirect('/login');
  if (allowed && !hasRole(identity.profile.rol, allowed)) throw new Error('No autorizado');
  if (identity.profile.debe_cambiar_password) redirect('/cambiar-password');
  if ((hasRole(identity.profile.rol, PRIVILEGED_ROLES) || identity.needsMfa) && identity.aal !== 'aal2') redirect('/seguridad');
  return identity;
}
export async function requireAccess(allowed: readonly string[] | null = ADMIN_ROLES, operation = 'server-action') {
  const identity = await requireIdentity(allowed);
  if (!await rateLimit('authenticated-action', 120, 60, identity.user.id)) throw new Error('Demasiadas solicitudes. Intenta más tarde.');
  if (hasRole(identity.profile.rol, PRIVILEGED_ROLES)) {
    const { error } = await adminClient().from('security_events').insert({
      actor_id: identity.user.id, event: 'access_granted', operation: operation.slice(0, 200),
    });
    if (error) throw new Error('No se pudo registrar el acceso de seguridad.');
  }
  return identity;
}
