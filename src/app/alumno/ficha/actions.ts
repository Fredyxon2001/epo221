'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const CAMPOS_EDITABLES = [
  'email', 'telefono', 'direccion', 'codigo_postal', 'municipio',
  'tutor_nombre', 'tutor_parentesco', 'tutor_telefono', 'tutor_email',
] as const;

const LIMITE_LIBRE = 2;

export type ResultadoFicha = {
  ok?: boolean;
  error?: string;
  modo?: 'aplicada' | 'solicitada';
  restantes?: number;
};

export async function actualizarFicha(formData: FormData): Promise<ResultadoFicha> {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  // Datos actuales del alumno
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id, modificaciones_libres_usadas, ' + CAMPOS_EDITABLES.join(','))
    .eq('perfil_id', user.id)
    .maybeSingle();
  if (!alumno) return { error: 'Ficha no encontrada' };

  // Construir patch sólo con los campos que cambiaron
  const patch: Record<string, string | null> = {};
  const valoresAnteriores: Record<string, any> = {};
  let cambios = 0;
  for (const campo of CAMPOS_EDITABLES) {
    const nuevo = String(formData.get(campo) ?? '').trim() || null;
    const actual = (alumno as any)[campo] ?? null;
    if (nuevo !== actual) {
      patch[campo] = nuevo;
      valoresAnteriores[campo] = actual;
      cambios++;
    }
  }
  if (cambios === 0) {
    return { ok: true, modo: 'aplicada', error: 'Sin cambios para guardar' };
  }

  const motivo = String(formData.get('motivo') ?? '').trim();
  const usadas = (alumno as any).modificaciones_libres_usadas ?? 0;
  const tieneLibres = usadas < LIMITE_LIBRE;

  if (tieneLibres) {
    // Aplicar directo + incrementar contador
    await admin.from('alumnos')
      .update({ ...patch, modificaciones_libres_usadas: usadas + 1 })
      .eq('id', (alumno as any).id);
    revalidatePath('/alumno/ficha');
    revalidatePath('/alumno', 'layout');
    return { ok: true, modo: 'aplicada', restantes: LIMITE_LIBRE - usadas - 1 };
  }

  // Excedió libres → requiere solicitud y aprobación
  if (!motivo || motivo.length < 15) {
    return { error: 'Ya usaste tus 2 modificaciones libres. Para más cambios escribe el motivo (mín. 15 caracteres) y luego acude a Control Escolar para justificarlo.' };
  }
  const { error: insErr } = await admin.from('solicitudes_modificacion_ficha').insert({
    alumno_id: (alumno as any).id,
    cambios: patch,
    valores_anteriores: valoresAnteriores,
    motivo,
  });
  if (insErr) return { error: insErr.message };

  // Notificar al admin/staff/director
  const { data: admins } = await admin.from('perfiles').select('id').in('rol', ['admin', 'staff', 'director']);
  if (admins?.length) {
    await admin.from('notificaciones').insert(
      admins.map((a: any) => ({
        perfil_id: a.id,
        titulo: '📝 Solicitud de modificación de ficha',
        mensaje: `Un alumno excedió sus 2 modificaciones libres y solicita aprobar ${cambios} cambio(s).`,
        url: '/admin/alumnos/solicitudes-ficha',
      }))
    );
  }

  revalidatePath('/alumno/ficha');
  return { ok: true, modo: 'solicitada', restantes: 0 };
}

// Action para admin: aprobar/rechazar
export async function resolverSolicitudFicha(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!perfil || !['admin', 'staff', 'director'].includes(perfil.rol)) return { error: 'No autorizado' };

  const id = String(fd.get('id') ?? '');
  const accion = String(fd.get('accion') ?? '');
  const motivo_rechazo = String(fd.get('motivo_rechazo') ?? '').trim() || null;
  if (!id || !['aprobar', 'rechazar'].includes(accion)) return { error: 'Datos inválidos' };

  const { data: sol } = await supabase
    .from('solicitudes_modificacion_ficha')
    .select('*, alumno:alumnos(id, perfil_id)')
    .eq('id', id).maybeSingle();
  if (!sol) return { error: 'Solicitud no encontrada' };
  if (sol.estado !== 'pendiente') return { error: 'La solicitud ya fue procesada' };

  if (accion === 'aprobar') {
    // Aplicar los cambios al alumno
    await admin.from('alumnos').update(sol.cambios).eq('id', (sol as any).alumno_id);
    await admin.from('solicitudes_modificacion_ficha').update({
      estado: 'aprobada', resuelto_por: user.id, resuelto_at: new Date().toISOString(),
    }).eq('id', id);

    // Notificar al alumno
    const perfilAlumno = (sol as any).alumno?.perfil_id;
    if (perfilAlumno) {
      await admin.from('notificaciones').insert({
        perfil_id: perfilAlumno,
        titulo: '✅ Modificación de ficha aprobada',
        mensaje: 'Los cambios solicitados a tu ficha fueron aprobados por Control Escolar.',
        url: '/alumno/ficha',
      });
    }
  } else {
    await admin.from('solicitudes_modificacion_ficha').update({
      estado: 'rechazada', resuelto_por: user.id, resuelto_at: new Date().toISOString(), motivo_rechazo,
    }).eq('id', id);

    const perfilAlumno = (sol as any).alumno?.perfil_id;
    if (perfilAlumno) {
      await admin.from('notificaciones').insert({
        perfil_id: perfilAlumno,
        titulo: '❌ Solicitud de modificación rechazada',
        mensaje: `Tu solicitud fue rechazada${motivo_rechazo ? ': ' + motivo_rechazo : ''}.`,
        url: '/alumno/ficha',
      });
    }
  }

  revalidatePath('/admin/alumnos/solicitudes-ficha');
  revalidatePath('/alumno/ficha');
  return { ok: true };
}

// Acción del admin para REINICIAR el contador de un alumno (cuando justifica en persona)
export async function reiniciarContadorModificaciones(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!perfil || !['admin', 'staff', 'director'].includes(perfil.rol)) return { error: 'No autorizado' };

  const alumno_id = String(fd.get('alumno_id') ?? '');
  if (!alumno_id) return { error: 'Alumno inválido' };

  await admin.from('alumnos').update({ modificaciones_libres_usadas: 0 }).eq('id', alumno_id);
  revalidatePath('/admin/alumnos/solicitudes-ficha');
  revalidatePath('/admin/alumnos');
  return { ok: true };
}
