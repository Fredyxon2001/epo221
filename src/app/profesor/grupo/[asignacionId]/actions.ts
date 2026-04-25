'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const toNum = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s === '' ? null : Number(s);
};

/**
 * Devuelve qué parciales están abiertos para captura HOY según parciales_config.
 * Si no hay config, asume todos abiertos (compatibilidad).
 */
async function parcialesAbiertos(cicloId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('parciales_config')
    .select('numero, abre_captura, cierra_captura')
    .eq('ciclo_id', cicloId);
  const hoy = new Date().toISOString().slice(0, 10);
  const abierto: Record<number, boolean> = { 1: true, 2: true, 3: true };
  for (const p of data ?? []) {
    const abre = p.abre_captura ?? null;
    const cierra = p.cierra_captura ?? null;
    abierto[p.numero] = (!abre || hoy >= abre) && (!cierra || hoy <= cierra);
  }
  return abierto;
}

export async function guardarCalificaciones(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const asignacionId = String(formData.get('asignacion_id'));
  const n = Number(formData.get('n') ?? 0);

  // Obtener ciclo_id de la asignación para chequear bloqueo
  const { data: asig } = await supabase
    .from('asignaciones')
    .select('ciclo_id')
    .eq('id', asignacionId)
    .single();
  const cicloId = (asig as any)?.ciclo_id;
  const abierto = cicloId ? await parcialesAbiertos(cicloId) : { 1: true, 2: true, 3: true };

  const rows = Array.from({ length: n }, (_, i) => {
    const base: any = {
      alumno_id: String(formData.get(`alumno_${i}`)),
      asignacion_id: asignacionId,
      capturado_por: user.id,
    };
    if (abierto[1]) {
      base.p1 = toNum(formData.get(`p1_${i}`));
      base.faltas_p1 = toNum(formData.get(`f1_${i}`)) ?? 0;
    }
    if (abierto[2]) {
      base.p2 = toNum(formData.get(`p2_${i}`));
      base.faltas_p2 = toNum(formData.get(`f2_${i}`)) ?? 0;
    }
    if (abierto[3]) {
      base.p3 = toNum(formData.get(`p3_${i}`));
      base.faltas_p3 = toNum(formData.get(`f3_${i}`)) ?? 0;
    }
    // Extraordinarios siempre aceptados (bloqueo es por parcial ordinario)
    base.e1 = toNum(formData.get(`e1_${i}`));
    base.folio_e1 = String(formData.get(`folio_${i}`) ?? '') || null;
    return base;
  }).filter((r) => r.alumno_id);

  await supabase.from('calificaciones').upsert(rows, {
    onConflict: 'alumno_id,asignacion_id',
  });

  revalidatePath(`/profesor/grupo/${asignacionId}`);
}

export async function exportarCSV(formData: FormData) {
  const supabase = createClient();
  const asignacionId = String(formData.get('asignacion_id'));

  const { data: asig } = await supabase
    .from('asignaciones')
    .select(`
      id, grupo_id, ciclo_id,
      materia:materias(nombre, horas_semestrales),
      grupo:grupos(grado, semestre, grupo, carrera),
      ciclo:ciclos_escolares(codigo, periodo)
    `).eq('id', asignacionId).single();

  const { data: alumnos } = await supabase
    .from('inscripciones')
    .select(`alumno:alumnos(id, curp, nombre, apellido_paterno, apellido_materno)`)
    .eq('grupo_id', (asig as any)?.grupo_id)
    .eq('ciclo_id', (asig as any)?.ciclo_id);

  const ids = (alumnos ?? []).map((a: any) => a.alumno.id);
  const { data: califs } = await supabase
    .from('calificaciones').select('*').eq('asignacion_id', asignacionId).in('alumno_id', ids);

  const cct = process.env.NEXT_PUBLIC_ESCUELA_CCT ?? '15EBH0409B';
  const m = asig as any;

  const header = [
    'curp','nombre','apellidoPaterno','apellidoMaterno',
    'faltasP1','faltasP2','faltasP3','calificacionP1','calificacionP2','calificacionP3',
    'calificacionE1','folioE1','calificacionE2','folioE2','calificacionE3','folioE3','calificacionE4','folioE4',
    'horasSemestrales','nombreUAC','idAsignacion','cct','cicloEscolar','periodo','carrera',
    'idEstudiante','grado','semestre','grupo',
  ];

  const rows = (alumnos ?? []).map((r: any) => {
    const a = r.alumno;
    const c = (califs ?? []).find((x: any) => x.alumno_id === a.id) ?? {} as any;
    return [
      a.curp, a.nombre, a.apellido_paterno, a.apellido_materno ?? '',
      c.faltas_p1 ?? 0, c.faltas_p2 ?? 0, c.faltas_p3 ?? 0,
      c.p1 ?? 0, c.p2 ?? 0, c.p3 ?? 0,
      c.e1 ?? 0, c.folio_e1 ?? '-',
      c.e2 ?? 0, c.folio_e2 ?? '-',
      c.e3 ?? 0, c.folio_e3 ?? '-',
      c.e4 ?? 0, c.folio_e4 ?? '-',
      m?.materia?.horas_semestrales ?? 0, m?.materia?.nombre,
      asignacionId, cct, m?.ciclo?.codigo, m?.ciclo?.periodo, m?.grupo?.carrera,
      a.id, m?.grupo?.grado, m?.grupo?.semestre, m?.grupo?.grupo,
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
  });

  const csv = [header.join(','), ...rows].join('\n');
  const fileName = `${cct}_${m?.ciclo?.codigo}_${m?.grupo?.semestre}_${m?.grupo?.grupo}_${m?.materia?.nombre?.toUpperCase()} CALIFICACIONES.csv`;

  const path = `exports/${asignacionId}-${Date.now()}.csv`;
  await supabase.storage.from('exports').upload(path, new Blob([csv], { type: 'text/csv' }), {
    contentType: 'text/csv',
  });
  const { data: signed } = await supabase.storage.from('exports')
    .createSignedUrl(path, 60, { download: fileName });

  if (signed?.signedUrl) {
    const { redirect } = await import('next/navigation');
    redirect(signed.signedUrl);
  }
}
