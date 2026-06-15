import React from 'react';
import { Link } from 'react-router-dom';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

function cellValue(row, col) {
  if (col.render) return col.render(row);
  if (col.key === 'action' && row.deepLink) {
    return (
      <Link to={row.deepLink} className="text-xs font-bold text-[#134e4a] hover:underline">
        {row.actionLabel || 'View details'}
      </Link>
    );
  }
  if (col.key === 'fixAction' && row.fixLink) {
    return (
      <Link to={row.fixLink} className="text-xs font-bold text-amber-800 hover:underline">
        {row.fixLabel || 'Fix'}
      </Link>
    );
  }
  const v = row[col.key];
  if (v == null || v === '') return '—';
  if (col.linkKey && row[col.linkKey]) {
    return (
      <Link to={row[col.linkKey]} className="font-semibold text-[#134e4a] hover:underline">
        {String(v)}
      </Link>
    );
  }
  return String(v);
}

/**
 * Responsive table: horizontal scroll on mobile; optional card stack.
 * Rows may include `deepLink`, `fixLink`, `actionLabel`, `fixLabel` for report deep-linking.
 * @param {{ columns: {key:string;label:string;render?:Function;linkKey?:string}[]; rows: object[]; emptyMessage?: string; mobileCards?: boolean }} props
 */
export function HrResponsiveTable({ columns, rows, emptyMessage = 'No records.', mobileCards = true }) {
  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const showActionCol = rows.some((r) => r.deepLink || r.fixLink);

  return (
    <>
      {mobileCards ? (
        <div className="space-y-2 md:hidden">
          {rows.slice(0, 50).map((row, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-white p-3 text-xs shadow-sm">
              {columns.map((c) => (
                <div key={c.key} className="flex justify-between gap-2 border-b border-slate-50 py-0.5 last:border-0">
                  <span className="text-[9px] font-bold uppercase text-slate-400">{c.label}</span>
                  <span className="break-all text-right text-slate-800">{cellValue(row, c)}</span>
                </div>
              ))}
              {showActionCol ? (
                <div className="mt-2 flex flex-wrap gap-2 pt-1">
                  {row.deepLink ? (
                    <Link to={row.deepLink} className="text-[10px] font-bold uppercase text-[#134e4a]">
                      {row.actionLabel || 'View details'}
                    </Link>
                  ) : null}
                  {row.fixLink ? (
                    <Link to={row.fixLink} className="text-[10px] font-bold uppercase text-amber-800">
                      {row.fixLabel || 'Fix'}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
          {rows.length > 50 ? <p className="text-center text-xs text-slate-500">Showing 50 of {rows.length}. Export for full data.</p> : null}
        </div>
      ) : null}
      <div className={mobileCards ? '-mx-1 hidden overflow-x-auto md:block' : '-mx-1 overflow-x-auto'}>
        <AppTableWrap className="min-w-[640px]">
          <AppTable>
            <AppTableThead>
              <AppTableTr>
                {columns.map((c) => (
                  <AppTableTh key={c.key}>{c.label}</AppTableTh>
                ))}
                {showActionCol ? <AppTableTh>Action</AppTableTh> : null}
              </AppTableTr>
            </AppTableThead>
            <AppTableBody>
              {rows.slice(0, 100).map((row, i) => (
                <AppTableTr key={i}>
                  {columns.map((c) => (
                    <AppTableTd key={c.key}>{cellValue(row, c)}</AppTableTd>
                  ))}
                  {showActionCol ? (
                    <AppTableTd>
                      <div className="flex flex-wrap gap-2">
                        {row.deepLink ? (
                          <Link to={row.deepLink} className="text-xs font-bold text-[#134e4a] hover:underline">
                            {row.actionLabel || 'View'}
                          </Link>
                        ) : null}
                        {row.fixLink ? (
                          <Link to={row.fixLink} className="text-xs font-bold text-amber-800 hover:underline">
                            {row.fixLabel || 'Fix'}
                          </Link>
                        ) : null}
                        {!row.deepLink && !row.fixLink ? '—' : null}
                      </div>
                    </AppTableTd>
                  ) : null}
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
