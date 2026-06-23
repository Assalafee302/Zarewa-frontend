import React from 'react';
import { Building2 } from 'lucide-react';

export function ExecMdBranchesPanel({ branches, formatNgn, busy, onSelectBranch }) {
  const rows = branches?.byBranch || [];
  const highlights = branches?.highlights || {};
  const showComparison = Boolean(branches?.comparisonAvailable);

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="h-1 bg-[#134e4a]" aria-hidden />
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
          <Building2 size={12} /> Branches
        </p>
        <h3 className="text-sm font-bold text-[#134e4a]">Three-site scorecard</h3>
        {highlights.bestOverallBranch ? (
          <p className="text-[10px] text-slate-500 mt-1">
            Leading: <span className="font-semibold text-slate-700">{highlights.bestOverallBranch}</span>
          </p>
        ) : null}
      </div>
      <div className="px-4 py-3 overflow-x-auto">
        {!showComparison ? (
          <p className="text-[11px] text-slate-500">
            {branches?.comparisonEmptyReason === 'single_branch'
              ? 'Switch to All branches for Kaduna · Yola · Maiduguri comparison.'
              : 'Branch comparison not available for this scope.'}
          </p>
        ) : busy && !rows.length ? (
          <p className="text-[11px] text-slate-500">Loading branch scorecard…</p>
        ) : (
          <table className="w-full text-[11px] min-w-[320px]">
            <thead>
              <tr className="border-b text-[9px] font-black uppercase text-slate-500">
                <th className="py-1.5 text-left">Branch</th>
                <th className="py-1.5 text-right">Sales</th>
                <th className="py-1.5 text-right">Collected</th>
                <th className="py-1.5 text-right">Debt</th>
                <th className="py-1.5 text-right">Index</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.branchId}
                  className={`border-b border-slate-50 ${onSelectBranch ? 'cursor-pointer hover:bg-teal-50/40' : ''}`}
                  onClick={onSelectBranch ? () => onSelectBranch(b) : undefined}
                  onKeyDown={
                    onSelectBranch
                      ? (ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            onSelectBranch(b);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onSelectBranch ? 0 : undefined}
                  role={onSelectBranch ? 'button' : undefined}
                >
                  <td className="py-2 font-semibold text-slate-800">{b.branchName || b.branchId}</td>
                  <td className="py-2 text-right tabular-nums">{formatNgn(b.producedRevenueNgn ?? 0)}</td>
                  <td className="py-2 text-right tabular-nums">{formatNgn(b.netCollectedNgn ?? 0)}</td>
                  <td className="py-2 text-right tabular-nums">{formatNgn(b.customerDebtNgn ?? 0)}</td>
                  <td className="py-2 text-right tabular-nums font-bold">{b.internalScore ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
