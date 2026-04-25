/**
 * Código visual de grupo según la nomenclatura institucional:
 *   1° y 2° semestre → grupos 101..1NN   (grado 1)
 *   3° y 4° semestre → grupos 201..2NN   (grado 2)
 *   5° y 6° semestre → grupos 301..3NN   (grado 3)
 *
 * grado se deriva del semestre (ceil(semestre / 2)) y el consecutivo del grupo
 * se normaliza a dos dígitos.
 */
export function gradoDeSemestre(semestre: number): 1 | 2 | 3 {
  return Math.max(1, Math.min(3, Math.ceil(semestre / 2))) as 1 | 2 | 3;
}

export function codigoGrupo(grado: number, grupo: number): string {
  const g = Math.max(1, Math.min(3, grado));
  const n = String(grupo).padStart(2, '0');
  return `${g}${n}`;
}

export function codigoGrupoDesdeSemestre(semestre: number, grupo: number): string {
  return codigoGrupo(gradoDeSemestre(semestre), grupo);
}

/** Label largo para usar en selects y detalles. */
export function labelGrupo(
  g: { grado?: number | null; semestre: number; grupo: number; turno?: string | null },
): string {
  const grado = g.grado ?? gradoDeSemestre(g.semestre);
  const cod = codigoGrupo(grado, g.grupo);
  const turno = g.turno ? ` · ${g.turno}` : '';
  return `${cod} · ${g.semestre}° sem${turno}`;
}

/** Clasifica si un semestre es "nones" (1,3,5) o "pares" (2,4,6). */
export function paridadSemestre(semestre: number): 'nones' | 'pares' {
  return semestre % 2 === 0 ? 'pares' : 'nones';
}

/** Siguiente semestre al promover. 6° no promueve (egresa). */
export function siguienteSemestre(semestre: number): number | null {
  if (semestre >= 6) return null;
  return semestre + 1;
}

/** Deriva el código de generación "YYYY-YYYY" a partir de la fecha de inicio del ciclo
 *  y el semestre en el que el alumno ingresa. */
export function generacionPorIngreso(fechaInicio: Date, semestreIngreso: number = 1): string {
  const anioBase = fechaInicio.getFullYear();
  // Un alumno que entra en semestre N tendría su ingreso real N/2 años antes de este ciclo.
  const desfaseAnios = Math.floor((semestreIngreso - 1) / 2);
  const anioInicio = anioBase - desfaseAnios;
  return `${anioInicio}-${anioInicio + 3}`;
}
