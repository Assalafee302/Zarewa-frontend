import React from 'react';
import { Bell } from 'lucide-react';

/**
 * Mobile-only sales alerts — tap a chip to filter the matching queue.
 */
export default function SalesMobileAlertStrip({
  salesTab,
  pendingApproval = 0,
  pendingRefunds = 0,
  awaitingPayRefunds = 0,
  followUpCount = 0,
  awaitingCashierReceipts = 0,
  onFollowUp,
  onPendingApproval,
  onPendingRefunds,
  onAwaitingPayRefunds,
  onAwaitingCashier,
}) {
  const items = [];
  if (salesTab === 'quotations' && followUpCount > 0) {
    items.push({
      key: 'follow-up',
      label: `${followUpCount} quote follow-up${followUpCount !== 1 ? 's' : ''}`,
      tone: 'amber',
      onClick: onFollowUp,
    });
  }
  if (salesTab === 'quotations' && pendingApproval > 0) {
    items.push({
      key: 'pending-approval',
      label: `${pendingApproval} awaiting approval`,
      tone: 'slate',
      onClick: onPendingApproval,
    });
  }
  if (salesTab === 'refund' && pendingRefunds > 0) {
    items.push({
      key: 'pending-refunds',
      label: `${pendingRefunds} pending refund${pendingRefunds !== 1 ? 's' : ''}`,
      tone: 'amber',
      onClick: onPendingRefunds,
    });
  }
  if (salesTab === 'refund' && awaitingPayRefunds > 0) {
    items.push({
      key: 'awaiting-pay',
      label: `${awaitingPayRefunds} approved — awaiting Finance`,
      tone: 'teal',
      onClick: onAwaitingPayRefunds,
    });
  }
  if (salesTab === 'receipts' && awaitingCashierReceipts > 0) {
    items.push({
      key: 'awaiting-cashier',
      label: `${awaitingCashierReceipts} receipt${awaitingCashierReceipts !== 1 ? 's' : ''} awaiting confirmation`,
      tone: 'amber',
      onClick: onAwaitingCashier,
    });
  }

  if (items.length === 0) return null;

  const toneCls = {
    amber: 'border-amber-200 bg-amber-50/90 text-amber-950 hover:bg-amber-100/90',
    teal: 'border-teal-200 bg-teal-50/90 text-teal-950 hover:bg-teal-100/90',
    slate: 'border-slate-200 bg-slate-50/90 text-slate-800 hover:bg-slate-100/90',
  };

  return (
    <div className="lg:hidden flex flex-wrap gap-2 mb-4" aria-label="Sales alerts">
      <span className="inline-flex items-center gap-1 text-ui-xs font-bold uppercase tracking-wider text-slate-500 w-full">
        <Bell size={12} aria-hidden /> Alerts
      </span>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => item.onClick?.()}
          className={`inline-flex min-h-9 items-center rounded-lg border px-2.5 py-1.5 text-ui-xs font-semibold transition-colors ${toneCls[item.tone] || toneCls.slate}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
