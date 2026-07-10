import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Banknote, Landmark, UserRound, X, ChevronDown, ChevronUp } from 'lucide-react';
import { FinanceActionButton } from './FinanceActionButton';

const STORAGE_KEY = 'zarewa.cashierDeskGuide.dismissed';

const STEPS = [
  {
    icon: Landmark,
    title: 'Check liquidity first',
    body: 'Total book balance and each till/bank account appear at the top. Know what you have before paying out.',
  },
  {
    icon: Banknote,
    title: 'Confirm receipts (money in)',
    body: 'Sales posts customer payments — you confirm what landed in bank or cash before balances clear.',
  },
  {
    icon: LayoutDashboard,
    title: 'Post approved payouts',
    body: 'Refunds, expenses, register withdrawals, and haulage — all from this tab.',
  },
  {
    icon: UserRound,
    title: 'Staff payments stay private',
    body: 'Loans and HR recoveries sit in a collapsed section at the bottom — expand only when the employee is at your desk.',
  },
  {
    icon: Landmark,
    title: 'View account statements',
    body: 'Tap any till or bank card below to open movements and balances — all on this page.',
  },
];

/**
 * One-time collapsible orientation for branch cashiers on Finance → Desk.
 */
export function FinanceDeskCashierGuide() {
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <section
      className="rounded-2xl border border-teal-200/90 bg-gradient-to-br from-teal-50/90 to-white p-5 shadow-sm"
      data-testid="cashier-desk-guide"
      aria-label="Cashier desk quick guide"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-zarewa-teal">Start here</p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">Your daily cashier workflow</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-ui-xs font-bold uppercase tracking-wide text-slate-500 hover:text-teal-800"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Dismiss guide"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {expanded ? (
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="flex gap-3 rounded-xl border border-white/80 bg-white/70 px-3 py-3 shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-zarewa-teal">
                  <Icon size={16} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">
                    Step {idx + 1}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{step.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <FinanceActionButton
          variant="link"
          onClick={() => document.getElementById('desk-accounts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          Jump to accounts
        </FinanceActionButton>
        <FinanceActionButton variant="link" onClick={dismiss}>
          Got it — hide this guide
        </FinanceActionButton>
      </div>
    </section>
  );
}
