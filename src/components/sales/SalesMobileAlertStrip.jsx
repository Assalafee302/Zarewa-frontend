import React from 'react';
import { Bell } from 'lucide-react';

/**
 * Mobile-only sales alerts — desktop sidebar remains unchanged (lg+).
 */
export default function SalesMobileAlertStrip({
  salesTab,
  pendingApproval = 0,
  pendingRefunds = 0,
  awaitingPayRefunds = 0,
  followUpCount = 0,
  awaitingCashierReceipts = 0,
}) {
  const items = [];
  if (salesTab === 'quotations' && followUpCount > 0) {
    items.push({ label: `${followUpCount} quote follow-up${followUpCount !== 1 ? 's' : ''}`, tone: 'amber' });
  }
  if (salesTab === 'quotations' && pendingApproval > 0) {
    items.push({ label: `${pendingApproval} awaiting approval`, tone: 'slate' });
  }
  if (salesTab === 'refund' && pendingRefunds > 0) {
    items.push({ label: `${pendingRefunds} pending refund${pendingRefunds !== 1 ? 's' : ''}`, tone: 'amber' });
  }
  if (salesTab === 'refund' && awaitingPayRefunds > 0) {
    items.push({ label: `${awaitingPayRefunds} approved — awaiting Finance`, tone: 'teal' });
  }
  if (salesTab === 'receipts' && awaitingCashierReceipts > 0) {
    items.push({
      label: `${awaitingCashierReceipts} payment${awaitingCashierReceipts !== 1 ? 's' : ''} awaiting cashier`,
      tone: 'amber',
    });
  }

  if (items.length === 0) return null;

  const toneCls = {
    amber: 'border-amber-200 bg-amber-50/90 text-amber-950',
    teal: 'border-teal-200 bg-teal-50/90 text-teal-950',
    slate: 'border-slate-200 bg-slate-50/90 text-slate-800',
  };

  return (
    <div className="lg:hidden flex flex-wrap gap-2 mb-4" role="status" aria-label="Sales alerts">
      <span className="inline-flex items-center gap-1 text-ui-xs font-bold uppercase tracking-wider text-slate-500 w-full">
        <Bell size={12} aria-hidden /> Alerts
      </span>
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex rounded-lg border px-2.5 py-1.5 text-ui-xs font-semibold ${toneCls[item.tone] || toneCls.slate}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
