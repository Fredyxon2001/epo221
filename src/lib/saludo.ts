// Saludo contextual por hora del día (zona horaria local del servidor).
// Cubre madrugada, mañana, tarde y noche con expresiones naturales en español.
export function saludoPorHora(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 0 && h < 6)  return 'Linda madrugada';
  if (h >= 6 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
