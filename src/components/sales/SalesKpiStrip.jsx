import React, { useMemo } from 'react';

function KpiCard({ label, value, hint, tone = 'default', onClick }) {
  const toneBorder = {
    default: 'border-slate-200',
    warn: 'border-amber-200',
    action: 'border-teal-200',
  };
  const className = `min-w-[8.5rem] rounded-xl border bg-white px-3 py-2.5 shadow-sm text-left ${toneBorder[tone] || toneBorder.default} ${
    onClick ? 'cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30' : ''
  }`;
  const body = (
    <>
      <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black tabular-nums text-zarewa-teal">{value}</p>
      {hint ? <p className="mt-0.5 text-ui-xs text-slate-500">{hint}</p> : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

/**
 * Contextual KPI strip for the Sales desk — desktop only (mobile uses SalesMobileAlertStrip).
 */
export default function SalesKpiStrip({
  salesTab,
  listStats,
  followUpCount = 0,
  onFollowUp,
  onPendingApproval,
  onAwaitingCashier,
  onPendingRefunds,
  onAwaitingPayRefunds,
}) {
  const cards = useMemo(() => {
    switch (salesTab) {
      case 'quotations':
        return [
          { label: 'Showing', value: listStats.quotations.shown },
          {
            label: 'Awaiting approval',
            value: listStats.quotations.pendingApproval,
            tone: listStats.quotations.pendingApproval > 0 ? 'warn' : 'default',
            onClick: listStats.quotations.pendingApproval > 0 ? onPendingApproval : undefined,
          },
          {
            label: 'Follow-up',
            value: followUpCount,
            tone: followUpCount > 0 ? 'action' : 'default',
            onClick: followUpCount > 0 ? onFollowUp : undefined,
          },
        ];
      case 'receipts':
        return [
          {
            label: 'In view',
            value: listStats.receipts.matching,
            hint:
              listStats.receipts.matching > listStats.receipts.shown
                ? `${listStats.receipts.shown} visible`
                : undefined,
          },
          {
            label: 'Draft',
            value: listStats.receipts.awaitingCashier,
            tone: listStats.receipts.awaitingCashier > 0 ? 'warn' : 'default',
            onClick: listStats.receipts.awaitingCashier > 0 ? onAwaitingCashier : undefined,
          },
        ];
      case 'cuttinglist':
        return [{ label: 'Cutting lists', value: listStats.cuttinglist.shown }];
      case 'refund':
        return [
          { label: 'Records', value: listStats.refund.shown },
          {
            label: 'Pending',
            value: listStats.refund.pending,
            tone: listStats.refund.pending > 0 ? 'warn' : 'default',
            onClick: listStats.refund.pending > 0 ? onPendingRefunds : undefined,
          },
          {
            label: 'Awaiting payout',
            value: listStats.refund.awaitingPay,
            tone: listStats.refund.awaitingPay > 0 ? 'action' : 'default',
            hint: listStats.refund.awaitingPay > 0 ? 'Approved · Finance' : undefined,
            onClick: listStats.refund.awaitingPay > 0 ? onAwaitingPayRefunds : undefined,
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
  }, [
    salesTab,
    listStats,
    followUpCount,
    onFollowUp,
    onPendingApproval,
    onAwaitingCashier,
    onPendingRefunds,
    onAwaitingPayRefunds,
  ]);

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
