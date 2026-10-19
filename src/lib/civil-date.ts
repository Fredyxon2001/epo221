/** SQL DATE values are calendar days, never instants in the school timezone. */
type CivilDateOptions = Pick<Intl.DateTimeFormatOptions, 'weekday' | 'day' | 'month' | 'year'>;

export function formatCivilDate(value: unknown, options: CivilDateOptions = { day: '2-digit', month: 'long', year: 'numeric' }): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return 'Fecha inválida';
  const date = new Date(value + 'T12:00:00Z');
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return 'Fecha inválida';
  return new Intl.DateTimeFormat('es-MX', { ...options, timeZone: 'UTC' }).format(date);
}
