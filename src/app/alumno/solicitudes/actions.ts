'use server';
import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { revalidatePath } from 'next/cache';
import { ensureHilo, postMensaje } from '@/lib/mensajes';

const MAX = 15 * 1024 * 1024;

async function subirSolicitudAdjunto(supabase: any, solicitudId: string, file: File | null) {
  if (!file || !(file as any).size) return null;
  if (file.size > MAX) throw new Error('Archivo excede 15 MB');
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const rand = (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${solicitudId}/${rand}.${ext}`;
  const { error } = await supabase.storage.from('solicitudes').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return {
    adjunto_url: path,
    adjunto_nombre: file.name,
    adjunto_tipo: file.type || 'application/octet-stream',
    adjunto_tamano: file.size,
  };
}

export async function crearSolicitudRevision(fd: FormData) {
  const alumno = await getAlumnoActual();
  if (!alumno) return { error: 'Sesión expirada' };

  const asignacion_id = String(fd.get('asignacion_id') ?? '').trim();
  const parcialStr = String(fd.get('parcial') ?? '').trim();
  const motivo = String(fd.get('motivo') ?? '').trim();
  const file = fd.get('adjunto') as File | null;

  const parcial = parcialStr ? Number(parcialStr) : null;

  if (!asignacion_id) return { error: 'Falta la materia' };
  if (!motivo || motivo.length < 15) return { error: 'El motivo debe ser más descriptivo (mín. 15 caracteres).' };
  if (parcial != null && (parcial < 1 || parcial > 4)) return { error: 'Parcial inválido' };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: solicitud, error } = await supabase.from('solicitudes_revision').insert({
    alumno_id: alumno.id,
    asignacion_id,
    parcial,
    motivo,
    estado: 'abierta',
  }).select('id').single();
  if (error) return { error: error.message };

  // Adjunto a la solicitud (opcional)
  let adj: any = null;
  try { adj = await subirSolicitudAdjunto(supabase, solicitud!.id, file); }
  catch (e: any) { return { error: e.message }; }
  if (adj) {
    await supabase.from('solicitudes_revision').update(adj).eq('id', solicitud!.id);
  }

  // Sincronizar con mensajería
  const { data: asig } = await supabase
    .from('asignaciones')
    .select('profesor_id, materia:materias(nombre)')
    .eq('id', asignacion_id)
    .maybeSingle();

  if (asig?.profesor_id && user) {
    const hiloId = await ensureHilo(supabase, asig.profesor_id, alumno.id, 'alumno');
    if (hiloId) {
      const materia = (asig as any).materia?.nombre ?? 'la materia';
      const cuerpo = `📋 Solicité revisión — ${materia}${parcial ? ` · Parcial ${parcial}` : ''}\n\n${motivo}${adj ? `\n\n📎 ${adj.adjunto_nombre}` : ''}`;
      await postMensaje(supabase, {
        hiloId, autorId: user.id, autorTipo: 'alumno', cuerpo, solicitudId: solicitud!.id,
      });
    }
  }

  revalidatePath('/alumno/solicitudes');
  revalidatePath('/alumno/calificaciones');
  revalidatePath('/alumno/mensajes');
  revalidatePath('/alumno');
  return { ok: true };
}

export async function cerrarSolicitud(fd: FormData) {
  const alumno = await getAlumnoActual();
  if (!alumno) return { error: 'Sesión expirada' };
  const id = String(fd.get('id') ?? '');
  const supabase = createClient();
  const { error } = await supabase
    .from('solicitudes_revision')
    .update({ estado: 'cerrada' })
    .eq('id', id)
    .eq('alumno_id', alumno.id);
  if (error) return { error: error.message };
  revalidatePath('/alumno/solicitudes');
  return { ok: true };
}
