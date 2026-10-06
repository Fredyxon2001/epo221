'use server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';
import { baseUrl } from '@/lib/base-url';
import { validateFormData } from '@/lib/security/form-data';

export async function recuperarPassword(data: FormData): Promise<{ error?: string; ok?: boolean }> {
  await validateFormData(data);
  const email = String(data.get('email') ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Ingresa un correo válido.' };
  try {
    if (!await rateLimit('recovery-ip', 5, 900) || !await rateLimit('recovery-account', 3, 3600, email)) return { error: 'Demasiadas solicitudes. Intenta más tarde.' };
    const client = await createClient();
    // Always return the same outcome to avoid disclosing whether an account exists.
    await client.auth.resetPasswordForEmail(email, { redirectTo: `${baseUrl()}/auth/callback?next=/cambiar-password` });
    return { ok: true };
  } catch { return { error: 'Servicio temporalmente no disponible. Intenta más tarde.' }; }
}
