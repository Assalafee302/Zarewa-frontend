import React from 'react';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

/**
 * Responsive table: horizontal scroll on mobile; optional card stack.
 * @param {{ columns: {key:string;label:string}[]; rows: object[]; emptyMessage?: string; mobileCards?: boolean }} props
 */
export function HrResponsiveTable({ columns, rows, emptyMessage = 'No records.', mobileCards = true }) {
  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {mobileCards ? (
        <div className="space-y-2 md:hidden">
          {rows.slice(0, 50).map((row, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-white p-3 text-xs shadow-sm">
              {columns.map((c) => (
                <div key={c.key} className="flex justify-between gap-2 py-0.5 border-b border-slate-50 last:border-0">
                  <span className="font-bold uppercase text-[9px] text-slate-400">{c.label}</span>
                  <span className="text-slate-800 text-right break-all">{String(row[c.key] ?? '—')}</span>
                </div>
              ))}
            </div>
          ))}
          {rows.length > 50 ? <p className="text-xs text-slate-500 text-center">Showing 50 of {rows.length}. Export for full data.</p> : null}
        </div>
      ) : null}
      <div className={mobileCards ? 'hidden md:block -mx-1 overflow-x-auto' : '-mx-1 overflow-x-auto'}>
        <AppTableWrap className="min-w-[640px]">
          <AppTable>
            <AppTableThead>
              <AppTableTr>
                {columns.map((c) => (
                  <AppTableTh key={c.key}>{c.label}</AppTableTh>
                ))}
              </AppTableTr>
            </AppTableThead>
            <AppTableBody>
              {rows.slice(0, 100).map((row, i) => (
                <AppTableTr key={i}>
                  {columns.map((c) => (
                    <AppTableTd key={c.key}>{String(row[c.key] ?? '—')}</AppTableTd>
                  ))}
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
        {rows.length > 100 ? (
          <p className="mt-2 text-xs text-slate-500">Preview limited to 100 rows. Export for full data.</p>
        ) : null}
      </div>
    </>
  );
}
