// Helpers para exportar listados a CSV desde Server Components.

function escape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(rows: any[], headers: { key: string; label: string }[]): string {
  const head = headers.map((h) => escape(h.label)).join(',');
  const body = rows
    .map((r) => headers.map((h) => escape(r[h.key])).join(','))
    .join('\n');
  // BOM para Excel con acentos
  return '\ufeff' + head + '\n' + body;
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
