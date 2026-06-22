import React from 'react';
import { AlertTriangle, Download, Filter } from 'lucide-react';

/**
 * Monthly finance exception summary — disbursements queue header.
 */
export function ExpenseCategoryExceptionBanner({
  summary,
  formatNgn,
  onFilterExceptions,
  onExportCsv,
  activeFilter = false,
}) {
  if (!summary?.shouldAlert) return null;

  const chips = [];
  if (Number(summary.exceptionRowCount) > 0) {
    chips.push({
      label: 'Exception lanes',
      value: `${summary.exceptionRowCount} request${summary.exceptionRowCount === 1 ? '' : 's'}`,
      sub: formatNgn ? formatNgn(summary.exceptionTotalNgn) : null,
    });
  }
  if (Number(summary.othersCount) > 0) {
    chips.push({
      label: 'Others',
      value: `${summary.othersCount}`,
      sub: null,
    });
  }
  if (summary.ap3ShouldAlert !== false && Number(summary.ap3UnclassifiedNgn) > 0) {
    chips.push({
      label: 'AP3 unclassified',
      value: formatNgn ? formatNgn(summary.ap3UnclassifiedNgn) : String(summary.ap3UnclassifiedNgn),
      sub: null,
    });
  }

  return (
    <div className="rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50/95 to-orange-50/50 px-4 py-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-900">
            <AlertTriangle size={13} aria-hidden />
            Category review — this month
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {chips.map((c) => (
              <div
                key={c.label}
                className="rounded-lg border border-amber-200/80 bg-white/70 px-2.5 py-1.5 min-w-[7rem]"
              >
                <p className="text-[8px] font-bold uppercase text-amber-800/80">{c.label}</p>
                <p className="text-sm font-black text-amber-950 tabular-nums">{c.value}</p>
                {c.sub ? <p className="text-[9px] text-amber-900/70 tabular-nums">{c.sub}</p> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {onFilterExceptions ? (
            <button
              type="button"
              onClick={onFilterExceptions}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
                activeFilter
                  ? 'bg-amber-800 text-white'
                  : 'border border-amber-300 bg-white text-amber-950 hover:bg-amber-100/80'
              }`}
            >
              <Filter size={12} aria-hidden />
              {activeFilter ? 'Showing exceptions' : 'View queue'}
            </button>
          ) : null}
          {onExportCsv ? (
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"
            >
              <Download size={12} aria-hidden />
              Export
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
