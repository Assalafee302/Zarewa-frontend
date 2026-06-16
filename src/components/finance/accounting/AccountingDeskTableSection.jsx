import React from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { SalesListTableFrame } from '../sales/SalesListTableFrame';

/**
 * Procurement-style table section for Accounting Desk tabs.
 */
export function AccountingDeskTableSection({
  title,
  description,
  subtotal,
  toolbar,
  onReload,
  loading,
  onExport,
  exportDisabled,
  children,
  empty,
}) {
  return (
    <SalesListTableFrame
      toolbar={
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
              {description ? (
                <p className="text-[11px] text-slate-600 mt-1 leading-snug max-w-2xl">{description}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 items-center">
              {subtotal != null ? (
                <p className="text-sm font-black text-[#134e4a] tabular-nums">{subtotal}</p>
              ) : null}
              {onReload ? (
                <button
                  type="button"
                  onClick={onReload}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  Reload
                </button>
              ) : null}
              {onExport ? (
                <button
                  type="button"
                  onClick={onExport}
                  disabled={exportDisabled || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50 disabled:opacity-50"
                >
                  <FileSpreadsheet size={12} />
                  Export
                </button>
              ) : null}
            </div>
          </div>
          {toolbar}
        </div>
      }
    >
      {empty || children}
    </SalesListTableFrame>
  );
}
