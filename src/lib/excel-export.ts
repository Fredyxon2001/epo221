// Helper universal para exportar arrays de objetos a XLSX desde el cliente.
import * as XLSX from 'xlsx';

export type ExportColumn<T> = {
  header: string;
  key: keyof T | ((row: T) => any);
  width?: number;
};

export function exportToExcel<T extends Record<string, any>>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename = 'export.xlsx',
  sheetName = 'Datos',
) {
  const headers = columns.map((c) => c.header);
  const data = rows.map((row) =>
    columns.map((c) => {
      const v = typeof c.key === 'function' ? c.key(row) : row[c.key as keyof T];
      if (v === null || v === undefined) return '';
      if (v instanceof Date) return v.toLocaleString('es-MX');
      return v;
    }),
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = columns.map((c) => ({ wch: c.width ?? 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

// Exportador "auto" — toma todas las keys del primer objeto.
export function exportAuto<T extends Record<string, any>>(rows: T[], filename = 'export.xlsx') {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]).map((k) => ({ header: k, key: k as keyof T }));
  exportToExcel(rows, cols, filename);
}
