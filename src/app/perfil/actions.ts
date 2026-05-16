'use server';
// Edición universal de perfil: cualquier usuario puede actualizar SU info personal.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function actualizarMiPerfil(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const nombre = String(fd.get('nombre') ?? '').trim();
  const apellidoP = String(fd.get('apellido_paterno') ?? '').trim() || null;
  const apellidoM = String(fd.get('apellido_materno') ?? '').trim() || null;
  const telefono = String(fd.get('telefono') ?? '').trim() || null;
  const cargo = String(fd.get('cargo') ?? '').trim() || null;
  const bio = String(fd.get('bio') ?? '').trim() || null;
  const rfc = String(fd.get('rfc') ?? '').trim() || null;

  if (!nombre) return { error: 'El nombre es obligatorio' };

  // 1) Actualizar perfiles (datos universales)
  const nombreCompleto = `${nombre}${apellidoP ? ' ' + apellidoP : ''}${apellidoM ? ' ' + apellidoM : ''}`;
  const { error: perfErr } = await supabase
    .from('perfiles')
    .update({
      nombre: nombreCompleto,
      apellido_paterno: apellidoP,
      apellido_materno: apellidoM,
      telefono, cargo, bio,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (perfErr) return { error: perfErr.message };

  // 2) Si es profesor, actualizar tabla profesores también
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  if (prof?.id) {
    await supabase.from('profesores').update({
      nombre, apellido_paterno: apellidoP, apellido_materno: apellidoM,
      telefono, rfc: rfc ?? undefined,
    }).eq('id', prof.id);
  }

  revalidatePath('/perfil');
  revalidatePath('/profesor/perfil');
  revalidatePath('/admin/perfil');
  revalidatePath('/director/perfil');
  revalidatePath('/profesor', 'layout');
  revalidatePath('/admin', 'layout');
  revalidatePath('/director', 'layout');
  return { ok: true };
}

const MAX_AVATAR = 3 * 1024 * 1024; // 3 MB

export async function subirMiAvatar(fd: FormData): Promise<{ ok?: boolean; error?: string; url?: string }> {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const file = fd.get('avatar') as File | null;
  if (!file || !(file as any).size) return { error: 'Selecciona una imagen' };
  if ((file as any).size > MAX_AVATAR) return { error: 'La imagen excede 3 MB' };
  if (!file.type?.startsWith('image/')) return { error: 'Solo se permiten imágenes' };

  const ext = ((file as any).name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const rand = (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}`;
  const path = `${user.id}/${rand}.${ext}`;
  const ab = await (file as any).arrayBuffer();

  // Subir con admin (bypass de policy de path)
  const { error: upErr } = await admin.storage.from('avatares').upload(path, ab, {
    contentType: file.type, upsert: false,
  });
  if (upErr) return { error: upErr.message };

  const { data: pub } = admin.storage.from('avatares').getPublicUrl(path);
  const url = pub.publicUrl;

  // Actualizar siempre perfiles.avatar_url
  await admin.from('perfiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', user.id);

  // Actualizar profesores.foto_url si aplica
  const { data: prof } = await admin.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  if (prof?.id) await admin.from('profesores').update({ foto_url: url }).eq('id', prof.id);

  // Actualizar alumnos.foto_url si aplica
  const { data: alu } = await admin.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (alu?.id) await admin.from('alumnos').update({ foto_url: url }).eq('id', alu.id);

  revalidatePath('/perfil');
  revalidatePath('/profesor/perfil');
  revalidatePath('/admin/perfil');
  revalidatePath('/director/perfil');
  revalidatePath('/profesor', 'layout');
  revalidatePath('/admin', 'layout');
  revalidatePath('/director', 'layout');
  revalidatePath('/alumno', 'layout');
  return { ok: true, url };
}

export async function eliminarMiAvatar(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  await admin.from('perfiles').update({ avatar_url: null }).eq('id', user.id);

  const { data: prof } = await admin.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  if (prof?.id) await admin.from('profesores').update({ foto_url: null }).eq('id', prof.id);
  const { data: alu } = await admin.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (alu?.id) await admin.from('alumnos').update({ foto_url: null }).eq('id', alu.id);

  revalidatePath('/perfil');
  revalidatePath('/profesor/perfil');
  revalidatePath('/admin/perfil');
  revalidatePath('/director/perfil');
  return { ok: true };
}
