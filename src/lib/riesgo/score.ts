// Motor de detección temprana de riesgo académico.
// Combina factores medibles en un score 0-100 con razones explicables.
// Sin LLM — determinista y auditable. Opcionalmente se puede enriquecer con IA después.
import type { SupabaseClient } from '@supabase/supabase-js';

export type Factor = {
  clave: string;
  etiqueta: string;
  peso: number;          // contribución al score 0-100
  detalle: string;
};

export type RiesgoAlumno = {
  alumno_id: string;
  score: number;
  nivel: 'bajo' | 'medio' | 'alto' | 'critico';
  factores: Factor[];
  recomendacion: string;
};

export function nivelDeScore(score: number): RiesgoAlumno['nivel'] {
  if (score >= 75) return 'critico';
  if (score >= 50) return 'alto';
  if (score >= 25) return 'medio';
  return 'bajo';
}

export async function calcularRiesgoCiclo(
  supabase: SupabaseClient,
  cicloId: string,
): Promise<RiesgoAlumno[]> {
  // Alumnos activos del ciclo
  const { data: insc } = await supabase
    .from('inscripciones')
    .select('alumno_id, grupo_id')
    .eq('ciclo_id', cicloId)
    .eq('estatus', 'activa');
  const alumnoIds = Array.from(new Set((insc ?? []).map((i: any) => i.alumno_id)));
  if (!alumnoIds.length) return [];

  // Calificaciones (para promedios y faltas)
  const { data: califs } = await supabase
    .from('calificaciones')
    .select('alumno_id, asignacion_id, p1, p2, p3, faltas_p1, faltas_p2, faltas_p3, promedio_final, asignacion:asignaciones(ciclo_id)')
    .in('alumno_id', alumnoIds);
  const califsCiclo = (califs ?? []).filter((c: any) => c.asignacion?.ciclo_id === cicloId);

  // Conducta negativa reciente (últimos 60 días)
  const desde = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: conductas } = await supabase
    .from('reportes_conducta')
    .select('alumno_id, tipo, fecha')
    .in('alumno_id', alumnoIds)
    .gte('fecha', desde);

  // Tareas del ciclo vs entregadas
  const { data: tareas } = await supabase
    .from('tareas')
    .select('id, asignacion:asignaciones!inner(ciclo_id)')
    .eq('asignacion.ciclo_id', cicloId);
  const tareaIds = (tareas ?? []).map((t: any) => t.id);
  const { data: entregas } = tareaIds.length
    ? await supabase.from('entregas_tarea').select('alumno_id, tarea_id, calificacion').in('tarea_id', tareaIds)
    : { data: [] as any[] };

  // Adeudos (pagos con saldo)
  const { data: pagos } = await supabase
    .from('pagos')
    .select('alumno_id, monto, estado')
    .in('alumno_id', alumnoIds);

  const resultados: RiesgoAlumno[] = [];

  for (const alumnoId of alumnoIds) {
    const factores: Factor[] = [];
    let score = 0;

    // 1) Promedios
    const misCalifs = califsCiclo.filter((c: any) => c.alumno_id === alumnoId);
    const reprobadas = misCalifs.filter((c: any) => c.promedio_final != null && Number(c.promedio_final) < 6);
    const enRiesgo = misCalifs.filter((c: any) => {
      const pm = [c.p1, c.p2, c.p3].filter((x: any) => x != null).map(Number);
      return pm.length && pm.some((v) => v < 6);
    });
    if (reprobadas.length > 0) {
      const peso = Math.min(40, reprobadas.length * 15);
      score += peso;
      factores.push({
        clave: 'reprobadas', etiqueta: `${reprobadas.length} materia(s) reprobada(s)`,
        peso, detalle: 'Promedio final menor a 6.',
      });
    } else if (enRiesgo.length > 0) {
      const peso = Math.min(20, enRiesgo.length * 7);
      score += peso;
      factores.push({
        clave: 'parcial_bajo', etiqueta: `${enRiesgo.length} materia(s) con parcial reprobado`,
        peso, detalle: 'Algún parcial por debajo de 6 — alerta temprana.',
      });
    }

    // 2) Faltas acumuladas
    const totalFaltas = misCalifs.reduce((acc: number, c: any) =>
      acc + (Number(c.faltas_p1 ?? 0) + Number(c.faltas_p2 ?? 0) + Number(c.faltas_p3 ?? 0)), 0);
    if (totalFaltas > 20) {
      score += 25;
      factores.push({ clave: 'faltas_criticas', etiqueta: `${totalFaltas} faltas acumuladas`, peso: 25, detalle: 'Supera el umbral SEIEM — riesgo de perder derecho a examen.' });
    } else if (totalFaltas > 10) {
      score += 12;
      factores.push({ clave: 'faltas_altas', etiqueta: `${totalFaltas} faltas acumuladas`, peso: 12, detalle: 'Inasistencia por encima del promedio.' });
    }

    // 3) Conducta
    const neg = (conductas ?? []).filter((r: any) => r.alumno_id === alumnoId && r.tipo === 'negativo').length;
    if (neg >= 3) {
      score += 15;
      factores.push({ clave: 'conducta', etiqueta: `${neg} reportes de conducta recientes`, peso: 15, detalle: 'Patrón reiterado en los últimos 60 días.' });
    } else if (neg >= 1) {
      score += 6;
      factores.push({ clave: 'conducta_leve', etiqueta: `${neg} reporte(s) de conducta`, peso: 6, detalle: 'Incidencia reciente.' });
    }

    // 4) Tareas no entregadas
    const misEntregas = new Set((entregas ?? []).filter((e: any) => e.alumno_id === alumnoId).map((e: any) => e.tarea_id));
    const sinEntregar = tareaIds.filter((tid) => !misEntregas.has(tid));
    if (tareaIds.length >= 3 && sinEntregar.length / tareaIds.length > 0.4) {
      const peso = 15;
      score += peso;
      factores.push({
        clave: 'tareas_incompletas',
        etiqueta: `${sinEntregar.length}/${tareaIds.length} tareas sin entregar`,
        peso, detalle: 'Menos del 60% de entregas registradas.',
      });
    }

    // 5) Adeudo financiero
    const adeudoPendiente = (pagos ?? []).filter((p: any) => p.alumno_id === alumnoId && p.estado === 'pendiente').length;
    if (adeudoPendiente >= 2) {
      score += 8;
      factores.push({ clave: 'adeudo', etiqueta: `${adeudoPendiente} pagos pendientes`, peso: 8, detalle: 'Varios pagos sin saldar.' });
    }

    score = Math.min(100, score);
    const nivel = nivelDeScore(score);

    // Recomendación
    const recomendacion = recomendarAcciones(nivel, factores);

    resultados.push({ alumno_id: alumnoId, score, nivel, factores, recomendacion });
  }

  return resultados;
}

function recomendarAcciones(nivel: RiesgoAlumno['nivel'], factores: Factor[]): string {
  if (nivel === 'bajo') return 'Sin acciones urgentes. Mantener seguimiento ordinario.';
  const claves = new Set(factores.map((f) => f.clave));
  const acciones: string[] = [];
  if (claves.has('reprobadas') || claves.has('parcial_bajo')) acciones.push('canalizar a tutoría académica y revisar planes de recuperación');
  if (claves.has('faltas_altas') || claves.has('faltas_criticas')) acciones.push('citar al tutor para explicar inasistencias');
  if (claves.has('conducta') || claves.has('conducta_leve')) acciones.push('intervención de orientación con seguimiento quincenal');
  if (claves.has('tareas_incompletas')) acciones.push('acuerdo pedagógico y plan de entregas');
  if (claves.has('adeudo')) acciones.push('derivar a administración para plan de pagos');
  if (!acciones.length) acciones.push('dar seguimiento cercano con el grupo orientador');
  const prefijo = nivel === 'critico' ? '🚨 Caso crítico:' : nivel === 'alto' ? '⚠️ Riesgo alto:' : '💡 Riesgo medio:';
  return `${prefijo} ${acciones.join('; ')}.`;
}
