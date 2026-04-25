'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ensureHilo, postMensaje } from '@/lib/mensajes';

const MAX = 15 * 1024 * 1024;

async function subirRespuestaAdjunto(supabase: any, solicitudId: string, file: File | null) {
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
    respuesta_adjunto_url: path,
    respuesta_adjunto_nombre: file.name,
    respuesta_adjunto_tipo: file.type || 'application/octet-stream',
    respuesta_adjunto_tamano: file.size,
  };
}

export async function responderSolicitud(fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const id = String(fd.get('id') ?? '');
  const respuesta = String(fd.get('respuesta') ?? '').trim();
  const decision = String(fd.get('decision') ?? 'respondida') as
    'respondida' | 'aceptada' | 'rechazada';
  const file = fd.get('adjunto') as File | null;

  if (!id) return { error: 'Solicitud inválida' };
  if (respuesta.length < 10) return { error: 'La respuesta debe ser más clara (mín. 10 caracteres).' };

  let adj: any = null;
  try { adj = await subirRespuestaAdjunto(supabase, id, file); }
  catch (e: any) { return { error: e.message }; }

  const { data: sol, error } = await supabase
    .from('solicitudes_revision')
    .update({
      respuesta,
      estado: decision,
      respondida_por: user.id,
      respondida_en: new Date().toISOString(),
      ...(adj ?? {}),
    })
    .eq('id', id)
    .select('id, alumno_id, parcial, asignacion_id')
    .single();

  if (error) return { error: error.message };

  if (sol) {
    const { data: asig } = await supabase
      .from('asignaciones')
      .select('profesor_id, materia:materias(nombre)')
      .eq('id', sol.asignacion_id)
      .maybeSingle();
    if (asig?.profesor_id) {
      const hiloId = await ensureHilo(supabase, asig.profesor_id, sol.alumno_id, 'profesor');
      if (hiloId) {
        const materia = (asig as any).materia?.nombre ?? 'la materia';
        const emoji = decision === 'aceptada' ? '✅' : decision === 'rechazada' ? '❌' : '💬';
        const cuerpo = `${emoji} Respuesta a solicitud — ${materia}${sol.parcial ? ` · Parcial ${sol.parcial}` : ''} (${decision})\n\n${respuesta}${adj ? `\n\n📎 ${adj.respuesta_adjunto_nombre}` : ''}`;
        await postMensaje(supabase, {
          hiloId, autorId: user.id, autorTipo: 'profesor', cuerpo, solicitudId: sol.id,
        });
      }
    }
  }

  revalidatePath('/profesor/solicitudes');
  revalidatePath('/profesor/mensajes');
  revalidatePath('/profesor');
  return { ok: true };
}
