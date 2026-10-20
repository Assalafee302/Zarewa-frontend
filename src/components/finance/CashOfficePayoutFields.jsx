import React from 'react';
import { cashOfficePayoutProblem } from '../../shared/lib/payoutAccountGuard.js';
import { payLinesUseCashOffice } from '../../lib/cashOfficePayout.js';

/**
 * Owner D2 (Finance Phase A): a payout from the Cash Office records who took the cash and the
 * voucher it was paid on (bank / POS payouts need the payee's bank account instead).
 */
export function CashOfficePayoutFields({ lines = [], accounts = [], value = {}, onChange }) {
  if (!payLinesUseCashOffice(lines, accounts)) return null;
  const problem = cashOfficePayoutProblem(value);
  const set = (patch) => onChange?.({ ...value, ...patch });
  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3" data-testid="cash-office-payout-fields">
      <p className="text-ui-xs font-bold uppercase tracking-wider text-amber-900">Cash Office payout</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Recipient name</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            value={value.recipientName || ''}
            onChange={(e) => set({ recipientName: e.target.value })}
            placeholder="Who took the cash"
          />
        </label>
        <label className="space-y-1">
          <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Voucher reference</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            value={value.voucherReference || ''}
            onChange={(e) => set({ voucherReference: e.target.value })}
            placeholder="e.g. CV-0412"
          />
        </label>
      </div>
      {problem ? <p className="text-ui-xs font-semibold text-amber-800">{problem}</p> : null}
    </div>
  );
}
