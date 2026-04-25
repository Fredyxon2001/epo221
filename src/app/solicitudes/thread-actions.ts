'use server';
// Acciones compartidas para la conversación de una solicitud.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const MAX = 15 * 1024 * 1024;

async function getRolYAcceso(supabase: any, solicitudId: string, userId: string) {
  // Determina el rol del autor para esta solicitud y verifica acceso
  const { data: sol } = await supabase
    .from('solicitudes_revision')
    .select('id, alumno_id, asignacion_id, estado, alumno:alumnos(perfil_id), asignacion:asignaciones(profesor_id, profesor:profesores(perfil_id))')
    .eq('id', solicitudId)
    .maybeSingle();
  if (!sol) return { error: 'Solicitud no encontrada' as const };

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', userId).maybeSingle();
  const rol = perfil?.rol;

  let autor_tipo: 'alumno' | 'profesor' | 'admin' | 'staff' | 'director' | null = null;
  if ((sol as any).alumno?.perfil_id === userId) autor_tipo = 'alumno';
  else if ((sol as any).asignacion?.profesor?.perfil_id === userId) autor_tipo = 'profesor';
  else if (rol && ['admin', 'staff', 'director'].includes(rol)) autor_tipo = rol as any;

  if (!autor_tipo) return { error: 'Sin permiso' as const };
  return { sol, autor_tipo };
}

export async function enviarMensajeSolicitud(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const solicitud_id = String(fd.get('solicitud_id') ?? '');
  const texto = String(fd.get('texto') ?? '').trim();
  if (!solicitud_id) return { error: 'Solicitud inválida' };
  const file = fd.get('adjunto') as File | null;
  const tieneArchivo = file && (file as any).size > 0;
  if (!texto && !tieneArchivo) return { error: 'Escribe un mensaje o adjunta un archivo.' };

  const acceso = await getRolYAcceso(supabase, solicitud_id, user.id);
  if ('error' in acceso) return { error: acceso.error };
  const { sol, autor_tipo } = acceso;
  if ((sol as any).estado === 'cerrada') return { error: 'La solicitud está cerrada. Pide al alumno reabrirla.' };

  // Subir adjunto
  let adjunto: any = null;
  if (tieneArchivo) {
    if ((file as any).size > MAX) return { error: 'Archivo excede 15 MB' };
    const ext = ((file as any).name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const rand = (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${solicitud_id}/${rand}.${ext}`;
    const ab = await (file as any).arrayBuffer();
    const { error: upErr } = await admin.storage.from('solicitudes').upload(path, ab, {
      contentType: (file as any).type || 'application/octet-stream',
      upsert: false,
    });
    if (upErr) return { error: upErr.message };
    adjunto = {
      adjunto_url: path,
      adjunto_nombre: (file as any).name,
      adjunto_tipo: (file as any).type || 'application/octet-stream',
      adjunto_tamano: (file as any).size,
    };
  }

  const { error: insErr } = await supabase.from('solicitudes_mensajes').insert({
    solicitud_id,
    autor_id: user.id,
    autor_tipo,
    texto: texto || (adjunto ? `📎 ${adjunto.adjunto_nombre}` : ''),
    ...(adjunto ?? {}),
  });
  if (insErr) return { error: insErr.message };

  // Actualizar estado de la solicitud según quién escribe
  const nuevoEstado =
    ['profesor', 'admin', 'staff', 'director'].includes(autor_tipo) ? 'respondida' : 'abierta';
  const updates: any = { estado: nuevoEstado, updated_at: new Date().toISOString() };
  if (autor_tipo === 'profesor') {
    updates.respondida_por = user.id;
    updates.respondida_en = new Date().toISOString();
  }
  await supabase.from('solicitudes_revision').update(updates).eq('id', solicitud_id);

  // Notificar a la otra parte
  const alumnoPerfil = (sol as any).alumno?.perfil_id;
  const profPerfil = (sol as any).asignacion?.profesor?.perfil_id;
  const target = autor_tipo === 'alumno' ? profPerfil : alumnoPerfil;
  if (target) {
    await admin.from('notificaciones').insert({
      perfil_id: target,
      titulo: autor_tipo === 'alumno' ? '💬 Nuevo mensaje en solicitud' : '💬 Respuesta en tu solicitud',
      mensaje: (texto || `Te enviaron un archivo (${adjunto?.adjunto_nombre ?? ''})`).slice(0, 240),
      url: autor_tipo === 'alumno' ? '/profesor/solicitudes' : '/alumno/solicitudes',
    });
  }

  revalidatePath('/alumno/solicitudes');
  revalidatePath('/profesor/solicitudes');
  return { ok: true };
}

export async function cerrarSolicitudThread(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const id = String(fd.get('id') ?? '');
  if (!id) return { error: 'Solicitud inválida' };

  const acceso = await getRolYAcceso(supabase, id, user.id);
  if ('error' in acceso) return { error: acceso.error };

  await supabase.from('solicitudes_revision').update({ estado: 'cerrada', updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/alumno/solicitudes');
  revalidatePath('/profesor/solicitudes');
  return { ok: true };
}

export async function reabrirSolicitudThread(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const id = String(fd.get('id') ?? '');
  if (!id) return { error: 'Solicitud inválida' };
  const acceso = await getRolYAcceso(supabase, id, user.id);
  if ('error' in acceso) return { error: acceso.error };

  await supabase.from('solicitudes_revision').update({ estado: 'abierta', updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/alumno/solicitudes');
  revalidatePath('/profesor/solicitudes');
  return { ok: true };
}
