import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

/** Top-of-page alert when payment exceptions are open. */
export function ReportsExceptionsAlert({ openCount, onReview }) {
  if (!openCount || openCount < 1) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <AlertTriangle size={18} className="text-rose-700 shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-rose-900">
            {openCount} open payment exception{openCount === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-rose-800 mt-0.5">
            Triage these before relying on cash/AR exports for the period.
          </p>
        </div>
      </div>
      <button type="button" onClick={onReview} className="z-btn-primary !text-xs !bg-rose-800 hover:!bg-rose-900 min-h-10">
        Review exceptions
      </button>
    </div>
  );
}

/** Directory of related report surfaces — /reports owns period packs; desks own live printables. */
export function ReportsRelatedLinks({
  showExec,
  showAccounting,
  showIntelligence,
  showOperations,
  showFinanceDesk,
  showCustomers,
}) {
  const links = [];
  if (showAccounting) {
    links.push({ to: '/accounting?tab=statements', label: 'Accounting statements', hint: 'P&L / position print' });
    links.push({ to: '/accounting?tab=assets', label: 'Fixed assets', hint: 'Register print & CSV' });
    links.push({ to: '/accounting?tab=costing', label: 'Production costing', hint: 'AP3 readiness on desk' });
    links.push({ to: '/accounting?tab=gl', label: 'General ledger', hint: 'Live TB & journals' });
  }
  if (showFinanceDesk) {
    links.push({ to: '/accounts', label: 'Finance desk', hint: 'Treasury statement & unreconciled' });
  }
  if (showCustomers) {
    links.push({ to: '/customers', label: 'Customer reports', hint: 'Per-customer sales / AR print' });
  }
  if (showOperations) {
    links.push({ to: '/operations', label: 'Operations', hint: 'Stock count & production queues' });
    links.push({
      to: '/operations/material-exceptions',
      label: 'Material exceptions desk',
      hint: 'Incident print & triage',
    });
  }
  if (showExec) {
    links.push({ to: '/exec', label: 'Executive overview', hint: 'Approvals & org counts' });
  }
  if (showIntelligence) {
    links.push({ to: '/exec?tab=intelligence', label: 'Intelligence', hint: 'Forecasts & mix' });
  }
  links.push({ to: '/hr/documents?tab=reports', label: 'HR reports', hint: 'Workforce exports & print' });

  if (!links.length) return null;

  return (
    <footer className="pt-6 mt-8 border-t border-slate-100">
      <p className="text-ui-xs font-semibold tracking-wide text-slate-500 mb-1">Report directory</p>
      <p className="text-xs text-slate-500 mb-3 max-w-2xl">
        Period packs download above. Desk printables and live diagnostics open here with the same period context where
        the desk supports it.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="block rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-teal-200 transition-colors h-full"
            >
              <p className="text-sm font-semibold text-teal-900">{l.label}</p>
              <p className="text-ui-xs text-slate-500 mt-0.5">{l.hint}</p>
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}
