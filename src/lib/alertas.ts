// Motor de alertas institucionales. Cada regla consulta Supabase y
// devuelve las anomalías que detecta. Todo en server-side.
import { SupabaseClient } from '@supabase/supabase-js';

export type Alerta = {
  tipo: 'asignacion_sin_profesor' | 'grupo_sin_alumnos' | 'semestre_sin_cubrir'
       | 'calificacion_pendiente' | 'alumno_riesgo' | 'faltas_criticas';
  nivel: 'info' | 'warning' | 'danger';
  titulo: string;
  descripcion: string;
  url?: string;
  contexto?: any;
};

export async function construirAlertas(supabase: SupabaseClient): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  // Ciclo activo
  const { data: ciclo } = await supabase
    .from('ciclos_escolares').select('id, codigo').eq('activo', true).maybeSingle();
  if (!ciclo) {
    alertas.push({
      tipo: 'semestre_sin_cubrir', nivel: 'danger',
      titulo: 'No hay ciclo escolar activo',
      descripcion: 'Activa un ciclo en /admin/ciclos para que el sistema opere correctamente.',
      url: '/admin/ciclos',
    });
    return alertas;
  }

  // 1) Asignaciones sin profesor
  const { data: sinProfe } = await supabase
    .from('asignaciones')
    .select('id, materia:materias(nombre, semestre), grupo:grupos(grupo, semestre, grado, turno)')
    .eq('ciclo_id', ciclo.id)
    .is('profesor_id', null);
  if ((sinProfe ?? []).length) {
    alertas.push({
      tipo: 'asignacion_sin_profesor', nivel: 'warning',
      titulo: `${sinProfe!.length} asignaciones sin profesor`,
      descripcion: 'Materias activas en el ciclo sin docente responsable.',
      url: '/admin/asignaciones',
      contexto: sinProfe,
    });
  }

  // 2) Grupos sin alumnos inscritos
  const { data: grupos } = await supabase
    .from('grupos').select('id, semestre, grupo, grado, turno').eq('ciclo_id', ciclo.id);
  if (grupos?.length) {
    const { data: insc } = await supabase
      .from('inscripciones').select('grupo_id').eq('ciclo_id', ciclo.id).eq('estatus', 'activa');
    const conAlumnos = new Set((insc ?? []).map((i: any) => i.grupo_id));
    const vacios = grupos.filter((g) => !conAlumnos.has(g.id));
    if (vacios.length) {
      alertas.push({
        tipo: 'grupo_sin_alumnos', nivel: 'info',
        titulo: `${vacios.length} grupos sin alumnos`,
        descripcion: 'Grupos creados pero sin inscripciones activas — revisa el proceso de inscripción.',
        url: '/admin/grupos',
        contexto: vacios,
      });
    }
  }

  // 3) Semestres del ciclo sin ningún grupo creado
  const semestresCubiertos = new Set((grupos ?? []).map((g: any) => g.semestre));
  const faltantes = [1, 2, 3, 4, 5, 6].filter((s) => !semestresCubiertos.has(s));
  if (faltantes.length && faltantes.length < 6) {
    alertas.push({
      tipo: 'semestre_sin_cubrir', nivel: 'info',
      titulo: `Semestres sin cubrir: ${faltantes.join(', ')}`,
      descripcion: 'El ciclo activo no tiene grupos creados para esos semestres.',
      url: '/admin/grupos',
    });
  }

  // 4) Alumnos en riesgo (promedio_final < 7 en alguna materia del ciclo)
  const { data: riesgo } = await supabase
    .from('calificaciones')
    .select('alumno_id, promedio_final')
    .lt('promedio_final', 7)
    .gt('promedio_final', 0);
  if ((riesgo ?? []).length) {
    const unicos = new Set((riesgo ?? []).map((r: any) => r.alumno_id));
    alertas.push({
      tipo: 'alumno_riesgo', nivel: 'warning',
      titulo: `${unicos.size} alumnos con materias reprobadas`,
      descripcion: 'Tienen al menos una materia con promedio final menor a 7.',
      url: '/admin/generaciones',
    });
  }

  // 5) Faltas críticas: suma de faltas_p1+p2+p3 > 15 (regla SEIEM típica)
  const { data: califs } = await supabase
    .from('calificaciones')
    .select('alumno_id, faltas_p1, faltas_p2, faltas_p3');
  const faltas = new Map<string, number>();
  for (const c of califs ?? []) {
    const t = (c.faltas_p1 ?? 0) + (c.faltas_p2 ?? 0) + (c.faltas_p3 ?? 0);
    faltas.set(c.alumno_id, (faltas.get(c.alumno_id) ?? 0) + t);
  }
  const criticos = Array.from(faltas.entries()).filter(([, t]) => t > 15);
  if (criticos.length) {
    alertas.push({
      tipo: 'faltas_criticas', nivel: 'danger',
      titulo: `${criticos.length} alumnos con faltas críticas`,
      descripcion: 'Acumulan más de 15 faltas en el ciclo — pueden perder derecho a examen final.',
      url: '/admin/generaciones',
    });
  }

  return alertas;
}

export const nivelStyle: Record<Alerta['nivel'], { bg: string; border: string; icon: string; text: string }> = {
  info:    { bg: 'bg-sky-50',   border: 'border-sky-200',   icon: 'ℹ️', text: 'text-sky-800'   },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', text: 'text-amber-800' },
  danger:  { bg: 'bg-rose-50',  border: 'border-rose-200',  icon: '🚨', text: 'text-rose-800'  },
};
