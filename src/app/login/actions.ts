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

  // Leer rol con fetch directo al REST API usando service role (bypass RLS).
  // Si fallara, fallback al supabase client normal.
  let rol: string | null = null;
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/perfiles?id=eq.${data.user.id}&select=rol`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      },
    );
    const arr = await r.json();
    rol = arr?.[0]?.rol ?? null;
  } catch {}
  if (!rol) {
    const { data: perfil } = await supabase
      .from('perfiles').select('rol').eq('id', data.user.id).maybeSingle();
    rol = perfil?.rol ?? null;
  }

  const destino = redirectTo
    || (rol === 'admin' || rol === 'staff' || rol === 'finanzas' ? '/admin'
        : rol === 'director' ? '/director'
        : rol === 'profesor' ? '/profesor'
        : rol === 'alumno' ? '/alumno'
        : '/admin'); // fallback: si no se sabe, prueba admin (rol más común sin alumno)

  redirect(destino);
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
