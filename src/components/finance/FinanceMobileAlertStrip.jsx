import React from 'react';
import { Bell } from 'lucide-react';

/**
 * Mobile-only finance desk alerts (lg+ uses KPI strip on Desk).
 */
export function FinanceMobileAlertStrip({
  pendingReceipts = 0,
  approvedPayments = 0,
  approvedRefunds = 0,
  registerWithdrawals = 0,
  poHaulage = 0,
  staffRecoveries = 0,
}) {
  const items = [];
  if (pendingReceipts > 0) {
    items.push({
      label: `${pendingReceipts} receipt${pendingReceipts !== 1 ? 's' : ''} to confirm`,
      tone: 'amber',
    });
  }
  if (approvedPayments > 0) {
    items.push({
      label: `${approvedPayments} payment${approvedPayments !== 1 ? 's' : ''} to pay`,
      tone: 'teal',
    });
  }
  if (approvedRefunds > 0) {
    items.push({
      label: `${approvedRefunds} refund payout${approvedRefunds !== 1 ? 's' : ''}`,
      tone: 'rose',
    });
  }
  if (registerWithdrawals > 0) {
    items.push({
      label: `${registerWithdrawals} register withdrawal${registerWithdrawals !== 1 ? 's' : ''}`,
      tone: 'teal',
    });
  }
  if (poHaulage > 0) {
    items.push({
      label: `${poHaulage} haulage payout${poHaulage !== 1 ? 's' : ''}`,
      tone: 'sky',
    });
  }
  if (staffRecoveries > 0) {
    items.push({
      label: `${staffRecoveries} staff recover${staffRecoveries !== 1 ? 'ies' : 'y'} due`,
      tone: 'violet',
    });
  }

  if (items.length === 0) return null;

  const toneCls = {
    amber: 'border-amber-200 bg-amber-50/90 text-amber-950',
    teal: 'border-teal-200 bg-teal-50/90 text-teal-950',
    rose: 'border-rose-200 bg-rose-50/90 text-rose-950',
    sky: 'border-sky-200 bg-sky-50/90 text-sky-950',
    violet: 'border-violet-200 bg-violet-50/90 text-violet-950',
  };

  return (
    <div className="lg:hidden flex flex-wrap gap-2 mb-4" role="status" aria-label="Finance desk alerts">
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 w-full">
        <Bell size={12} aria-hidden /> Desk alerts
      </span>
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex rounded-lg border px-2.5 py-2 text-[11px] font-semibold min-h-9 items-center ${toneCls[item.tone] || toneCls.teal}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
