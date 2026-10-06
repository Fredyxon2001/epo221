'use server';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';

// Reset universal de contraseña por admin para los 5 roles.
// Soporta: password aleatoria temporal o magic link al correo del usuario.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { baseUrl } from '@/lib/base-url';
import { temporaryPassword } from '@/lib/security/password';
import { requireUuid } from '@/lib/security/resources';


export async function adminResetPassword(fd: FormData): Promise<{ error?: string; ok?: boolean; temporal?: string }> {
  await requireAccess(["admin","staff","director"], "admin/usuarios/reset-actions.ts:adminResetPassword");
  await validateFormData(fd);

  const auth = (await createClient());
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!p || !['admin', 'staff', 'director'].includes(p.rol)) {
    return { error: 'No autorizado' };
  }

  const perfilId = String(fd.get('perfil_id') ?? '');
  requireUuid(perfilId);
  const modo = String(fd.get('modo') ?? 'temporal');
  if (!perfilId) return { error: 'Perfil inválido' };

  const sb = adminClient();

  if (modo === 'magic') {
    const { data: perfil } = await sb.from('perfiles').select('email').eq('id', perfilId).maybeSingle();
    if (!perfil?.email) return { error: 'El usuario no tiene email registrado' };
    const { error } = await auth.auth.resetPasswordForEmail(perfil.email, {
      redirectTo: `${baseUrl()}/auth/callback?next=/cambiar-password`,
    });
    if (error) return { error: error.message };
    revalidatePath('/admin/usuarios');
    return { ok: true };
  }

  const temporal = temporaryPassword();
  const { error: upErr } = await sb.auth.admin.updateUserById(perfilId, { password: temporal });
  if (upErr) return { error: upErr.message };

  await sb.from('perfiles').update({
    debe_cambiar_password: true,
    password_reset_at: new Date().toISOString(),
  }).eq('id', perfilId);
  const { error: revokeError } = await sb.rpc('security_revoke_user_sessions', { p_user_id: perfilId });
  if (revokeError) return { error: 'Clave actualizada; no se pudieron revocar las sesiones. Contacta al administrador.' };

  revalidatePath('/admin/usuarios');
  revalidatePath('/admin');
  return { ok: true, temporal };
}

export async function adminResetMfa(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const identity = await requireAccess(['admin'], 'admin/usuarios/reset-actions.ts:adminResetMfa');
  await validateFormData(fd);
  const userId = String(fd.get('perfil_id') ?? '');
  requireUuid(userId);
  const reference = String(fd.get('verification_reference') ?? '').trim();
  if (!/^[A-Za-z0-9/-]{6,80}$/.test(reference)) return { error:'Indica el folio de la verificación institucional de identidad.' };
  if (userId === identity.user.id) return { error:'Otro administrador debe realizar esta recuperación.' };
  const client = adminClient();
  const { data: factors, error } = await client.auth.admin.mfa.listFactors({userId});
  if (error) return {error:'No se pudieron consultar los factores.'};
  const { error: auditError } = await client.from('security_events').insert({actor_id:identity.user.id,event:'mfa_reset_requested',operation:'admin:mfa-recovery',metadata:{target_id:userId,verification_reference:reference}});
  if (auditError) return {error:'No se pudo registrar la recuperación.'};
  for (const factor of factors.factors) {
    const { error } = await client.auth.admin.mfa.deleteFactor({userId,id:factor.id});
    if (error) return {error:'La eliminación de factores no se completó. Revisa el incidente.'};
  }
  const { error: revoked } = await client.rpc('security_revoke_user_sessions',{p_user_id:userId});
  if (revoked) return {error:'No se pudieron revocar las sesiones; revisa el incidente.'};
  revalidatePath('/admin/usuarios');
  return {ok:true};
}
