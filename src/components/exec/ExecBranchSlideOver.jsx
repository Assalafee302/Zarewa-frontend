import React from 'react';
import { Link } from 'react-router-dom';
import { SlideOverPanel } from '../layout/SlideOverPanel';

/**
 * Read-only branch scorecard brief for MD Review tab.
 */
export function ExecBranchSlideOver({ branch, isOpen, onClose, formatNgn }) {
  const b = branch && typeof branch === 'object' ? branch : null;
  if (!b) return null;

  const fmt = formatNgn || ((n) => String(n ?? 0));

  const rows = [
    ['Produced sales', fmt(b.producedRevenueNgn ?? 0)],
    ['Collections', fmt(b.netCollectedNgn ?? 0)],
    ['Collection rate', b.producedCollectionRatePct != null ? `${b.producedCollectionRatePct}%` : '—'],
    ['Expenses', fmt(b.expensesNgn ?? 0)],
    ['Expense / sales', b.expenseToSalesPct != null ? `${b.expenseToSalesPct}%` : '—'],
    ['Customer debt', fmt(b.customerDebtNgn ?? 0)],
    ['Coil valuation', fmt(b.coilValuationNgn ?? 0)],
    ['Pending production', String(b.pendingProductionJobs ?? 0)],
    ['Executive queue', String(b.pendingExecutiveItems ?? 0)],
    ['Risk flags', String(b.riskFlagCount ?? 0)],
    ['Score index', b.internalScore != null ? String(b.internalScore) : '—'],
  ];

  return (
    <SlideOverPanel isOpen={isOpen} onClose={onClose} title="Branch brief" maxWidthClass="max-w-md">
      <div className="flex h-full flex-col">
        <header className="border-b border-slate-100 px-5 py-4">
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Branch</p>
          <h2 className="text-lg font-bold text-zarewa-teal">{b.branchName || b.branchId}</h2>
          {b.internalScoreNote ? (
            <p className="text-xs text-slate-500 mt-2 leading-snug">{b.internalScoreNote}</p>
          ) : null}
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl className="space-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 border-b border-slate-50 pb-2">
                <dt className="text-ui-xs font-bold uppercase text-slate-500">{label}</dt>
                <dd className="text-sm font-semibold text-slate-800 tabular-nums text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <footer className="border-t border-slate-100 px-5 py-4 flex flex-wrap gap-2">
          <Link
            to="/manager"
            className="rounded-lg bg-zarewa-teal px-4 py-2 text-ui-xs font-black uppercase text-white hover:brightness-105"
          >
            Management desk
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-ui-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </footer>
      </div>
    </SlideOverPanel>
  );
}
