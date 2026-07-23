// Helpers de autenticación.
// Patrón de email institucional: nombre.apellido@epo221.edu.mx
// Fácil de recordar para el alumno.

export const DOMINIO_SINTETICO = 'epo221.edu.mx';
export const PASSWORD_TEMPORAL = 'TEMPORALEPO221!';

// Normaliza texto a slug ASCII lowercase (sin acentos, sin espacios, sin símbolos)
export const aSlug = (s: string): string => {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')      // quitar diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')           // solo a-z y 0-9
    .trim();
};

// Genera email institucional usando SOLO el PRIMER nombre y el apellido paterno.
// Ej: ("Juan Carlos", "Pérez") -> "juan.perez@epo221.edu.mx"
// Si hay duplicado, agrega un sufijo (matricula).
export const nombreApellidoAEmail = (nombre: string, apellidoPaterno: string, sufijo?: string): string => {
  // Tomar SOLO el primer nombre (antes del primer espacio)
  const primerNombre = (nombre || '').trim().split(/\s+/)[0] ?? '';
  const nom = aSlug(primerNombre) || 'alumno';
  const ape = aSlug(apellidoPaterno);
  const base = ape ? `${nom}.${ape}` : nom;
  const conSufijo = sufijo ? `${base}.${aSlug(sufijo)}` : base;
  return `${conSufijo}@${DOMINIO_SINTETICO}`;
};

// LEGACY: aún disponible para compatibilidad pero ya no se usa para nuevos alumnos.
// Sigue en minúsculas para evitar mismatch case-sensitive.
export const curpAEmail = (curp: string) =>
  `${curp.trim().toLowerCase()}@${DOMINIO_SINTETICO}`;

export const esCurpValida = (curp: string) =>
  /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i.test(curp.trim());

// Password inicial universal. El usuario puede cambiarla voluntariamente.
export const passwordInicialDesdeMatricula = (_matricula: string) =>
  PASSWORD_TEMPORAL;
