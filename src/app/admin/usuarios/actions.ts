'use server';
// Alta y edición unificada de usuarios para cualquier rol.
// Roles: alumno, profesor, director, admin, staff, finanzas (+ orientador = profesor con grupos)
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type Rol = 'alumno' | 'profesor' | 'director' | 'admin' | 'staff' | 'finanzas';

async function requireAdmin() {
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Sesión expirada' as const };
  const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!p || !['admin', 'staff', 'director'].includes(p.rol)) return { error: 'No autorizado' as const };
  return { user, rol: p.rol };
}

function generarPasswordAleatoria(len = 12): string {
  const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let p = '';
  const bytes = new Uint8Array(len);
  (globalThis as any).crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) p += ch[bytes[i] % ch.length];
  return p.replace(/.$/, String(Math.floor(Math.random() * 10)));
}

export async function crearUsuarioGenerico(fd: FormData): Promise<{
  ok?: boolean; error?: string; temporal?: string; perfil_id?: string;
}> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: auth.error };

  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const nombre = String(fd.get('nombre') ?? '').trim();
  const apellidoP = String(fd.get('apellido_paterno') ?? '').trim();
  const apellidoM = String(fd.get('apellido_materno') ?? '').trim() || null;
  const rol = String(fd.get('rol') ?? '') as Rol;
  const pwdManual = String(fd.get('password') ?? '').trim();
  // Específicos para profesor / orientador
  const rfc = String(fd.get('rfc') ?? '').trim() || null;
  const telefono = String(fd.get('telefono') ?? '').trim() || null;
  const daClases = fd.get('da_clases') === '1';
  const esOrientador = fd.get('es_orientador') === '1';
  const gruposOrientador = fd.getAll('grupos_orientador[]').map((g) => String(g)).filter(Boolean);

  if (!email || !nombre || !apellidoP || !rol) {
    return { error: 'Faltan campos obligatorios (email, nombre, apellido paterno, rol)' };
  }
  if (!['alumno', 'profesor', 'director', 'admin', 'staff', 'finanzas'].includes(rol)) {
    return { error: 'Rol inválido' };
  }
  if (esOrientador && gruposOrientador.length === 0) {
    return { error: 'Si marcaste "Es orientador", debes seleccionar al menos un grupo a orientar' };
  }
  if (esOrientador && gruposOrientador.length > 4) {
    return { error: 'Un orientador puede tener máximo 4 grupos a su cargo' };
  }

  const password = pwdManual || generarPasswordAleatoria(12);
  const admin = adminClient();
  const nombreCompleto = `${nombre} ${apellidoP}${apellidoM ? ' ' + apellidoM : ''}`;

  // 1) Crear usuario en auth
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { nombre: nombreCompleto, rol },
  });
  if (createErr) {
    if (String(createErr.message).includes('already')) {
      return { error: 'Ya existe una cuenta con ese correo' };
    }
    return { error: createErr.message };
  }
  if (!created.user) return { error: 'No se pudo crear el usuario' };

  // 2) Crear perfil
  const { error: perfilErr } = await admin.from('perfiles').insert({
    id: created.user.id, nombre: nombreCompleto, email, rol: rol as any,
    debe_cambiar_password: !pwdManual,
  });
  if (perfilErr) return { error: 'Usuario creado pero falló perfil: ' + perfilErr.message };

  // 3) Si es profesor (o combo), crear registro en profesores
  let profesorId: string | null = null;
  if (rol === 'profesor') {
    const { data: prof, error: profErr } = await admin.from('profesores').insert({
      perfil_id: created.user.id,
      nombre, apellido_paterno: apellidoP, apellido_materno: apellidoM,
      email, telefono, rfc,
      activo: true,
    }).select('id').single();
    if (profErr) return { error: 'Perfil OK pero falló registro profesor: ' + profErr.message };
    profesorId = prof.id;

    // 3b) Asignar grupos a orientar (si es orientador)
    if (esOrientador && profesorId && gruposOrientador.length) {
      const { error: orientErr } = await admin.from('grupos')
        .update({ orientador_id: profesorId })
        .in('id', gruposOrientador);
      if (orientErr) {
        return { error: 'Usuario creado pero falló asignar grupos: ' + orientErr.message };
      }
    }
  }

  revalidatePath('/admin/usuarios');
  revalidatePath('/admin/profesores');
  revalidatePath('/admin/grupos');
  return { ok: true, temporal: pwdManual ? undefined : password, perfil_id: created.user.id };
}

export async function editarRolUsuario(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: auth.error };

  const perfilId = String(fd.get('perfil_id') ?? '');
  const nuevoRol = String(fd.get('rol') ?? '') as Rol;
  if (!perfilId || !nuevoRol) return { error: 'Datos inválidos' };
  if (!['alumno', 'profesor', 'director', 'admin', 'staff', 'finanzas'].includes(nuevoRol)) {
    return { error: 'Rol inválido' };
  }

  const admin = adminClient();
  const { error } = await admin.from('perfiles').update({ rol: nuevoRol as any }).eq('id', perfilId);
  if (error) return { error: error.message };

  revalidatePath('/admin/usuarios');
  return { ok: true };
}

export async function asignarGruposOrientador(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin();
  if ('error' in auth) return { error: auth.error };

  const profesorId = String(fd.get('profesor_id') ?? '');
  const grupos = fd.getAll('grupos[]').map((g) => String(g));
  if (!profesorId) return { error: 'Profesor inválido' };
  if (grupos.length > 4) return { error: 'Máximo 4 grupos por orientador' };

  const admin = adminClient();
  // Quitar grupos previos
  await admin.from('grupos').update({ orientador_id: null }).eq('orientador_id', profesorId);
  // Asignar nuevos
  if (grupos.length) {
    const { error } = await admin.from('grupos').update({ orientador_id: profesorId }).in('id', grupos);
    if (error) return { error: error.message };
  }

  revalidatePath('/admin/usuarios');
  revalidatePath('/admin/grupos');
  return { ok: true };
}
