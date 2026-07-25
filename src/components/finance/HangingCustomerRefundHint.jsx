import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { hangingRefundIndicator } from '../../lib/refundsStore';

/**
 * Compact chip for receipt / desk tables — display only, no auto-apply.
 * @param {{ hanging?: object[] | null; indicator?: ReturnType<typeof hangingRefundIndicator>; className?: string }} props
 */
export function HangingCustomerRefundChip({ hanging, indicator, className = '' }) {
  const info = indicator || hangingRefundIndicator(hanging);
  if (!info) return null;
  const title = [
    'Same customer has an open refund elsewhere.',
    'Overpayment on this receipt may belong against that refund / another receipt — review only; not auto-applied.',
    info.detailLabel,
    formatNgn(info.totalOpenNgn),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <span
      className={`inline-flex items-center gap-1 text-ui-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 ${className}`}
      title={title}
      role="status"
    >
      <AlertTriangle size={11} className="shrink-0" aria-hidden />
      {info.shortLabel}
      <span className="normal-case font-semibold tabular-nums tracking-normal">
        {formatNgn(info.totalOpenNgn)}
      </span>
    </span>
  );
}

/**
 * Banner for Confirm payment received modal.
 * @param {{ hanging?: object[] | null; indicator?: ReturnType<typeof hangingRefundIndicator> }} props
 */
export function HangingCustomerRefundBanner({ hanging, indicator }) {
  const info = indicator || hangingRefundIndicator(hanging);
  if (!info) return null;
  return (
    <div
      className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-ui-xs text-rose-950 leading-snug"
      role="status"
    >
      <AlertTriangle size={16} className="text-rose-800 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="font-bold">
          {info.shortLabel} · {formatNgn(info.totalOpenNgn)} open
        </p>
        <p className="mt-0.5 font-medium text-rose-900/90">
          This customer already has a refund in progress. Some of the amount on this receipt may need to
          cover that liability or another quotation — review only; nothing is auto-deducted.
        </p>
        {info.detailLabel ? (
          <p className="mt-1 font-mono text-[10px] text-rose-800/90 break-words">{info.detailLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
