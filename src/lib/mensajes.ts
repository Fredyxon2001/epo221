// Helpers de mensajería reutilizables desde server actions.
import type { SupabaseClient } from '@supabase/supabase-js';

export async function ensureHilo(
  supabase: SupabaseClient,
  profesorId: string,
  alumnoId: string,
  creadoPor: 'profesor' | 'alumno' = 'alumno',
): Promise<string | null> {
  const { data: existente } = await supabase
    .from('mensajes_hilos')
    .select('id')
    .eq('profesor_id', profesorId)
    .eq('alumno_id', alumnoId)
    .maybeSingle();
  if (existente?.id) return existente.id;
  const { data: nuevo } = await supabase
    .from('mensajes_hilos')
    .insert({ profesor_id: profesorId, alumno_id: alumnoId, creado_por: creadoPor })
    .select('id').single();
  return nuevo?.id ?? null;
}

// Inserta un mensaje (opcionalmente ligado a una solicitud) y actualiza ultimo_mensaje_at.
export async function postMensaje(
  supabase: SupabaseClient,
  {
    hiloId,
    autorId,
    autorTipo,
    cuerpo,
    solicitudId,
  }: {
    hiloId: string;
    autorId: string;
    autorTipo: 'profesor' | 'alumno';
    cuerpo: string;
    solicitudId?: string | null;
  },
) {
  await supabase.from('mensajes').insert({
    hilo_id: hiloId,
    autor_id: autorId,
    autor_tipo: autorTipo,
    cuerpo,
    solicitud_id: solicitudId ?? null,
  });
  await supabase
    .from('mensajes_hilos')
    .update({ ultimo_mensaje_at: new Date().toISOString() })
    .eq('id', hiloId);
}
