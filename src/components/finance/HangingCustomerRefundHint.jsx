import React from 'react';
import { AlertTriangle, Wallet } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { hangingRefundIndicator, hangingRefundOpenAmountNgn } from '../../lib/refundsStore';
import { hangingRefundHowToUse, ledgerOverpayHowToUse } from '../../lib/refundPendingUse.js';
import { REFUND_FUND_DEDUCTED_LABEL } from '../../lib/refundFundApply.js';

/** Headline amount: refund exposure when refunds exist, otherwise the unapplied ledger credit. */
function headlineAmountNgn(info) {
  return info.count > 0 ? info.totalOpenNgn : info.overpayCreditNgn;
}

/**
 * Compact chip for receipt / desk tables — display only, no auto-apply.
 * @param {{ hanging?: object[] | null; overpayCreditNgn?: number; indicator?: ReturnType<typeof hangingRefundIndicator>; className?: string }} props
 */
export function HangingCustomerRefundChip({ hanging, overpayCreditNgn = 0, indicator, className = '' }) {
  const info = indicator || hangingRefundIndicator(hanging, overpayCreditNgn);
  if (!info) return null;
  const title = [
    info.count > 0
      ? 'Same customer has leftover refund open elsewhere.'
      : 'Same customer has an overpayment credit not applied or requested as a refund yet.',
    'If Add payment used the refund fund on this job, that slice is shown separately and is not cash to confirm.',
    info.detailLabel,
    info.count > 0 ? `Refunds open ${formatNgn(info.totalOpenNgn)}` : '',
    info.overpayCreditNgn > 0 ? `Unapplied credit ${formatNgn(info.overpayCreditNgn)}` : '',
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
        {formatNgn(headlineAmountNgn(info))}
      </span>
      {info.count > 0 && info.overpayCreditNgn > 0 ? (
        <span className="normal-case font-semibold tabular-nums tracking-normal text-rose-800/90">
          · credit {formatNgn(info.overpayCreditNgn)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Banner for Confirm payment received modal.
 * @param {{ hanging?: object[] | null; overpayCreditNgn?: number; indicator?: ReturnType<typeof hangingRefundIndicator> }} props
 */
export function HangingCustomerRefundBanner({ hanging, overpayCreditNgn = 0, indicator }) {
  const info = indicator || hangingRefundIndicator(hanging, overpayCreditNgn);
  if (!info) return null;
  return (
    <div
      className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-ui-xs text-rose-950 leading-snug"
      role="status"
    >
      <AlertTriangle size={16} className="text-rose-800 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="font-bold">
          {info.shortLabel} · {formatNgn(headlineAmountNgn(info))} open
          {info.count > 0 && info.overpayCreditNgn > 0 ? (
            <span className="font-semibold"> · unapplied credit {formatNgn(info.overpayCreditNgn)}</span>
          ) : null}
        </p>
        <p className="mt-0.5 font-medium text-rose-900/90">
          {info.count > 0
            ? 'Each open refund stays listed below with how to use it. Do not confirm a receipt line as new bank cash if it is the same ₦ as a hanging refund — tick the refund instead.'
            : 'This customer has an overpayment credit that has not been applied or requested as a refund yet. Tick it on Confirm payment or Add payment to cover a new receipt — no refund form needed.'}
        </p>
        {Array.isArray(hanging) && hanging.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {hanging.map((r) => {
              const rid = String(r.refundID || '').trim() || 'Refund';
              const status = String(r.status || '').trim() || '—';
              const q = String(r.quotationRef || '').trim();
              const open = hangingRefundOpenAmountNgn(r);
              return (
                <li
                  key={rid}
                  className="rounded-lg border border-rose-200/80 bg-white/70 px-2 py-1.5 text-rose-950"
                >
                  <p className="font-bold tabular-nums">
                    {rid} · {status} · {formatNgn(open)}
                    {q ? ` · ${q}` : ''}
                  </p>
                  <p className="mt-0.5 font-medium text-rose-900/90">{hangingRefundHowToUse(r)}</p>
                </li>
              );
            })}
          </ul>
        ) : info.detailLabel ? (
          <p className="mt-1 font-mono text-[10px] text-rose-800/90 break-words">{info.detailLabel}</p>
        ) : null}
        {info.overpayCreditNgn > 0 ? (
          <p className="mt-2 font-medium text-rose-900/90">
            Unapplied ledger credit {formatNgn(info.overpayCreditNgn)} — {ledgerOverpayHowToUse()}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Compact chip when this quotation already had refund fund applied (not cash to clear).
 * @param {{ appliedNgn?: number; className?: string }} props
 */
export function RefundFundAppliedChip({ appliedNgn = 0, className = '' }) {
  const amt = Math.round(Number(appliedNgn) || 0);
  if (!(amt > 0)) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-ui-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 ${className}`}
      title={`${REFUND_FUND_DEDUCTED_LABEL} ${formatNgn(amt)} — already settled this quotation; not bank clearance.`}
      role="status"
    >
      <Wallet size={11} className="shrink-0" aria-hidden />
      Refund fund
      <span className="normal-case font-semibold tabular-nums tracking-normal">{formatNgn(amt)}</span>
    </span>
  );
}

/**
 * Cashier confirm strip: deducted from refund fund vs cash to confirm.
 * @param {{ summary?: { appliedNgn?: number; cashOnReceiptNgn?: number | null; quoteTotalNgn?: number | null; quotationRef?: string; detailLabel?: string } | null }} props
 */
export function RefundFundClearanceBanner({ summary }) {
  const applied = Math.round(Number(summary?.appliedNgn) || 0);
  if (!(applied > 0)) return null;
  const cash =
    summary?.cashOnReceiptNgn == null ? null : Math.round(Number(summary.cashOnReceiptNgn) || 0);
  const quoteTotal =
    summary?.quoteTotalNgn == null ? null : Math.round(Number(summary.quoteTotalNgn) || 0);
  return (
    <div
      className="flex gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-ui-xs text-sky-950 leading-snug"
      role="status"
    >
      <Wallet size={16} className="text-sky-800 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="font-bold">
          {REFUND_FUND_DEDUCTED_LABEL} · {formatNgn(applied)}
        </p>
        <p className="mt-0.5 font-medium text-sky-900/90">
          This slice already settled the quotation from the customer’s refund fund. It is not
          refundable again and does not need bank clearance.
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums">
          {quoteTotal != null ? (
            <>
              <dt className="text-sky-800/80">Quote total</dt>
              <dd className="font-semibold text-right">{formatNgn(quoteTotal)}</dd>
            </>
          ) : null}
          <dt className="text-sky-800/80">{REFUND_FUND_DEDUCTED_LABEL}</dt>
          <dd className="font-semibold text-right">{formatNgn(applied)}</dd>
          {cash != null ? (
            <>
              <dt className="font-bold text-sky-950">Cash to confirm</dt>
              <dd className="font-black text-right">{formatNgn(cash)}</dd>
            </>
          ) : null}
        </dl>
        {summary?.quotationRef ? (
          <p className="mt-1 font-mono text-[10px] text-sky-800/90 break-words">
            {summary.quotationRef}
            {summary.detailLabel ? ` · ${summary.detailLabel}` : ''}
          </p>
        ) : summary?.detailLabel ? (
          <p className="mt-1 font-mono text-[10px] text-sky-800/90 break-words">{summary.detailLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
