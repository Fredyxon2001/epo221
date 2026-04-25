'use server';

import { createClient } from '@/lib/supabase/server';
import { curpAEmail, esCurpValida } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const usuario = String(formData.get('curp') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect') ?? '');

  if (!usuario) return { error: 'Ingresa CURP o correo.' };
  if (!password) return { error: 'Ingresa tu contraseña.' };

  // Si parece email, úsalo directo (admin/profesor).
  // Si no, tratarlo como CURP (alumno) y convertir a email sintético.
  const parecEmail = usuario.includes('@');
  const email = parecEmail ? usuario.toLowerCase() : (esCurpValida(usuario) ? curpAEmail(usuario) : null);

  if (!email) return { error: 'CURP inválida o correo mal formado.' };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Usuario o contraseña incorrectos.' };

  const { data: perfil } = await supabase
    .from('perfiles').select('rol').eq('id', data.user.id).single();

  const destino = redirectTo
    || (perfil?.rol === 'admin' || perfil?.rol === 'staff' ? '/admin'
        : perfil?.rol === 'director' ? '/director'
        : perfil?.rol === 'profesor' ? '/profesor'
        : '/alumno');

  redirect(destino);
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
