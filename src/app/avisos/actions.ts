'use server';
// Creación de avisos y marca de lectura. El bucket usado es 'mensajes'
// (reutilizamos el existente, path: avisos/<id>/<uuid>.<ext>).
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const MAX = 10 * 1024 * 1024;

export async function crearAviso(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!p) return { error: 'Sin perfil' };
  const autor_tipo = p.rol === 'profesor' ? 'profesor'
    : p.rol === 'director' ? 'direccion'
    : p.rol === 'admin' || p.rol === 'staff' ? 'admin'
    : null;
  if (!autor_tipo) return { error: 'Rol no autorizado' };

  const titulo = String(fd.get('titulo') ?? '').trim();
  const cuerpo = String(fd.get('cuerpo') ?? '').trim();
  const prioridad = String(fd.get('prioridad') ?? 'normal');
  const alcance = String(fd.get('alcance') ?? 'todos');
  const grupoIdsRaw = String(fd.get('grupo_ids') ?? '').trim();
  const grupo_ids = grupoIdsRaw ? grupoIdsRaw.split(',').filter(Boolean) : null;
  const vence = String(fd.get('vence_at') ?? '').trim();
  const file = fd.get('adjunto') as File | null;

  if (titulo.length < 3) return { error: 'El título es muy corto' };
  if (cuerpo.length < 10) return { error: 'El cuerpo del aviso es muy corto' };

  const { data: aviso, error } = await supabase.from('avisos').insert({
    autor_id: user.id,
    autor_tipo,
    titulo, cuerpo, prioridad, alcance, grupo_ids,
    vence_at: vence || null,
  }).select('id').single();
  if (error) return { error: error.message };

  if (file && (file as any).size) {
    if (file.size > MAX) return { error: 'Archivo excede 10 MB' };
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g,'');
    const rand = (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}`;
    const path = `avisos/${aviso!.id}/${rand}.${ext}`;
    const { error: upErr } = await supabase.storage.from('mensajes').upload(path, file, {
      contentType: file.type || 'application/octet-stream', upsert: false,
    });
    if (!upErr) {
      await supabase.from('avisos').update({
        adjunto_url: path,
        adjunto_nombre: file.name,
        adjunto_tipo: file.type || 'application/octet-stream',
        adjunto_tamano: file.size,
      }).eq('id', aviso!.id);
    }
  }

  revalidatePath('/alumno/avisos');
  revalidatePath('/profesor/avisos');
  revalidatePath('/admin/avisos');
  return { ok: true };
}

export async function marcarAvisoLeido(avisoId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('avisos_lecturas')
    .upsert({ aviso_id: avisoId, user_id: user.id }, { onConflict: 'aviso_id,user_id' });
}
