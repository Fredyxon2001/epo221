'use server';
// Cambio de contraseña por el usuario autenticado (flujo forzado o voluntario).
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function cambiarPassword(fd: FormData): Promise<{ error?: string }> {
  const nueva = String(fd.get('nueva') ?? '');
  const confirma = String(fd.get('confirma') ?? '');
  if (nueva.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres' };
  if (nueva !== confirma) return { error: 'Las contraseñas no coinciden' };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: error.message };

  await supabase.from('perfiles')
    .update({ debe_cambiar_password: false })
    .eq('id', user.id);

  // Redirigir a su panel
  const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  const panel = p?.rol === 'admin' || p?.rol === 'staff' ? '/admin'
    : p?.rol === 'director' ? '/director'
    : p?.rol === 'profesor' ? '/profesor'
    : '/alumno';
  redirect(panel);
}
