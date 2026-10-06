'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { curpAEmail, esCurpValida } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { panelForRole, safeRedirect, hasRole, PRIVILEGED_ROLES } from '@/lib/security/policy';
import { rateLimit } from '@/lib/security/rate-limit';
import { validateFormData } from '@/lib/security/form-data';

export async function loginAction(formData: FormData) {
  await validateFormData(formData);
  const usuario = String(formData.get('curp') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect') ?? '');

  if (!usuario) return { error: 'Ingresa tu correo institucional.' };
  if (!password) return { error: 'Ingresa tu contraseña.' };

  // Se acepta el correo institucional. La CURP se sigue admitiendo como respaldo
  // para cuentas antiguas que aún no conocen su correo.
  const parecEmail = usuario.includes('@');
  const email = parecEmail ? usuario.toLowerCase() : (esCurpValida(usuario) ? curpAEmail(usuario) : null);
  if (!email) return { error: 'Correo mal formado. Usa nombre.apellido@epo221.edu.mx' };
  try {
    if (!await rateLimit('login-ip', 20, 900) || !await rateLimit('login-account', 8, 900, email)) return { error: 'Demasiados intentos. Intenta nuevamente en 15 minutos.' };
  } catch { return { error: 'Acceso temporalmente no disponible. Intenta más tarde.' }; }

  const supabase = (await createClient());
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Usuario o contraseña incorrectos.' };

  // Leer rol con adminClient (bypass RLS, no depende de cookies recién set)
  let rol: string | null = null;
  try {
    const admin = adminClient();
    const { data: perfil } = await admin.from('perfiles').select('rol,activo').eq('id', data.user.id).maybeSingle();
    if (!perfil?.activo) {
      await supabase.auth.signOut();
      return { error: 'Tu cuenta requiere revisión de Control Escolar.' };
    }
    rol = (perfil as any)?.rol ?? null;
  } catch {
    // Fallback: client normal
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', data.user.id).maybeSingle();
    rol = perfil?.rol ?? null;
  }

  const { data: flags } = await adminClient().from('perfiles').select('debe_cambiar_password').eq('id', data.user.id).maybeSingle();
  if (!rol || !['admin','staff','finanzas','director','profesor','alumno'].includes(rol)) {
    await supabase.auth.signOut();
    return { error: 'Tu cuenta requiere revisión de Control Escolar.' };
  }
  if (flags?.debe_cambiar_password) redirect('/cambiar-password');
  const destination = safeRedirect(redirectTo, panelForRole(rol));
  if (hasRole(rol, PRIVILEGED_ROLES)) redirect(`/seguridad?next=${encodeURIComponent(destination)}`);
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') redirect(`/seguridad?next=${encodeURIComponent(destination)}`);
  redirect(destination);
}

export async function logoutAction() {
  const supabase = (await createClient());
  await supabase.auth.signOut();
  redirect('/');
}
