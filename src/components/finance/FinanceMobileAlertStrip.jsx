import React from 'react';
import { Bell } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';

function scrollToSection(id) {
  if (!id || typeof document === 'undefined') return;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Mobile finance desk alerts — tap a chip to jump to the matching queue section.
 */
export function FinanceMobileAlertStrip({
  pendingReceipts = 0,
  approvedPayments = 0,
  approvedRefunds = 0,
  registerWithdrawals = 0,
  poHaulage = 0,
  staffPayments = 0,
  bookTotalNgn = null,
}) {
  const items = [];
  if (pendingReceipts > 0) {
    items.push({
      key: 'receipts',
      label: `${pendingReceipts} receipt${pendingReceipts !== 1 ? 's' : ''} to confirm`,
      tone: 'amber',
      scrollTo: 'desk-queue-receipts',
    });
  }
  if (approvedPayments > 0) {
    items.push({
      key: 'payments',
      label: `${approvedPayments} payment${approvedPayments !== 1 ? 's' : ''} to pay`,
      tone: 'teal',
      scrollTo: 'desk-queue-expenses',
    });
  }
  if (approvedRefunds > 0) {
    items.push({
      key: 'refunds',
      label: `${approvedRefunds} refund payout${approvedRefunds !== 1 ? 's' : ''}`,
      tone: 'rose',
      scrollTo: 'desk-queue-refunds',
    });
  }
  if (registerWithdrawals > 0) {
    items.push({
      key: 'withdrawals',
      label: `${registerWithdrawals} register withdrawal${registerWithdrawals !== 1 ? 's' : ''}`,
      tone: 'teal',
      scrollTo: 'desk-queue-withdrawals',
    });
  }
  if (poHaulage > 0) {
    items.push({
      key: 'haulage',
      label: `${poHaulage} haulage payout${poHaulage !== 1 ? 's' : ''}`,
      tone: 'sky',
      scrollTo: 'desk-queue-haulage',
    });
  }
  if (staffPayments > 0) {
    items.push({
      key: 'staff-payments',
      label: `${staffPayments} staff payment${staffPayments !== 1 ? 's' : ''} due`,
      tone: 'violet',
      scrollTo: 'desk-queue-staff-payments',
    });
  }

  if (items.length === 0 && bookTotalNgn == null) return null;

  const toneCls = {
    amber: 'border-amber-200 bg-amber-50/90 text-amber-950 hover:bg-amber-100/90',
    teal: 'border-teal-200 bg-teal-50/90 text-teal-950 hover:bg-teal-100/90',
    rose: 'border-rose-200 bg-rose-50/90 text-rose-950 hover:bg-rose-100/90',
    sky: 'border-sky-200 bg-sky-50/90 text-sky-950 hover:bg-sky-100/90',
    violet: 'border-violet-200 bg-violet-50/90 text-violet-950 hover:bg-violet-100/90',
  };

  return (
    <div className="lg:hidden flex flex-wrap gap-2 mb-4" role="status" aria-label="Finance desk alerts">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
          <Bell size={12} aria-hidden /> Desk alerts
        </span>
        {bookTotalNgn != null ? (
          <button
            type="button"
            onClick={() => scrollToSection('desk-liquidity')}
            className="text-[10px] font-bold tabular-nums text-[#134e4a] underline-offset-2 hover:underline"
          >
            Book {formatNgn(bookTotalNgn)}
          </button>
        ) : null}
      </div>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => scrollToSection(item.scrollTo)}
          className={`inline-flex rounded-lg border px-2.5 py-2 text-[11px] font-semibold min-h-9 items-center transition-colors ${toneCls[item.tone] || toneCls.teal}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
