'use server';
// Solicitudes de apertura/creación de parcial (maestro → admin)
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function solicitarParcial(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const auth = createClient();
  const supabase = adminClient();
  const admin = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const numero = Number(fd.get('numero') ?? 0);
  const motivo = String(fd.get('motivo') ?? '').trim();
  const nombre_sugerido = String(fd.get('nombre_sugerido') ?? '').trim() || null;
  const fecha_abre_sugerida = String(fd.get('fecha_abre_sugerida') ?? '').trim() || null;
  const fecha_cierra_sugerida = String(fd.get('fecha_cierra_sugerida') ?? '').trim() || null;
  const asignacion_id = String(fd.get('asignacion_id') ?? '').trim() || null;

  if (!numero || numero < 1 || numero > 6) return { error: 'Número de parcial inválido (1-6)' };
  if (!motivo || motivo.length < 10) return { error: 'Motivo muy corto (mín. 10 caracteres)' };

  // Ciclo activo
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();
  if (!ciclo) return { error: 'No hay ciclo activo' };

  // Si especificó asignacion_id, verificar que sea suya
  if (asignacion_id) {
    const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
    if (!prof) return { error: 'No eres profesor' };
    const { data: asig } = await supabase.from('asignaciones').select('id').eq('id', asignacion_id).eq('profesor_id', prof.id).maybeSingle();
    if (!asig) return { error: 'Esa asignación no es tuya' };
  }

  const { data: sol, error } = await supabase.from('solicitudes_parcial').insert({
    ciclo_id: ciclo.id,
    asignacion_id,
    numero,
    nombre_sugerido,
    motivo,
    fecha_abre_sugerida,
    fecha_cierra_sugerida,
    solicitado_por: user.id,
  }).select('id').single();
  if (error) return { error: error.message };

  // Notificar a admin/staff/director
  const { data: admins } = await admin.from('perfiles').select('id').in('rol', ['admin', 'staff', 'director']);
  if (admins?.length) {
    await admin.from('notificaciones').insert(
      admins.map((a: any) => ({
        perfil_id: a.id,
        titulo: '📋 Solicitud de parcial pendiente',
        mensaje: `Un profesor solicitó apertura del Parcial ${numero}. Revisa motivo y aprueba o rechaza.`,
        url: '/admin/parciales/solicitudes',
      }))
    );
  }

  revalidatePath('/admin/parciales/solicitudes');
  return { ok: true };
}

export async function resolverSolicitudParcial(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const auth = createClient();
  const supabase = adminClient();
  const admin = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!perfil || !['admin', 'staff', 'director'].includes(perfil.rol)) return { error: 'No autorizado' };

  const id = String(fd.get('id') ?? '');
  const accion = String(fd.get('accion') ?? ''); // 'aprobar' | 'rechazar'
  const motivo_rechazo = String(fd.get('motivo_rechazo') ?? '').trim() || null;
  if (!id || !['aprobar', 'rechazar'].includes(accion)) return { error: 'Datos inválidos' };

  const { data: sol } = await supabase
    .from('solicitudes_parcial')
    .select('*')
    .eq('id', id).maybeSingle();
  if (!sol) return { error: 'Solicitud no encontrada' };
  if (sol.estado !== 'pendiente') return { error: 'La solicitud ya fue procesada' };

  if (accion === 'aprobar') {
    // Upsert parciales_config con los datos sugeridos
    const { error: upErr } = await admin.from('parciales_config').upsert({
      ciclo_id: sol.ciclo_id,
      numero: sol.numero,
      nombre: sol.nombre_sugerido || `Parcial ${sol.numero}`,
      abre_captura: sol.fecha_abre_sugerida,
      cierra_captura: sol.fecha_cierra_sugerida,
      publicado: false,
    }, { onConflict: 'ciclo_id,numero' });
    if (upErr) return { error: upErr.message };

    await supabase.from('solicitudes_parcial').update({
      estado: 'aprobada',
      resuelto_por: user.id,
      resuelto_at: new Date().toISOString(),
    }).eq('id', id);

    // Notificar al solicitante
    await admin.from('notificaciones').insert({
      perfil_id: sol.solicitado_por,
      titulo: '✅ Solicitud de parcial aprobada',
      mensaje: `Tu solicitud del Parcial ${sol.numero} fue aprobada. Ya puedes capturar calificaciones.`,
      url: '/profesor/calificaciones-proponer',
    });
  } else {
    await supabase.from('solicitudes_parcial').update({
      estado: 'rechazada',
      resuelto_por: user.id,
      resuelto_at: new Date().toISOString(),
      motivo_rechazo,
    }).eq('id', id);

    await admin.from('notificaciones').insert({
      perfil_id: sol.solicitado_por,
      titulo: '❌ Solicitud de parcial rechazada',
      mensaje: `Tu solicitud del Parcial ${sol.numero} fue rechazada${motivo_rechazo ? ': ' + motivo_rechazo : ''}.`,
      url: '/profesor/calificaciones-proponer',
    });
  }

  revalidatePath('/admin/parciales/solicitudes');
  revalidatePath('/admin/parciales');
  revalidatePath('/profesor/calificaciones-proponer');
  return { ok: true };
}
