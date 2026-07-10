import React from 'react';
import { formatNgn } from '../../Data/mockData';

/**
 * At-a-glance receipts workflow on Finance → Receipts tab.
 */
export function FinanceReceiptsWorkflowStrip({
  pendingCount = 0,
  confirmedCount = 0,
  pendingNgn = 0,
  openBankDeposits = 0,
  onGoToDesk,
}) {
  const chips = [
    { label: 'Pending clearance', value: pendingCount, sub: pendingCount ? formatNgn(pendingNgn) : '—', tone: 'amber' },
    { label: 'Confirmed', value: confirmedCount, sub: 'Cleared in finance', tone: 'emerald' },
    { label: 'Unlinked bank lines', value: openBankDeposits, sub: 'Register / link', tone: 'sky' },
  ];
  const toneCls = {
    amber: 'border-amber-200/90 bg-amber-50/70 text-amber-950',
    emerald: 'border-emerald-200/90 bg-emerald-50/60 text-emerald-950',
    sky: 'border-sky-200/90 bg-sky-50/60 text-sky-950',
  };

  return (
    <div
      className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-2"
      data-testid="finance-receipts-workflow-strip"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ui-xs font-black uppercase tracking-wide text-zarewa-teal">Receipts workflow</p>
        {onGoToDesk ? (
          <button
            type="button"
            onClick={onGoToDesk}
            className="text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal underline-offset-2 hover:underline"
          >
            Open My desk queue
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {chips.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg border px-2.5 py-2 ${toneCls[c.tone] || toneCls.amber}`}
          >
            <p className="text-ui-xs font-bold uppercase tracking-wide opacity-80">{c.label}</p>
            <p className="text-lg font-black tabular-nums leading-tight">{c.value}</p>
            <p className="text-ui-xs opacity-80 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>
      <p className="text-ui-xs text-slate-500 leading-relaxed">
        Step 1 — confirm sales receipts against bank/cash. Step 2 — register unknown bank inflows. Step 3 — match daily
        bank lines below.
      </p>
    </div>
  );
}
