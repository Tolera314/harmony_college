import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  /** Optional sort state for sortable columns */
  sortDirection?: 'asc' | 'desc' | 'none';
  onSort?: () => void;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  className?: string;
  /** Accessible caption / label for the table (required for screen readers) */
  caption?: string;
  /** aria-label used when caption is visually hidden */
  ariaLabel?: string;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  className = '',
  caption,
  ariaLabel,
}: TableProps<T>) {
  return (
    <div
      className={`overflow-x-auto border ds-card rounded-2xl backdrop-blur-xl ${className}`}
      role="region"
      aria-label={ariaLabel ?? caption ?? 'Data table'}
      tabIndex={0}
    >
      <table
        className="w-full text-left text-xs sm:text-sm font-sans"
        aria-label={!caption ? (ariaLabel ?? undefined) : undefined}
      >
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        <thead className="font-mono border-b ds-table-header">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className={`p-4 font-semibold ${
                  col.align === 'center' ? 'text-center' :
                  col.align === 'right'  ? 'text-right'  : 'text-left'
                } ${col.onSort ? 'cursor-pointer select-none hover:text-[--text-primary] ds-focus-ring' : ''}`}
                aria-sort={
                  col.sortDirection === 'asc'  ? 'ascending'  :
                  col.sortDirection === 'desc' ? 'descending' :
                  col.sortDirection === 'none' ? 'none'       :
                  undefined
                }
                onClick={col.onSort}
                onKeyDown={col.onSort ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); col.onSort!(); } } : undefined}
                tabIndex={col.onSort ? 0 : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortDirection === 'asc'  && <span aria-hidden="true">↑</span>}
                  {col.sortDirection === 'desc' && <span aria-hidden="true">↓</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y ds-table-row ds-table-cell">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="ds-table-row transition-colors"
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover-overlay)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
            >
              {columns.map((col, idx) => (
                <td
                  key={idx}
                  className={`p-4 ${
                    col.align === 'center' ? 'text-center' :
                    col.align === 'right'  ? 'text-right'  : 'text-left'
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
