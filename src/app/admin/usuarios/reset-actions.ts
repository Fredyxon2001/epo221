'use server';
// Reset universal de contraseña por admin para los 5 roles.
// Soporta: password aleatoria temporal o magic link al correo del usuario.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

function generarPasswordAleatoria(len = 12): string {
  // Caracteres legibles (sin 0/O, 1/I/l)
  const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let p = '';
  const bytes = new Uint8Array(len);
  (globalThis as any).crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) p += ch[bytes[i] % ch.length];
  return p.replace(/.$/, String(Math.floor(Math.random() * 10)));
}

export async function adminResetPassword(fd: FormData): Promise<{ error?: string; ok?: boolean; temporal?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!p || !['admin', 'staff', 'director'].includes(p.rol)) {
    return { error: 'No autorizado' };
  }

  const perfilId = String(fd.get('perfil_id') ?? '');
  const modo = String(fd.get('modo') ?? 'temporal');
  if (!perfilId) return { error: 'Perfil inválido' };

  const sb = adminClient();

  if (modo === 'magic') {
    const { data: perfil } = await sb.from('perfiles').select('email').eq('id', perfilId).maybeSingle();
    if (!perfil?.email) return { error: 'El usuario no tiene email registrado' };
    const { error } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email: perfil.email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/cambiar-password` },
    });
    if (error) return { error: error.message };
    revalidatePath('/admin/usuarios');
    return { ok: true };
  }

  const temporal = generarPasswordAleatoria(12);
  const { error: upErr } = await sb.auth.admin.updateUserById(perfilId, { password: temporal });
  if (upErr) return { error: upErr.message };

  await sb.from('perfiles').update({
    debe_cambiar_password: true,
    password_reset_at: new Date().toISOString(),
  }).eq('id', perfilId);

  revalidatePath('/admin/usuarios');
  revalidatePath('/admin');
  return { ok: true, temporal };
}
