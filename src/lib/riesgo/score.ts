// Deterministic early follow-up. Financial status never changes the academic score.
import type { SupabaseClient } from '@supabase/supabase-js';
export type Factor = {clave:string;etiqueta:string;peso:number;detalle:string};
export type RiesgoAlumno = {alumno_id:string;score:number;nivel:'bajo'|'medio'|'alto'|'critico';factores:Factor[];recomendacion:string};
export function nivelDeScore(score:number):RiesgoAlumno['nivel'] {
  return score>=75?'critico':score>=50?'alto':score>=25?'medio':'bajo';
}
// Stable pagination avoids PostgREST's row cap; short IN batches avoid URL limits.
async function allRows(query:any):Promise<any[]> {
  const rows:any[]=[];
  for(let offset=0;;offset+=500){
    const result=await query.range(offset,offset+499);
    if(result.error)throw new Error('No se pudo consultar un factor de riesgo. No se guardaron resultados.');
    rows.push(...(result.data??[]));
    if(!result.data || result.data.length<500)return rows;
  }
}
async function batches(ids:string[],query:(slice:string[])=>any):Promise<any[]> {
  const rows:any[]=[];
  for(let offset=0;offset<ids.length;offset+=100) rows.push(...await allRows(query(ids.slice(offset,offset+100))));
  return rows;
}
export async function calcularRiesgoCiclo(supabase:SupabaseClient,cicloId:string):Promise<RiesgoAlumno[]> {
  const insc=await allRows(supabase.from('inscripciones').select('alumno_id,grupo_id').eq('ciclo_id',cicloId).eq('estatus','activa').order('id'));
  const alumnoIds=Array.from(new Set<string>(insc.map(i=>i.alumno_id)));
  if(!alumnoIds.length)return [];
  const desde=new Date(Date.now()-60*24*60*60*1000).toISOString().slice(0,10);
  const [califsCiclo,conductas,tareas]=await Promise.all([
    batches(alumnoIds,ids=>supabase.from('calificaciones').select('alumno_id,asignacion_id,p1,p2,p3,faltas_p1,faltas_p2,faltas_p3,promedio_final,asignacion:asignaciones!inner(ciclo_id,grupo_id)').in('alumno_id',ids).eq('asignacion.ciclo_id',cicloId).order('id')),
    batches(alumnoIds,ids=>supabase.from('reportes_conducta').select('alumno_id,tipo,fecha').in('alumno_id',ids).gte('fecha',desde).lte('fecha',new Date().toISOString().slice(0,10)).order('id')),
    allRows(supabase.from('tareas').select('id,asignacion:asignaciones!inner(ciclo_id,grupo_id)').eq('asignacion.ciclo_id',cicloId).lte('fecha_apertura',new Date().toISOString()).lt('fecha_entrega',new Date().toISOString()).order('id')),
  ]);
  const tareaIds=tareas.map(t=>t.id);
  const entregas=await batches(tareaIds,ids=>supabase.from('entregas_tarea').select('alumno_id,tarea_id').in('tarea_id',ids).order('id'));
  const resultados: RiesgoAlumno[] = [];

  for (const alumnoId of alumnoIds) {
    const factores: Factor[] = [];
    let score = 0;

    // 1) Promedios
    const gruposActivos=new Set(insc.filter(i=>i.alumno_id===alumnoId).map(i=>i.grupo_id));
    const misCalifs = califsCiclo.filter((c: any) => c.alumno_id === alumnoId && gruposActivos.has(c.asignacion?.grupo_id));
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
      factores.push({ clave: 'faltas_criticas', etiqueta: `${totalFaltas} faltas acumuladas`, peso: 25, detalle: 'Umbral interno de seguimiento; no determina derechos a examen.' });
    } else if (totalFaltas > 10) {
      score += 12;
      factores.push({ clave: 'faltas_altas', etiqueta: `${totalFaltas} faltas acumuladas`, peso: 12, detalle: 'Umbral interno para revisar inasistencias.' });
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
    const grupos = new Set((insc ?? []).filter((i: any) => i.alumno_id === alumnoId).map((i: any) => i.grupo_id));
    const propias = (tareas ?? []).filter((t: any) => grupos.has(t.asignacion?.grupo_id)).map((t: any) => t.id);
    const sinEntregar = propias.filter((tid) => !misEntregas.has(tid));
    if (propias.length >= 3 && sinEntregar.length / propias.length > 0.4) {
      const peso = 15;
      score += peso;
      factores.push({
        clave: 'tareas_incompletas',
        etiqueta: `${sinEntregar.length}/${propias.length} tareas vencidas sin entregar`,
        peso, detalle: 'Menos del 60% de entregas registradas.',
      });
    }

    // El seguimiento financiero se muestra en la bandeja, separado del riesgo académico.

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
  if (!acciones.length) acciones.push('dar seguimiento cercano con el grupo orientador');
  const prefijo = nivel === 'critico' ? '🚨 Caso crítico:' : nivel === 'alto' ? '⚠️ Riesgo alto:' : '💡 Riesgo medio:';
  return `${prefijo} ${acciones.join('; ')}.`;
}
