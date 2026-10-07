/** School calendar dates are whole days in Mexico City, including the final day. */
export function schoolToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function convocatoriaStatus(desde: string | null, hasta: string | null, hoy = schoolToday()): 'Vigente' | 'Próxima' | 'Concluida' | 'Fechas inválidas' {
  if ((desde && !validCalendarDate(desde)) || (hasta && !validCalendarDate(hasta)) || (desde && hasta && desde > hasta)) return 'Fechas inválidas';
  if (desde && desde > hoy) return 'Próxima';
  if (hasta && hasta < hoy) return 'Concluida';
  return 'Vigente';
}

export function formatSchoolDate(value: string): string {
  if (!validCalendarDate(value)) return 'Fecha inválida';
  return new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00Z`));
}
