import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { ModalFrame } from '../layout/ModalFrame';

/**
 * Customer advance refund — same visual language as quotation RefundModal (rose/teal, rounded panel).
 */
export function RefundAdvanceModal({
  isOpen,
  onClose,
  advanceBalanceNgn,
  amount,
  onAmountChange,
  onSubmit,
  busy = false,
  formatNgn = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`,
}) {
  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} title="Refund customer advance" surface="plain">
      <form
        onSubmit={onSubmit}
        className="z-modal-panel flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-200">
              <RotateCcw size={22} aria-hidden />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Refund advance</h3>
              <p className="text-xs font-medium text-slate-500">Treasury payout from customer deposit pool</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs leading-relaxed text-slate-600">
            Current advance balance <span className="font-bold text-zarewa-teal">{formatNgn(advanceBalanceNgn)}</span>.
            Posting reduces cash or bank and the customer deposit subledger (2500).
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Amount (₦)
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm font-bold tabular-nums text-zarewa-teal outline-none focus:ring-2 focus:ring-rose-500/15"
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 leading-snug">
            <span className="font-semibold text-slate-700">GL hint:</span> Dr 2500 Customer deposits · Cr 1000
            Cash/Bank
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200/60 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-rose-200 hover:brightness-105 disabled:opacity-50"
          >
            {busy ? 'Posting…' : 'Post refund'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}
