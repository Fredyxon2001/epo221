'use server';

import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function crearProfesor(formData: FormData) {
  const admin = adminClient();
  const nombre = String(formData.get('nombre'));
  const apellido_paterno = String(formData.get('apellido_paterno'));
  const apellido_materno = String(formData.get('apellido_materno') ?? '') || null;
  const email = String(formData.get('email'));
  const rfc = String(formData.get('rfc') ?? '') || null;

  // Contraseña temporal — el profesor la cambia al primer login
  const tempPass = `EPO221-${Math.random().toString(36).slice(2, 10)}`;

  const { data: au, error } = await admin.auth.admin.createUser({
    email, password: tempPass, email_confirm: true,
    user_metadata: { rol: 'profesor', temp_pass: true },
  });
  if (error) return { error: error.message };

  await admin.from('perfiles').insert({
    id: au.user.id, rol: 'profesor', nombre: `${nombre} ${apellido_paterno}`, email,
  });

  await admin.from('profesores').insert({
    perfil_id: au.user.id, rfc, nombre, apellido_paterno, apellido_materno, email,
  });

  revalidatePath('/admin/profesores');
  // TODO: enviar tempPass por correo (Resend/SMTP) — por ahora se registra en consola del server
  console.log(`[profesor creado] ${email} — contraseña temporal: ${tempPass}`);
}

export async function toggleProfesor(formData: FormData) {
  const supabase = createClient();
  await supabase.from('profesores')
    .update({ activo: formData.get('activo') === '1' })
    .eq('id', String(formData.get('id')));
  revalidatePath('/admin/profesores');
}
