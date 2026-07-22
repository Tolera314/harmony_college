import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  className?: string;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  className = ''
}: TableProps<T>) {
  return (
    <div className={`overflow-x-auto border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl ${className}`}>
      <table className="w-full text-left text-xs sm:text-sm font-sans">
        <thead className="bg-white/5 font-mono text-white/60 border-b border-white/10">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`p-4 font-semibold ${
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-white/90">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="hover:bg-white/5 transition-colors"
            >
              {columns.map((col, idx) => (
                <td
                  key={idx}
                  className={`p-4 ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.cell
                    ? col.cell(item)
                    : col.accessorKey
                    ? String(item[col.accessorKey] ?? '')
                    : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
