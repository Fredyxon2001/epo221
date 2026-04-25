// Endpoint que genera un archivo .ics con los eventos del calendario escolar
// para que el usuario lo importe a Google Calendar, Apple Calendar, Outlook, etc.
import { createClient } from '@/lib/supabase/server';

function fmt(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
function esc(s: string) {
  return (s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export async function GET() {
  const supabase = createClient();
  const { data } = await supabase
    .from('eventos_calendario')
    .select('id, titulo, descripcion, tipo, fecha_inicio, fecha_fin, todo_el_dia, lugar')
    .gte('fecha_inicio', new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString())
    .order('fecha_inicio');

  const now = fmt(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EPO221//Calendario Escolar//ES',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:EPO 221 Nicolás Bravo',
    'X-WR-TIMEZONE:America/Mexico_City',
  ];

  for (const e of data ?? []) {
    const start = new Date(e.fecha_inicio);
    const end = e.fecha_fin ? new Date(e.fecha_fin) : new Date(start.getTime() + 60 * 60 * 1000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@epo221.vercel.app`,
      `DTSTAMP:${now}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${esc(e.titulo)}`,
      e.descripcion ? `DESCRIPTION:${esc(e.descripcion)}` : '',
      e.lugar ? `LOCATION:${esc(e.lugar)}` : '',
      `CATEGORIES:${e.tipo}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');

  const body = lines.filter(Boolean).join('\r\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="epo221-calendario.ics"',
    },
  });
}
