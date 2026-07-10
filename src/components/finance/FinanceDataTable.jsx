import React from 'react';

/**
 * @param {{ columns: { key: string; label: string; align?: 'left' | 'right' }[]; rows: Record<string, React.ReactNode>[] }} props
 */
export function FinanceDataTable({ columns, rows }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead className="bg-slate-50 text-ui-xs font-bold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={row._key ?? i} className="hover:bg-slate-50/80">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 font-medium text-slate-800 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}
                >
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
