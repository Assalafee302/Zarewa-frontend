import React from 'react';
import { Bell } from 'lucide-react';
import {
  SALES_RECEIPT_PAYMENT_STATUS_AWAITING_CASHIER,
  SALES_RECEIPT_PAYMENT_STATUS_CASHIER_CONFIRMED,
} from '../../lib/receiptClearance.js';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'awaiting', label: SALES_RECEIPT_PAYMENT_STATUS_AWAITING_CASHIER },
  { id: 'confirmed', label: SALES_RECEIPT_PAYMENT_STATUS_CASHIER_CONFIRMED },
];

export function SalesReceiptPaymentStatusFilter({ value = 'all', onChange, counts = {} }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px]">
      <span className="font-bold text-slate-400 uppercase tracking-widest shrink-0">Payment status</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter payments by cashier confirmation">
        {FILTER_OPTIONS.map((opt) => {
          const active = value === opt.id;
          const count = counts[opt.id];
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange?.(opt.id)}
              className={`rounded-lg border px-2.5 py-1.5 font-semibold transition-colors ${
                active
                  ? 'border-[#134e4a] bg-[#134e4a] text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {opt.label}
              {count != null ? <span className="ml-1 tabular-nums opacity-80">({count})</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SalesReceiptPaymentStatusLegend() {
  return (
    <p className="text-[9px] text-slate-500 leading-snug">
      <span className="font-bold text-amber-800">Amber</span> — awaiting cashier confirmation ·{' '}
      <span className="font-bold text-teal-800">Teal</span> — cashier confirmed ·{' '}
      <span className="font-bold text-rose-800">Rose</span> — reversed
    </p>
  );
}

export function SalesReceiptAwaitingAlert({ count = 0, onFilterAwaiting }) {
  if (count <= 0) return null;
  const label = `${count} payment${count !== 1 ? 's' : ''} awaiting cashier confirmation`;
  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 sm:px-4"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-950">
        <Bell size={14} className="shrink-0" aria-hidden />
        {label}
      </span>
      {onFilterAwaiting ? (
        <button
          type="button"
          onClick={onFilterAwaiting}
          className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-950 hover:bg-amber-100 transition-colors"
        >
          Show awaiting only
        </button>
      ) : null}
    </div>
  );
}
