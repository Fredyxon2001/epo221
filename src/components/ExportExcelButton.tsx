'use client';
import { exportToExcel, type ExportColumn } from '@/lib/excel-export';

export function ExportExcelButton<T extends Record<string, any>>({
  rows,
  columns,
  filename = 'export.xlsx',
  sheetName = 'Datos',
  label = '📊 Exportar Excel',
  className,
}: {
  rows: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  sheetName?: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => exportToExcel(rows, columns, filename, sheetName)}
      disabled={!rows?.length}
      className={
        className ??
        'text-xs px-3 py-1.5 rounded bg-verde-oscuro hover:bg-verde text-white font-semibold disabled:opacity-50'
      }
    >
      {label}
    </button>
  );
}
