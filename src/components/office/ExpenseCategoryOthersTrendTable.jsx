import React from 'react';

function heatCellClass(pct, hasData) {
  if (!hasData) return 'bg-slate-50 text-slate-400';
  if (pct >= 25) return 'bg-rose-100 text-rose-900 font-bold ring-1 ring-rose-200/80';
  if (pct >= 15) return 'bg-amber-100 text-amber-950 font-semibold ring-1 ring-amber-200/70';
  if (pct >= 8) return 'bg-slate-100 text-slate-800';
  return 'bg-emerald-50 text-emerald-900';
}

function summaryPctClass(pct) {
  if (pct >= 25) return 'text-rose-700';
  if (pct >= 15) return 'text-amber-800';
  return 'text-[#134e4a]';
}

/**
 * Rolling Others % trend by branch — executive / finance oversight.
 */
export function ExpenseCategoryOthersTrendTable({
  trend,
  branchLabel = (id) => id,
  compact = false,
}) {
  if (!trend?.branches?.length) return null;

  const monthKeys = trend.monthKeys || [];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/60">
      <table className={`w-full ${compact ? 'min-w-[480px] text-xs' : 'min-w-[640px] text-sm'}`}>
        <thead>
          <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase text-slate-500 bg-slate-50/80">
            <th className={`${compact ? 'py-2 pr-3' : 'py-2.5 pr-4'}`}>Branch</th>
            {monthKeys.map((mk) => (
              <th key={mk} className={`${compact ? 'py-2 px-1.5' : 'py-2.5 px-2'} text-right`}>
                {mk.slice(5) || mk}
              </th>
            ))}
            <th className={`${compact ? 'py-2 pl-2' : 'py-2.5 pl-2'} text-right`}>6-mo</th>
          </tr>
        </thead>
        <tbody>
          {trend.branches.map((row) => {
            const summaryPct = row.summary?.othersPct ?? 0;
            return (
              <tr key={row.branchId} className="border-b border-slate-100 last:border-0">
                <td className={`${compact ? 'py-2 pr-3' : 'py-2.5 pr-4'} font-medium text-slate-800`}>
                  {branchLabel(row.branchId)}
                </td>
                {monthKeys.map((mk) => {
                  const month = row.months?.find((m) => m.monthKey === mk);
                  const pct = month?.othersPct ?? 0;
                  const hasData = Boolean(month?.totalNgn);
                  return (
                    <td key={mk} className={`${compact ? 'py-2 px-1.5' : 'py-2.5 px-2'} text-right`}>
                      <span
                        className={`inline-flex min-w-[2.75rem] justify-center rounded-md px-1.5 py-0.5 tabular-nums ${heatCellClass(pct, hasData)}`}
                        title={hasData ? `${pct}% Others` : 'No activity'}
                      >
                        {hasData ? `${pct}%` : '—'}
                      </span>
                    </td>
                  );
                })}
                <td
                  className={`${compact ? 'py-2 pl-2' : 'py-2.5 pl-2'} text-right tabular-nums font-black ${summaryPctClass(summaryPct)}`}
                >
                  {summaryPct}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
