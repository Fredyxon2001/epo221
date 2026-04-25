'use server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function guardarPlaneacion(fd: FormData): Promise<{ error?: string; ok?: boolean; id?: string }> {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!prof) return { error: 'No eres docente' };

  const asignacion_id = String(fd.get('asignacion_id') ?? '');
  const parcial = Number(fd.get('parcial') ?? 1);
  const titulo = String(fd.get('titulo') ?? '').trim();
  const contenido = String(fd.get('contenido') ?? '').trim() || null;
  const enviar = fd.get('enviar') === '1';
  if (!asignacion_id || !titulo) return { error: 'Datos incompletos' };

  // Verificar que la asignación sea del docente
  const { data: asg } = await supabase.from('asignaciones').select('id, profesor_id').eq('id', asignacion_id).maybeSingle();
  if (!asg || asg.profesor_id !== prof.id) return { error: 'Asignación inválida' };

  // Siguiente versión
  const { data: last } = await supabase.from('planeaciones')
    .select('version').eq('asignacion_id', asignacion_id).eq('parcial', parcial)
    .order('version', { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;

  // Archivo opcional
  let archivo_url: string | null = null;
  let archivo_nombre: string | null = null;
  const file = fd.get('archivo') as File | null;
  if (file && file.size > 0) {
    const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase();
    const path = `${asignacion_id}/${crypto.randomUUID()}.${ext}`;
    const ab = await file.arrayBuffer();
    const { error: upErr } = await admin.storage.from('planeaciones').upload(path, ab, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (upErr) return { error: upErr.message };
    archivo_url = path;
    archivo_nombre = file.name;
  }

  const estado = enviar ? 'enviada' : 'borrador';

  const { data, error } = await supabase.from('planeaciones').insert({
    asignacion_id, parcial, titulo, contenido, version,
    archivo_url, archivo_nombre, estado,
  }).select('id').single();
  if (error) return { error: error.message };

  revalidatePath('/profesor/planeaciones');
  revalidatePath('/admin/planeaciones');
  return { ok: true, id: data.id };
}

export async function enviarPlaneacion(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('planeaciones').update({ estado: 'enviada', updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/profesor/planeaciones');
  revalidatePath('/admin/planeaciones');
}

export async function eliminarPlaneacion(id: string) {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!prof) return { error: 'No eres docente' };
  const { data: p } = await supabase.from('planeaciones').select('archivo_url, asignacion_id, estado, asignacion:asignaciones(profesor_id)').eq('id', id).maybeSingle();
  if (!p) return { error: 'No existe' };
  if ((p as any).asignacion?.profesor_id !== prof.id) return { error: 'Sin permiso' };
  if (p.estado === 'aprobada') return { error: 'No puedes borrar una planeación aprobada' };

  if (p.archivo_url) await admin.storage.from('planeaciones').remove([p.archivo_url]);
  await supabase.from('planeaciones').delete().eq('id', id);
  revalidatePath('/profesor/planeaciones');
  revalidatePath('/admin/planeaciones');
  return { ok: true };
}

export async function revisarPlaneacion(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!perfil || !['admin', 'staff', 'director'].includes(perfil.rol)) return { error: 'Sin permiso' };

  const id = String(fd.get('id') ?? '');
  const accion = String(fd.get('accion') ?? ''); // 'aprobar' | 'rechazar'
  const observaciones = String(fd.get('observaciones') ?? '').trim() || null;
  if (!id || !['aprobar', 'rechazar'].includes(accion)) return { error: 'Datos inválidos' };

  const estado = accion === 'aprobar' ? 'aprobada' : 'rechazada';
  const { data: plan, error } = await supabase.from('planeaciones')
    .update({ estado, observaciones_revisor: observaciones, revisada_por: user.id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('asignacion:asignaciones(profesor:profesores(perfil_id)), titulo')
    .single();
  if (error) return { error: error.message };

  // Notificar al docente
  const perfilId = (plan as any)?.asignacion?.profesor?.perfil_id;
  if (perfilId) {
    await supabase.from('notificaciones').insert({
      perfil_id: perfilId,
      titulo: `Planeación ${estado}`,
      mensaje: `Tu planeación "${plan.titulo}" fue ${estado}${observaciones ? `: ${observaciones}` : ''}.`,
      url: '/profesor/planeaciones',
    });
  }

  revalidatePath('/admin/planeaciones');
  revalidatePath('/profesor/planeaciones');
  return { ok: true };
}

export async function getSignedPlaneacionUrl(path: string): Promise<string | null> {
  const admin = adminClient();
  const { data } = await admin.storage.from('planeaciones').createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}
