'use server';
// Cambio de contraseña por el usuario autenticado (flujo forzado o voluntario).
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';
import { passwordError } from '@/lib/security/password';
import { panelForRole, hasRole, PRIVILEGED_ROLES } from '@/lib/security/policy';
import { rateLimit } from '@/lib/security/rate-limit';
import { sessionIdentity } from '@/lib/security/access';

export async function cambiarPassword(fd: FormData): Promise<{ error?: string }> {
  const nueva = String(fd.get('nueva') ?? '');
  const confirma = String(fd.get('confirma') ?? '');
  const invalid = passwordError(nueva);
  if (invalid) return { error: invalid };
  if (nueva !== confirma) return { error: 'Las contraseñas no coinciden' };

  const identity = await sessionIdentity();
  if (!identity) return { error: 'Sesión expirada. Vuelve a iniciar sesión.' };
  const { client: supabase, user } = identity;
  if (!await rateLimit('password-change', 5, 900, user.id)) return { error: 'Demasiados intentos. Intenta más tarde.' };
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') redirect('/seguridad?next=cambiar-password');

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: error.message };

  const { error: flagError } = await adminClient().from('perfiles')
    .update({ debe_cambiar_password: false, password_reset_at: new Date().toISOString() })
    .eq('id', user.id);
  if (flagError) return { error: 'Contraseña actualizada. No se pudo actualizar el estado de la cuenta; contacta a Control Escolar.' };
  const { error: signoutError } = await supabase.auth.signOut({ scope: 'others' });
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (signoutError || refreshError) { await supabase.auth.signOut(); redirect('/login?error=sesion'); }

  // Redirigir a su panel
  const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  redirect(hasRole(p?.rol, PRIVILEGED_ROLES) ? '/seguridad' : panelForRole(p?.rol ?? ''));
}
