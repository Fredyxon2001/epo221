'use server';
// Reset de contraseña por admin (para urgencias). Requiere rol admin/staff/director.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const TEMP_PASSWORD = 'EPO221!';

export async function adminResetPassword(fd: FormData): Promise<{ error?: string; ok?: boolean; temporal?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!p || !['admin', 'staff', 'director'].includes(p.rol)) {
    return { error: 'No autorizado' };
  }

  const perfilId = String(fd.get('perfil_id') ?? '');
  if (!perfilId) return { error: 'Perfil inválido' };

  const sb = adminClient();
  const { error: upErr } = await sb.auth.admin.updateUserById(perfilId, { password: TEMP_PASSWORD });
  if (upErr) return { error: upErr.message };

  await sb.from('perfiles').update({
    debe_cambiar_password: true,
    password_reset_at: new Date().toISOString(),
  }).eq('id', perfilId);

  revalidatePath('/admin');
  return { ok: true, temporal: TEMP_PASSWORD };
}
