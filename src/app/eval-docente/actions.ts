'use server';
// Evaluación docente por alumnos (anónima).
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function crearPeriodoEval(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!perfil || !['admin', 'staff', 'director'].includes(perfil.rol)) return { error: 'Sin permiso' };

  const nombre = String(fd.get('nombre') ?? '').trim();
  const instrucciones = String(fd.get('instrucciones') ?? '').trim() || null;
  const abierta_desde = String(fd.get('abierta_desde') ?? '');
  const abierta_hasta = String(fd.get('abierta_hasta') ?? '');
  const escala_max = Number(fd.get('escala_max') ?? 5);
  const dimensionesRaw = String(fd.get('dimensiones') ?? '');

  if (!nombre || !abierta_hasta) return { error: 'Datos incompletos' };

  // dimensiones: multilínea "clave|texto"
  const dimensiones = dimensionesRaw.split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => {
    const [clave, texto] = l.includes('|') ? l.split('|') : [`dim${i+1}`, l];
    return { clave: clave.trim(), texto: (texto ?? clave).trim() };
  });

  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  const { error } = await supabase.from('eval_docente_periodos').insert({
    ciclo_id: ciclo?.id ?? null,
    nombre, instrucciones,
    abierta_desde: abierta_desde ? new Date(abierta_desde).toISOString() : new Date().toISOString(),
    abierta_hasta: new Date(abierta_hasta).toISOString(),
    dimensiones, escala_max,
    created_by: user.id, activa: true,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/eval-docente');
  return { ok: true };
}

export async function cerrarPeriodoEval(id: string) {
  const supabase = createClient();
  await supabase.from('eval_docente_periodos').update({ activa: false }).eq('id', id);
  revalidatePath('/admin/eval-docente');
}

export async function responderEval(fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: al } = await supabase.from('alumnos').select('id').eq('perfil_id', user.id).maybeSingle();
  if (!al) return { error: 'No eres alumno' };

  const periodo_id = String(fd.get('periodo_id') ?? '');
  const asignacion_id = String(fd.get('asignacion_id') ?? '');
  const comentario = String(fd.get('comentario') ?? '').trim() || null;
  if (!periodo_id || !asignacion_id) return { error: 'Datos incompletos' };

  // Validar periodo abierto
  const { data: per } = await supabase.from('eval_docente_periodos').select('*').eq('id', periodo_id).maybeSingle();
  if (!per?.activa) return { error: 'Periodo cerrado' };
  const ahora = new Date();
  if (new Date(per.abierta_desde) > ahora || new Date(per.abierta_hasta) < ahora) return { error: 'Fuera del rango del periodo' };

  // Recolectar respuestas por dimensión
  const respuestas: Record<string, number> = {};
  for (const d of (per.dimensiones ?? []) as any[]) {
    const val = Number(fd.get(`r_${d.clave}`));
    if (!val || val < 1 || val > per.escala_max) return { error: `Responde "${d.texto}"` };
    respuestas[d.clave] = val;
  }

  // Hash anónimo
  const alumno_hash = crypto.createHash('md5').update(`${al.id}::${periodo_id}::${asignacion_id}`).digest('hex');

  const { error } = await supabase.from('eval_docente_respuestas').insert({
    periodo_id, asignacion_id, alumno_hash, respuestas, comentario,
  });
  if (error) {
    if (String(error.message).toLowerCase().includes('duplicate')) return { error: 'Ya respondiste esta evaluación' };
    return { error: error.message };
  }

  revalidatePath('/alumno/eval-docente');
  return { ok: true };
}
