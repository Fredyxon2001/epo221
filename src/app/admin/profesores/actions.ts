'use server';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';


import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { temporaryPassword } from '@/lib/security/password';
import { baseUrl } from '@/lib/base-url';

export async function crearProfesor(formData: FormData) {
  await requireAccess(["admin","staff","director"], "admin/profesores/actions.ts:crearProfesor");
  await validateFormData(formData);

  const admin = adminClient();
  const nombre = String(formData.get('nombre'));
  const apellido_paterno = String(formData.get('apellido_paterno'));
  const apellido_materno = String(formData.get('apellido_materno') ?? '') || null;
  const email = String(formData.get('email'));
  const rfc = String(formData.get('rfc') ?? '') || null;

  // Contraseña temporal — el profesor la cambia al primer login
  const tempPass = temporaryPassword();

  const { data: au, error } = await admin.auth.admin.createUser({
    email, password: tempPass, email_confirm: true,
    user_metadata: { rol: 'profesor', temp_pass: true },
  });
  if (error) return { error: error.message };

  await admin.from('perfiles').insert({
    id: au.user.id, rol: 'profesor', nombre: `${nombre} ${apellido_paterno}`, email, debe_cambiar_password: true,
  });

  await admin.from('profesores').insert({
    perfil_id: au.user.id, rfc, nombre, apellido_paterno, apellido_materno, email,
  });

  revalidatePath('/admin/profesores');
  const client = await createClient();
  const { error: recoveryError } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${baseUrl()}/auth/callback?next=/cambiar-password` });
  if (recoveryError) return { error: 'Cuenta creada. No se pudo enviar el enlace; usa Usuarios y contraseñas para entregar una clave individual.' };
}

export async function toggleProfesor(formData: FormData) {
  await requireAccess(["admin","staff","director"], "admin/profesores/actions.ts:toggleProfesor");
  await validateFormData(formData);

  const supabase = adminClient();
  await supabase.from('profesores')
    .update({ activo: formData.get('activo') === '1' })
    .eq('id', String(formData.get('id')));
  revalidatePath('/admin/profesores');
}
