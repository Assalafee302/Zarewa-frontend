import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { quotationRefundableBreakdown } from '../../shared/lib/refundQuotationMoney.js';

const ngn = (v) => `₦${Math.max(0, Math.round(Number(v) || 0)).toLocaleString('en-NG')}`;

/**
 * One figure a cashier, BM or MD can act on — "Refundable on this quotation" — with the breakdown one tap away:
 * cash received − refunds already on file − credit moved to other quotations. "System suggests" is the sum of the
 * preview lines (what the form used to call "Remaining"), kept separate because it is not the balance.
 *
 * @param {{
 *   breakdown?: { cashInNgn?: number, refundsNgn?: number, creditOutNgn?: number, refundableNgn?: number } | null,
 *   cashInNgn?: number, refundsNgn?: number, creditOutNgn?: number,
 *   suggestedNgn?: number | null,
 *   requestedNgn?: number | null,
 *   tone?: 'light' | 'dark',
 *   compact?: boolean,
 * }} props
 */
export function RefundableBalance({ breakdown = null, cashInNgn, refundsNgn, creditOutNgn, suggestedNgn = null, requestedNgn = null, tone = 'light', compact = false }) {
  const [open, setOpen] = useState(false);
  const b =
    breakdown && typeof breakdown === 'object'
      ? quotationRefundableBreakdown({
          cashInNgn: breakdown.cashInNgn,
          refundsNgn: breakdown.refundsNgn,
          creditOutNgn: breakdown.creditOutNgn,
        })
      : quotationRefundableBreakdown({ cashInNgn, refundsNgn, creditOutNgn });
  const requested = requestedNgn != null ? Math.max(0, Math.round(Number(requestedNgn) || 0)) : null;
  const over = requested != null && requested > b.refundableNgn ? requested - b.refundableNgn : 0;
  const leftAfter = requested != null ? Math.max(0, b.refundableNgn - requested) : null;
  const dark = tone === 'dark';
  const label = dark ? 'text-slate-500' : 'text-slate-400';
  const value = over > 0 ? 'text-rose-500' : dark ? 'text-amber-200' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'} data-testid="refundable-balance">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${label}`}>Refundable on this quotation</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${muted} hover:underline`}
          aria-expanded={open}
        >
          {open ? 'Hide' : 'How'} {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>
      <p className={`font-mono text-base font-black tabular-nums ${value}`}>{ngn(b.refundableNgn)}</p>
      {over > 0 ? (
        <p className="text-[11px] font-semibold text-rose-600 leading-snug">
          Request {ngn(requested)} is above the refundable balance by {ngn(over)}.
        </p>
      ) : leftAfter != null && requested > 0 ? (
        <p className={`text-[11px] ${muted} leading-snug`}>
          {ngn(leftAfter)} left after this request.
        </p>
      ) : null}
      {open ? (
        <dl className={`mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-[11px] tabular-nums ${muted}`}>
          <dt>Cash received on the quotation</dt>
          <dd className="text-right font-semibold">{ngn(b.cashInNgn)}</dd>
          <dt>− refunds already on file (pending, approved, paid)</dt>
          <dd className="text-right font-semibold">{ngn(b.refundsNgn)}</dd>
          {b.creditOutNgn > 0 ? (
            <>
              <dt>− credit moved to other quotations</dt>
              <dd className="text-right font-semibold">{ngn(b.creditOutNgn)}</dd>
            </>
          ) : null}
          <dt className={`border-t pt-0.5 ${dark ? 'border-slate-700' : 'border-slate-200'} font-bold`}>= refundable</dt>
          <dd className={`border-t pt-0.5 text-right font-bold ${dark ? 'border-slate-700' : 'border-slate-200'}`}>{ngn(b.refundableNgn)}</dd>
          {suggestedNgn != null ? (
            <>
              <dt className="pt-1">System suggests (sum of the preview lines)</dt>
              <dd className="pt-1 text-right font-semibold">{ngn(suggestedNgn)}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

export default RefundableBalance;
