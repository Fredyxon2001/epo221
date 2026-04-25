'use server';
// Solicitud de examen extraordinario/recuperación por parte del alumno.
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function solicitarExtraordinario(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: al } = await supabase.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!al) return { error: 'No eres alumno' };

  const asignacion_id = String(fd.get('asignacion_id') ?? '');
  const tipo = String(fd.get('tipo') ?? 'recuperacion') as any;
  const motivo = String(fd.get('motivo') ?? '').trim();

  if (!asignacion_id) return { error: 'Selecciona la materia' };
  if (motivo.length < 15) return { error: 'Describe mejor el motivo' };

  // Evitar duplicado abierto
  const { data: exist } = await supabase.from('examenes_extraordinarios')
    .select('id').eq('alumno_id', al.id).eq('asignacion_id', asignacion_id).eq('tipo', tipo)
    .in('estado', ['solicitado', 'pago_pendiente', 'pagado', 'agendado']).maybeSingle();
  if (exist) return { error: 'Ya tienes una solicitud abierta para esta materia' };

  const { error } = await supabase.from('examenes_extraordinarios').insert({
    alumno_id: al.id, asignacion_id, tipo, motivo, estado: 'solicitado',
  });
  if (error) return { error: error.message };

  revalidatePath('/alumno/extraordinarios');
  return { ok: true };
}

export async function procesarExtraordinario(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!perfil || !['admin', 'staff', 'director'].includes(perfil.rol)) return { error: 'Sin permiso' };

  const id = String(fd.get('id') ?? '');
  const estado = String(fd.get('estado') ?? '') as any;
  const monto = fd.get('monto') ? Number(fd.get('monto')) : null;
  const referencia_pago = String(fd.get('referencia_pago') ?? '').trim() || null;
  const fecha_examen = String(fd.get('fecha_examen') ?? '') || null;
  const calificacion = fd.get('calificacion') ? Number(fd.get('calificacion')) : null;
  const observaciones = String(fd.get('observaciones') ?? '').trim() || null;

  if (!id || !estado) return { error: 'Datos incompletos' };

  const patch: any = { estado, observaciones };
  if (monto != null) patch.monto = monto;
  if (referencia_pago) patch.referencia_pago = referencia_pago;
  if (fecha_examen) patch.fecha_examen = new Date(fecha_examen).toISOString();
  if (calificacion != null) patch.calificacion = calificacion;

  const { error } = await supabase.from('examenes_extraordinarios').update(patch).eq('id', id);
  if (error) return { error: error.message };

  // Notificar al alumno
  const { data: ex } = await supabase.from('examenes_extraordinarios')
    .select('alumno_id').eq('id', id).maybeSingle();
  if (ex) {
    const { data: al } = await supabase.from('alumnos').select('perfil_id').eq('id', ex.alumno_id).maybeSingle();
    if (al?.perfil_id) {
      await supabase.from('notificaciones').insert({
        user_id: al.perfil_id,
        tipo: 'extraordinario',
        titulo: `Actualización de tu extraordinario`,
        mensaje: `Estado: ${estado}${fecha_examen ? ` · Fecha: ${new Date(fecha_examen).toLocaleDateString('es-MX')}` : ''}`,
        url: `/alumno/extraordinarios`,
      });
    }
  }

  revalidatePath('/admin/extraordinarios');
  return { ok: true };
}
