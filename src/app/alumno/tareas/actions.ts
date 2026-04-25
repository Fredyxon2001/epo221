'use server';
// Alumno entrega una tarea. Sube archivo (opcional) al bucket "tareas" bajo <tarea_id>/<uuid>.<ext>
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function entregarTarea(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: al } = await supabase.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!al) return { error: 'No eres alumno' };

  const tarea_id = String(fd.get('tarea_id') ?? '');
  const comentario = String(fd.get('comentario') ?? '').trim() || null;
  const archivo = fd.get('archivo') as File | null;

  if (!tarea_id) return { error: 'Tarea inválida' };

  const { data: tarea } = await supabase.from('tareas')
    .select('id, fecha_entrega, cierra_estricto, permite_archivos').eq('id', tarea_id).maybeSingle();
  if (!tarea) return { error: 'Tarea no existe' };

  if (tarea.cierra_estricto && new Date(tarea.fecha_entrega) < new Date()) {
    return { error: 'La tarea ya cerró y no acepta entregas tardías' };
  }

  let archivo_url: string | null = null;
  let archivo_nombre: string | null = null;
  let archivo_tipo: string | null = null;
  let archivo_tamano: number | null = null;

  if (archivo && archivo.size > 0) {
    if (!tarea.permite_archivos) return { error: 'Esta tarea no permite archivos' };
    if (archivo.size > 25 * 1024 * 1024) return { error: 'Archivo mayor a 25 MB' };
    const ext = archivo.name.split('.').pop() ?? 'bin';
    const key = `${tarea_id}/${crypto.randomUUID()}.${ext}`;
    const admin = adminClient();
    const { error: upErr } = await admin.storage.from('tareas').upload(key, archivo, {
      contentType: archivo.type, upsert: false,
    });
    if (upErr) return { error: upErr.message };
    archivo_url = key;
    archivo_nombre = archivo.name;
    archivo_tipo = archivo.type;
    archivo_tamano = archivo.size;
  }

  const { error } = await supabase.from('entregas_tarea').upsert({
    tarea_id, alumno_id: al.id,
    comentario, archivo_url, archivo_nombre, archivo_tipo, archivo_tamano,
    entregado_at: new Date().toISOString(),
    estado: 'entregada',
  }, { onConflict: 'tarea_id,alumno_id' });
  if (error) return { error: error.message };

  revalidatePath(`/alumno/tareas/${tarea_id}`);
  revalidatePath('/alumno/tareas');
  return { ok: true };
}
