'use server';
// El maestro de la asignación PROPONE calificaciones por parcial.
// Luego el orientador del grupo las valida y se aplican a `calificaciones`.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';

export async function enviarPropuestasCalificaciones(fd: FormData): Promise<{ ok?: boolean; error?: string; total?: number }> {
  const auth = createClient();
  const supabase = adminClient();
  const admin = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const asignacion_id = String(fd.get('asignacion_id') ?? '');
  const parcial = Number(fd.get('parcial') ?? 1);
  const observaciones = String(fd.get('observaciones') ?? '').trim() || null;
  if (!asignacion_id || ![1, 2, 3].includes(parcial)) return { error: 'Datos inválidos' };

  // Verificar que el user es el maestro de la asignación
  const { data: asig } = await supabase
    .from('asignaciones')
    .select('id, profesor_id, profesor:profesores(perfil_id), grupo:grupos(orientador_id, orientador:profesores(perfil_id))')
    .eq('id', asignacion_id).maybeSingle();
  if (!asig) return { error: 'Asignación no existe' };
  if ((asig as any).profesor?.perfil_id !== user.id) return { error: 'No eres el maestro de esta asignación' };

  // Recolectar entradas: campos calificacion_<alumnoId> y faltas_<alumnoId>
  const entries: Array<{ alumno_id: string; calificacion: number | null; faltas: number }> = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('calificacion_')) {
      const alumnoId = k.replace('calificacion_', '');
      const cal = String(v).trim();
      const faltasStr = String(fd.get(`faltas_${alumnoId}`) ?? '0').trim();
      const calificacion = cal === '' ? null : Number(cal);
      const faltas = Number(faltasStr || 0);
      if (calificacion !== null && (calificacion < 0 || calificacion > 10)) {
        return { error: `Calificación inválida para alumno ${alumnoId}: ${cal}` };
      }
      entries.push({ alumno_id: alumnoId, calificacion, faltas });
    }
  }
  if (!entries.length) return { error: 'Sin filas para enviar' };

  // Detectar cuáles alumnos ya tienen calificación VALIDADA para este parcial+asignación
  // Si la tienen → será una MODIFICACIÓN (requiere aprobación explícita del orientador con valor anterior)
  const alumnoIds = entries.map((e) => e.alumno_id);
  const { data: validadasPrev } = await supabase
    .from('calificaciones_propuestas')
    .select('alumno_id, calificacion, faltas')
    .eq('asignacion_id', asignacion_id)
    .eq('parcial', parcial)
    .eq('estado', 'validada')
    .in('alumno_id', alumnoIds);

  const mapValidadas = new Map<string, { calificacion: number | null; faltas: number | null }>();
  for (const v of validadasPrev ?? []) {
    mapValidadas.set((v as any).alumno_id, {
      calificacion: (v as any).calificacion, faltas: (v as any).faltas,
    });
  }

  // Saltar entradas idénticas a la última validada (sin cambio = nada que hacer)
  // y separar entre propuestas nuevas y modificaciones
  const rows: any[] = [];
  let nuevas = 0, modificaciones = 0, sinCambio = 0;
  for (const e of entries) {
    const previa = mapValidadas.get(e.alumno_id);
    if (previa) {
      // Si el valor es idéntico al validado, NO crear propuesta
      const sameCal = Number(previa.calificacion ?? -99) === Number(e.calificacion ?? -99);
      const sameFaltas = Number(previa.faltas ?? 0) === Number(e.faltas ?? 0);
      if (sameCal && sameFaltas) { sinCambio++; continue; }
      modificaciones++;
      rows.push({
        alumno_id: e.alumno_id, asignacion_id, parcial,
        calificacion: e.calificacion, faltas: e.faltas,
        observaciones, estado: 'pendiente', propuesta_por: user.id,
        es_modificacion: true,
        valor_anterior: { calificacion: previa.calificacion, faltas: previa.faltas },
      });
    } else {
      nuevas++;
      rows.push({
        alumno_id: e.alumno_id, asignacion_id, parcial,
        calificacion: e.calificacion, faltas: e.faltas,
        observaciones, estado: 'pendiente', propuesta_por: user.id,
        es_modificacion: false,
      });
    }
  }

  if (!rows.length) {
    return { ok: true, total: 0, error: `Sin cambios detectados (${sinCambio} alumnos ya tenían esos mismos valores validados)` };
  }

  const { error } = await admin.from('calificaciones_propuestas').insert(rows);
  if (error) return { error: error.message };

  // Notificar al orientador del grupo (mensajes distintos según haya modificaciones)
  const orientadorPerfilId = (asig as any).grupo?.orientador?.perfil_id;
  if (orientadorPerfilId) {
    const partes: string[] = [];
    if (nuevas) partes.push(`${nuevas} calificación(es) nueva(s)`);
    if (modificaciones) partes.push(`${modificaciones} MODIFICACIÓN(es) de validadas`);
    const titulo = modificaciones > 0
      ? '🔄 Modificaciones de calificaciones — requieren tu aprobación'
      : '📝 Calificaciones por validar';
    await admin.from('notificaciones').insert({
      perfil_id: orientadorPerfilId,
      titulo,
      mensaje: `Parcial ${parcial}: ${partes.join(' + ')}.`,
      url: '/profesor/orientacion/calificaciones',
    });
  }

  revalidatePath('/profesor/calificaciones-proponer');
  revalidatePath('/profesor/orientacion/calificaciones');
  return { ok: true, total: rows.length };
}

export async function validarPropuesta(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const auth = createClient();
  const supabase = adminClient();
  const admin = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const id = String(fd.get('id') ?? '');
  const accion = String(fd.get('accion') ?? '');
  const motivo = String(fd.get('motivo') ?? '').trim() || null;
  if (!id || !['validar', 'rechazar'].includes(accion)) return { error: 'Datos inválidos' };

  // Verificar que el user es orientador del grupo de esta propuesta
  const { data: prop } = await supabase
    .from('calificaciones_propuestas')
    .select('id, estado, alumno_id, asignacion_id, parcial, propuesta_por, calificacion, es_modificacion, valor_anterior, alumno:alumnos(perfil_id, nombre), asignacion:asignaciones(materia:materias(nombre), grupo:grupos(orientador:profesores(perfil_id)))')
    .eq('id', id).maybeSingle();
  if (!prop) return { error: 'Propuesta no encontrada' };
  if ((prop as any).asignacion?.grupo?.orientador?.perfil_id !== user.id) {
    return { error: 'No eres el orientador del grupo' };
  }
  if (prop.estado !== 'pendiente') return { error: 'La propuesta ya fue procesada' };

  const materia = (prop as any).asignacion?.materia?.nombre ?? 'la materia';
  const alumnoPerfilId = (prop as any).alumno?.perfil_id;

  if (accion === 'validar') {
    const { error } = await supabase
      .from('calificaciones_propuestas')
      .update({ estado: 'validada', validada_por: user.id, validada_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };

    // Aplicar a calificaciones
    const { error: rpcErr } = await supabase.rpc('aplicar_propuesta_calificacion', { p_propuesta_id: id });
    if (rpcErr) return { error: rpcErr.message };

    const esMod = (prop as any).es_modificacion;
    const valAnt = (prop as any).valor_anterior;
    const cambio = esMod && valAnt ? ` (cambio de ${valAnt.calificacion ?? '—'} → ${prop.calificacion ?? '—'})` : '';
    // Notificar al maestro
    const noti: any[] = [{
      perfil_id: prop.propuesta_por,
      titulo: esMod ? '✅ Modificación aprobada' : '✅ Calificación validada',
      mensaje: `El orientador ${esMod ? 'aprobó la modificación' : 'validó tu propuesta'} de ${materia}, parcial ${prop.parcial}${cambio}.`,
      url: '/profesor/calificaciones-proponer',
    }];
    // Notificar al alumno (si tiene perfil para login)
    if (alumnoPerfilId) {
      noti.push({
        perfil_id: alumnoPerfilId,
        titulo: '📊 Nueva calificación disponible',
        mensaje: `Ya está disponible tu calificación de ${materia}, parcial ${prop.parcial}: ${prop.calificacion ?? '—'}.`,
        url: '/alumno/calificaciones',
      });
    }
    await admin.from('notificaciones').insert(noti);
  } else {
    const { error } = await supabase
      .from('calificaciones_propuestas')
      .update({ estado: 'rechazada', validada_por: user.id, validada_at: new Date().toISOString(), motivo_rechazo: motivo })
      .eq('id', id);
    if (error) return { error: error.message };

    await admin.from('notificaciones').insert({
      perfil_id: prop.propuesta_por,
      titulo: '❌ Calificación rechazada',
      mensaje: `El orientador rechazó tu propuesta del parcial ${prop.parcial}${motivo ? ': ' + motivo : ''}.`,
      url: '/profesor/calificaciones-proponer',
    });
  }

  revalidatePath('/profesor/orientacion/calificaciones');
  revalidatePath('/profesor/calificaciones-proponer');
  return { ok: true };
}

export async function validarLote(fd: FormData): Promise<{ ok?: boolean; error?: string; total?: number }> {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const ids = fd.getAll('ids[]').map((x) => String(x));
  if (!ids.length) return { error: 'Sin propuestas seleccionadas' };

  let total = 0;
  for (const id of ids) {
    const f = new FormData();
    f.set('id', id);
    f.set('accion', 'validar');
    const r = await validarPropuesta(f);
    if (r.ok) total++;
  }
  return { ok: true, total };
}

// ===================================================================
// IMPORTAR XLSX: el maestro sube el archivo precargado con las calificaciones
// Reutiliza enviarPropuestasCalificaciones para mantener una sola lógica.
// ===================================================================
export async function importarCalificacionesXLSX(fd: FormData): Promise<{
  ok?: boolean; error?: string; total?: number; saltados?: number;
}> {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };

  const asignacion_id = String(fd.get('asignacion_id') ?? '');
  const parcial = Number(fd.get('parcial') ?? 1);
  const observaciones = String(fd.get('observaciones') ?? '').trim() || null;
  const archivo = fd.get('archivo') as File | null;
  if (!archivo || !(archivo as any).size) return { error: 'Sin archivo' };
  if (!asignacion_id) return { error: 'Asignación inválida' };
  if (![1, 2, 3].includes(parcial)) return { error: 'Parcial inválido' };

  // Leer el XLSX
  let filas: any[] = [];
  try {
    const buf = await (archivo as any).arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    // Buscar hoja CALIFICACIONES o la primera
    const sheetName = wb.SheetNames.find((n) => n.toUpperCase().includes('CALIF')) ?? wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    filas = XLSX.utils.sheet_to_json<any>(ws, { defval: null });
  } catch (e: any) {
    return { error: 'Archivo corrupto o formato inválido' };
  }
  if (!filas.length) return { error: 'El archivo está vacío' };

  // Resolver alumno_id por matrícula (la plantilla trae MATRICULA en columna A)
  const matriculas = filas.map((f) => String(f['MATRICULA'] ?? f['Matricula'] ?? f['matricula'] ?? '').trim()).filter(Boolean);
  if (!matriculas.length) return { error: 'No se detectó la columna MATRICULA en el archivo' };

  const { data: alumnos } = await supabase
    .from('alumnos').select('id, matricula').in('matricula', matriculas);
  const matMap = new Map<string, string>();
  for (const a of alumnos ?? []) matMap.set(String((a as any).matricula), (a as any).id);

  // Construir FormData equivalente para reusar enviarPropuestasCalificaciones
  const inner = new FormData();
  inner.set('asignacion_id', asignacion_id);
  inner.set('parcial', String(parcial));
  if (observaciones) inner.set('observaciones', observaciones);

  let agregados = 0;
  let saltados = 0;
  for (const f of filas) {
    const mat = String(f['MATRICULA'] ?? f['Matricula'] ?? f['matricula'] ?? '').trim();
    if (!mat) { saltados++; continue; }
    const alumnoId = matMap.get(mat);
    if (!alumnoId) { saltados++; continue; }
    const cal = f['CALIFICACION (0-10)'] ?? f['CALIFICACION'] ?? f['Calificacion'] ?? f['calificacion'];
    if (cal === null || cal === undefined || String(cal).trim() === '') { saltados++; continue; }
    const calNum = Number(cal);
    if (isNaN(calNum) || calNum < 0 || calNum > 10) { saltados++; continue; }
    const faltas = f['FALTAS'] ?? f['Faltas'] ?? f['faltas'] ?? 0;
    inner.set(`calificacion_${alumnoId}`, String(calNum));
    inner.set(`faltas_${alumnoId}`, String(Number(faltas) || 0));
    agregados++;
  }

  if (!agregados) {
    return { error: `Ningún alumno válido en el archivo (saltados: ${saltados}). Verifica las matrículas.` };
  }

  const r = await enviarPropuestasCalificaciones(inner);
  if (r?.error && !r.ok) return { error: r.error };
  return { ok: true, total: r?.total ?? agregados, saltados };
}
