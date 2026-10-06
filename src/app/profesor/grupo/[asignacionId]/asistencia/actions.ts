'use server';
import { requireResource, requireAttempt, requireProfessor, requireReportOrientation } from '@/lib/security/resources';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';
import { requireRoster } from '@/lib/security/resources';


import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Guarda la asistencia del día para todos los alumnos del grupo.
// Espera campos: asignacion_id, fecha, estado_<alumnoId>=presente|falta|retardo|justificada
export async function guardarAsistencia(formData: FormData): Promise<void> {
  await requireAccess(["profesor","admin","staff","director"], "profesor/grupo/[asignacionId]/asistencia/actions.ts:guardarAsistencia");
  await validateFormData(formData);
  await requireResource("asignaciones", formData.get("asignacion_id"), false);


  const auth = (await createClient());
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();

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
    await requireRoster(asignacionId, filas.map(row => row.alumno_id));
    if (filas.some(row => !['presente','falta','retardo','justificada'].includes(row.estado))) throw new Error('Estado de asistencia inválido.');
    // Borra asistencias de ese día y re-inserta (idempotente por día)
    const ids = filas.map((f) => f.alumno_id);
    await supabase.from('asistencias')
      .delete().eq('asignacion_id', asignacionId).eq('fecha', fecha).in('alumno_id', ids);
    await supabase.from('asistencias').insert(filas);
  }

  revalidatePath(`/profesor/grupo/${asignacionId}/asistencia`);
  redirect(`/profesor/grupo/${asignacionId}/asistencia?ok=Asistencia+guardada&fecha=${fecha}`);
}
