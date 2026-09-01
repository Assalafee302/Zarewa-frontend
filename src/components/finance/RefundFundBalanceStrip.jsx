/**
 * Shows original vs already used on another receipt vs leftover on this refund.
 */
import React from 'react';
import { formatNgn } from '../../Data/mockData';
import { refundFundUsageBreakdown } from '../../shared/lib/refundCreditApply.js';

export function RefundFundBalanceStrip({
  amountNgn,
  availableNgn,
  creditAppliedNgn,
  paidAmountNgn,
  creditAppliedToQuotationRef,
  className = '',
}) {
  const b = refundFundUsageBreakdown({
    amountNgn,
    availableNgn,
    creditAppliedNgn,
    paidAmountNgn,
    creditAppliedToQuotationRef,
  });
  if (!b.hasPartialUse) return null;
  return (
    <div
      className={`rounded-lg border border-amber-200/90 bg-white/85 px-2.5 py-2 text-amber-950 ${className}`.trim()}
    >
      <p className="text-xs font-medium leading-snug">
        Already used <span className="font-bold tabular-nums">{formatNgn(b.usedOnReceiptNgn)}</span>
        {b.appliedToQuote ? (
          <>
            {' '}
            on <span className="font-mono font-bold">{b.appliedToQuote}</span>
          </>
        ) : (
          ' on another receipt'
        )}
        . <span className="font-bold text-emerald-900 tabular-nums">{formatNgn(b.leftNgn)} left</span>
        {b.leftNgn > 0 ? ' to apply or pay.' : '.'}
      </p>
      <dl className="mt-1.5 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[10px] font-semibold text-slate-500">Original</dt>
          <dd className="font-black tabular-nums text-slate-800">{formatNgn(b.requestedNgn)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold text-amber-800">Used</dt>
          <dd className="font-black tabular-nums text-amber-900">{formatNgn(b.usedOnReceiptNgn)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold text-emerald-800">Left</dt>
          <dd className="font-black tabular-nums text-emerald-900">{formatNgn(b.leftNgn)}</dd>
        </div>
      </dl>
    </div>
  );
}
