'use server';
import { requireResource, requireAttempt, requireProfessor, requireReportOrientation } from '@/lib/security/resources';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';

// Alumno entrega una tarea. Sube archivo (opcional) al bucket "tareas" bajo <tarea_id>/<uuid>.<ext>
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function entregarTarea(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAccess(["alumno","admin","staff","director"], "alumno/tareas/actions.ts:entregarTarea");
  await validateFormData(fd);
  await requireResource("tareas", fd.get("tarea_id"), false);


  const auth = (await createClient());
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
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
  const { data: previous } = await supabase.from('entregas_tarea')
    .select('id,calificacion,archivo_url,archivo_nombre,archivo_tipo,archivo_tamano').eq('tarea_id', tarea_id).eq('alumno_id', al.id).maybeSingle();
  if (previous?.calificacion != null) return { error: 'La entrega ya fue calificada y no puede modificarse.' };

  if (tarea.cierra_estricto && new Date(tarea.fecha_entrega) < new Date()) {
    return { error: 'La tarea ya cerró y no acepta entregas tardías' };
  }

  let archivo_url: string | null = previous?.archivo_url ?? null;
  let archivo_nombre: string | null = previous?.archivo_nombre ?? null;
  let archivo_tipo: string | null = previous?.archivo_tipo ?? null;
  let archivo_tamano: number | null = previous?.archivo_tamano ?? null;

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

  const payload = {
    tarea_id, alumno_id: al.id,
    comentario, archivo_url, archivo_nombre, archivo_tipo, archivo_tamano,
    entregado_at: new Date().toISOString(),
    estado: 'entregada',
  };
  // A conditional UPDATE prevents a simultaneous grade from being overwritten.
  const { error } = previous
    ? await supabase.from('entregas_tarea').update(payload).eq('id', previous.id).is('calificacion', null).select('id').single()
    : await supabase.from('entregas_tarea').insert(payload).select('id').single();
  if (error) {
    if (archivo_url && archivo_url !== previous?.archivo_url) await supabase.storage.from('tareas').remove([archivo_url]);
    return { error: 'No se pudo registrar la entrega. Intenta nuevamente.' };
  }
  if (previous?.archivo_url && previous.archivo_url !== archivo_url) await supabase.storage.from('tareas').remove([previous.archivo_url]);

  revalidatePath(`/alumno/tareas/${tarea_id}`);
  revalidatePath('/alumno/tareas');
  return { ok: true };
}
