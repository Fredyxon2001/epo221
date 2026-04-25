'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Guarda la asistencia del día para todos los alumnos del grupo.
// Espera campos: asignacion_id, fecha, estado_<alumnoId>=presente|falta|retardo|justificada
export async function guardarAsistencia(formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const asignacionId = String(formData.get('asignacion_id'));
  const fecha = String(formData.get('fecha'));
  if (!asignacionId || !fecha) redirect(`/profesor/grupo/${asignacionId}/asistencia?error=Faltan+datos`);

  const filas: any[] = [];
  for (const [k, v] of formData.entries()) {
    if (k.startsWith('estado_')) {
      const alumnoId = k.slice('estado_'.length);
      filas.push({
        asignacion_id: asignacionId,
        alumno_id: alumnoId,
        fecha,
        estado: String(v),
        capturado_por: user?.id ?? null,
      });
    }
  }

  if (filas.length) {
    // Borra asistencias de ese día y re-inserta (idempotente por día)
    const ids = filas.map((f) => f.alumno_id);
    await supabase.from('asistencias')
      .delete().eq('asignacion_id', asignacionId).eq('fecha', fecha).in('alumno_id', ids);
    await supabase.from('asistencias').insert(filas);
  }

  revalidatePath(`/profesor/grupo/${asignacionId}/asistencia`);
  redirect(`/profesor/grupo/${asignacionId}/asistencia?ok=Asistencia+guardada&fecha=${fecha}`);
}
