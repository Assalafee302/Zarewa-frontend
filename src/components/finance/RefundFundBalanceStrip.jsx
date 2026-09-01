/**
 * Shows original vs already used on another receipt/quotation vs leftover.
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
  usedOn = 'receipt',
  leftoverHint = 'apply',
  tone = 'light',
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
  const usedWhere = b.appliedToQuote
    ? `on ${b.appliedToQuote}`
    : usedOn === 'quotation'
      ? 'on another quotation'
      : 'on another receipt';
  const leftCopy =
    leftoverHint === 'payout'
      ? b.leftNgn > 0
        ? `${formatNgn(b.leftNgn)} is all that can still be paid out.`
        : 'Nothing left to pay out.'
      : b.leftNgn > 0
        ? `${formatNgn(b.leftNgn)} left to apply or pay.`
        : 'Nothing left on this refund.';
  const leftColumn = leftoverHint === 'payout' ? 'Can pay' : 'Left';
  const dark = tone === 'dark';
  return (
    <div
      className={`${
        dark
          ? 'rounded-lg border border-amber-400/35 bg-slate-950/55 px-2.5 py-2 text-amber-50'
          : 'rounded-lg border border-amber-200/90 bg-white/85 px-2.5 py-2 text-amber-950'
      } ${className}`.trim()}
    >
      <p className={`text-xs font-medium leading-snug ${dark ? 'text-amber-100' : ''}`}>
        Already used <span className="font-bold tabular-nums">{formatNgn(b.usedOnReceiptNgn)}</span>{' '}
        {usedWhere}.{' '}
        <span className={`font-bold tabular-nums ${dark ? 'text-emerald-300' : 'text-emerald-900'}`}>
          {leftCopy}
        </span>
      </p>
      <dl className="mt-1.5 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className={`text-[10px] font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Original
          </dt>
          <dd className={`font-black tabular-nums ${dark ? 'text-slate-100' : 'text-slate-800'}`}>
            {formatNgn(b.requestedNgn)}
          </dd>
        </div>
        <div>
          <dt className={`text-[10px] font-semibold ${dark ? 'text-amber-300' : 'text-amber-800'}`}>
            Used
          </dt>
          <dd className={`font-black tabular-nums ${dark ? 'text-amber-200' : 'text-amber-900'}`}>
            {formatNgn(b.usedOnReceiptNgn)}
          </dd>
        </div>
        <div>
          <dt className={`text-[10px] font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-800'}`}>
            {leftColumn}
          </dt>
          <dd className={`font-black tabular-nums ${dark ? 'text-emerald-200' : 'text-emerald-900'}`}>
            {formatNgn(b.leftNgn)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
