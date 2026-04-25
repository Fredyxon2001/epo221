// Motor de badges/reconocimientos automáticos para un grupo.
// Se calcula al vuelo a partir de calificaciones existentes.

export type Badge = {
  alumnoId: string;
  titulo: string;
  descripcion: string;
  icono: string;
  tono: 'oro' | 'plata' | 'bronce' | 'verde' | 'azul' | 'dorado';
};

type Califs = {
  alumno_id: string;
  p1: number | null; p2: number | null; p3: number | null;
  faltas_p1: number | null; faltas_p2: number | null; faltas_p3: number | null;
  promedio_final: number | null;
};

export function calcularBadges(
  califs: Califs[],
  alumnos: { id: string; nombre: string; apellido_paterno: string; apellido_materno?: string | null }[],
): Badge[] {
  const nombreDe = (id: string) => {
    const a = alumnos.find((x) => x.id === id);
    return a ? `${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.nombre}`.trim() : '—';
  };
  const badges: Badge[] = [];

  const conProm = califs.filter((c) => Number(c.promedio_final ?? 0) > 0);

  // Mejor promedio del grupo
  if (conProm.length) {
    const ord = [...conProm].sort((a, b) => Number(b.promedio_final) - Number(a.promedio_final));
    const top = ord[0];
    badges.push({
      alumnoId: top.alumno_id,
      titulo: 'Mejor promedio del grupo',
      descripcion: `${nombreDe(top.alumno_id)} con ${Number(top.promedio_final).toFixed(2)}`,
      icono: '🏆', tono: 'oro',
    });
    if (ord.length > 1) badges.push({
      alumnoId: ord[1].alumno_id,
      titulo: 'Segundo lugar',
      descripcion: `${nombreDe(ord[1].alumno_id)} con ${Number(ord[1].promedio_final).toFixed(2)}`,
      icono: '🥈', tono: 'plata',
    });
    if (ord.length > 2) badges.push({
      alumnoId: ord[2].alumno_id,
      titulo: 'Tercer lugar',
      descripcion: `${nombreDe(ord[2].alumno_id)} con ${Number(ord[2].promedio_final).toFixed(2)}`,
      icono: '🥉', tono: 'bronce',
    });
  }

  // Sin faltas (0 en los tres parciales)
  for (const c of califs) {
    const total = (c.faltas_p1 ?? 0) + (c.faltas_p2 ?? 0) + (c.faltas_p3 ?? 0);
    if (total === 0 && Number(c.promedio_final ?? 0) > 0) {
      badges.push({
        alumnoId: c.alumno_id,
        titulo: 'Sin faltas',
        descripcion: `${nombreDe(c.alumno_id)} asistió a todas las sesiones`,
        icono: '🎯', tono: 'verde',
      });
    }
  }

  // Mayor avance P1 → P3
  const avances = califs
    .filter((c) => Number(c.p1 ?? 0) > 0 && Number(c.p3 ?? 0) > 0)
    .map((c) => ({ id: c.alumno_id, avance: Number(c.p3) - Number(c.p1) }))
    .sort((a, b) => b.avance - a.avance);
  if (avances.length && avances[0].avance > 0) {
    const a = avances[0];
    badges.push({
      alumnoId: a.id,
      titulo: 'Mayor avance del ciclo',
      descripcion: `${nombreDe(a.id)} subió ${a.avance.toFixed(1)} puntos del P1 al P3`,
      icono: '🚀', tono: 'azul',
    });
  }

  // Calificación perfecta (10) en algún parcial
  for (const c of califs) {
    for (const k of ['p1','p2','p3'] as const) {
      if (Number(c[k] ?? 0) >= 10) {
        badges.push({
          alumnoId: c.alumno_id,
          titulo: `Calificación perfecta en ${k.toUpperCase()}`,
          descripcion: `${nombreDe(c.alumno_id)} obtuvo 10 en el parcial`,
          icono: '⭐', tono: 'dorado',
        });
        break; // solo un badge por alumno por este criterio
      }
    }
  }

  return badges;
}

export const tonoClases: Record<Badge['tono'], string> = {
  oro:    'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400',
  plata:  'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 border-gray-300',
  bronce: 'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900 border-orange-400',
  verde:  'bg-gradient-to-br from-verde-claro to-verde text-white border-verde-oscuro',
  azul:   'bg-gradient-to-br from-sky-400 to-sky-600 text-white border-sky-700',
  dorado: 'bg-gradient-to-br from-dorado to-dorado-claro text-verde-oscuro border-dorado',
};
