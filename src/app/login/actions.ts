'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { curpAEmail, esCurpValida } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const usuario = String(formData.get('curp') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect') ?? '');

  if (!usuario) return { error: 'Ingresa CURP o correo.' };
  if (!password) return { error: 'Ingresa tu contraseña.' };

  const parecEmail = usuario.includes('@');
  const email = parecEmail ? usuario.toLowerCase() : (esCurpValida(usuario) ? curpAEmail(usuario) : null);
  if (!email) return { error: 'CURP inválida o correo mal formado.' };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Usuario o contraseña incorrectos.' };

  // Leer rol con adminClient (bypass RLS, no depende de cookies recién set)
  let rol: string | null = null;
  try {
    const admin = adminClient();
    const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', data.user.id).maybeSingle();
    rol = (perfil as any)?.rol ?? null;
  } catch {
    // Fallback: client normal
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', data.user.id).maybeSingle();
    rol = perfil?.rol ?? null;
  }

  const destino = redirectTo
    || (rol === 'admin' || rol === 'staff' || rol === 'finanzas' ? '/admin'
        : rol === 'director' ? '/director'
        : rol === 'profesor' ? '/profesor'
        : rol === 'alumno' ? '/alumno'
        : '/admin');

  redirect(destino);
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
