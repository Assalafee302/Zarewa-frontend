import React, { useMemo } from 'react';

function KpiCard({ label, value, hint, tone = 'default' }) {
  const toneBorder = {
    default: 'border-slate-200',
    warn: 'border-amber-200',
    action: 'border-teal-200',
  };
  return (
    <div
      className={`min-w-[8.5rem] rounded-xl border bg-white px-3 py-2.5 shadow-sm ${toneBorder[tone] || toneBorder.default}`}
    >
      <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black tabular-nums text-zarewa-teal">{value}</p>
      {hint ? <p className="mt-0.5 text-ui-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Contextual KPI strip for the Sales desk — desktop only (mobile uses SalesMobileAlertStrip).
 */
export default function SalesKpiStrip({ salesTab, listStats, followUpCount = 0 }) {
  const cards = useMemo(() => {
    switch (salesTab) {
      case 'quotations':
        return [
          { label: 'Showing', value: listStats.quotations.shown },
          {
            label: 'Awaiting approval',
            value: listStats.quotations.pendingApproval,
            tone: listStats.quotations.pendingApproval > 0 ? 'warn' : 'default',
          },
          {
            label: 'Follow-up',
            value: followUpCount,
            tone: followUpCount > 0 ? 'action' : 'default',
          },
        ];
      case 'receipts':
        return [
          { label: 'Records', value: listStats.receipts.shown },
          {
            label: 'Awaiting cashier',
            value: listStats.receipts.awaitingCashier,
            tone: listStats.receipts.awaitingCashier > 0 ? 'warn' : 'default',
          },
        ];
      case 'cuttinglist':
        return [{ label: 'Lists', value: listStats.cuttinglist.shown }];
      case 'refund':
        return [
          { label: 'Records', value: listStats.refund.shown },
          {
            label: 'Pending',
            value: listStats.refund.pending,
            tone: listStats.refund.pending > 0 ? 'warn' : 'default',
          },
          {
            label: 'Awaiting pay',
            value: listStats.refund.awaitingPay,
            tone: listStats.refund.awaitingPay > 0 ? 'action' : 'default',
            hint: listStats.refund.awaitingPay > 0 ? 'Approved · Finance' : undefined,
          },
        ];
      case 'customers':
        return [
          { label: 'Showing', value: listStats.customers.shown },
          { label: 'Total', value: listStats.customers.total },
        ];
      default:
        return [];
    }
  }, [salesTab, listStats, followUpCount]);

  if (!cards.length) return null;

  return (
    <div
      className="hidden lg:block z-scroll-x overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-50/60 p-2 mb-6"
      aria-label="Sales summary"
    >
      <div className="flex w-max gap-2">
        {cards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>
    </div>
  );
}
