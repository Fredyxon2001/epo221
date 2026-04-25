import { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  hideOn?: 'mobile';
};

export function DataTable<T extends Record<string, any>>({
  rows,
  columns,
  empty,
  rowKey,
  caption,
  dense,
}: {
  rows: T[];
  columns: Column<T>[];
  empty?: ReactNode;
  rowKey: (row: T, i: number) => string;
  caption?: string;
  dense?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-500 italic">
        {empty ?? 'Sin datos'}
      </div>
    );
  }
  const cellP = dense ? 'px-3 py-2' : 'px-4 py-3';
  return (
    <div className="overflow-x-auto -mx-2 md:mx-0">
      <table className="w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.22em] text-gray-500 border-b border-gray-200">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`${cellP} font-semibold ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''} ${c.hideOn === 'mobile' ? 'hidden md:table-cell' : ''}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className="hover:bg-crema/60 transition">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`${cellP} align-middle ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''} ${c.hideOn === 'mobile' ? 'hidden md:table-cell' : ''} ${c.className ?? ''}`}
                >
                  {c.render ? c.render(row) : (row as any)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
