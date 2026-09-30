import React from 'react';
import { Paperclip, Printer } from 'lucide-react';
import { formatPersonName } from '../../lib/formatPersonName';
import { ExpenseCategoryLaneBadge } from '../office/ExpenseCategoryLaneBadge.jsx';
import { OfficialRecordBanner } from './OfficialRecordBanner';
import { DecisionBand, DecisionFact, DecisionWhatNext } from './DecisionSurface';

/**
 * Cash-tab expense request review — payee, amount, and what approve does.
 */
export function PaymentRequestApprovalPreview({
  requestId,
  row = null,
  formatNgn,
  lineItems = null,
  attachmentHref = '',
  onPrint,
  officialRecord = null,
  officialRecordFallbackId = '',
  onOpenRecord,
  isLight = true,
}) {
  const r = row && typeof row === 'object' ? row : {};
  const amount = formatNgn(r.amount_requested_ngn ?? r.amountRequestedNgn);
  const requester = formatPersonName(
    r.requested_by_name || r.requestedByName || r.created_by_name || r.handled_by || ''
  );
  const payeeName = r.payee_name || r.payeeName;
  const payeeBank = r.payee_bank_name || r.payeeBankName;
  const payeeAcct = r.payee_account_no || r.payeeAccountNo;
  const hasPayee = Boolean(payeeName || payeeBank || payeeAcct);
  const lines = Array.isArray(lineItems?.lines) ? lineItems.lines : [];
  const lineTotal = Number(lineItems?.total) || 0;

  return (
    <div className="animate-in fade-in space-y-3 duration-200 text-slate-700">
      <DecisionBand
        tone="payment"
        eyebrow="Expense payment request"
        title={requestId || '—'}
        subtitle={r.description || r.expense_id || null}
        aside={
          <>
            <p className="text-ui-xs font-bold uppercase text-slate-400">Amount</p>
            <p className="text-xl font-black tabular-nums text-slate-900">{amount}</p>
            {r.request_date ? (
              <p className="mt-0.5 text-ui-xs uppercase tracking-wide text-slate-500">{r.request_date}</p>
            ) : null}
          </>
        }
        meta={
          r.expense_category ? (
            <ExpenseCategoryLaneBadge category={r.expense_category} laneKey={r.expense_category_lane} />
          ) : null
        }
      >
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <DecisionFact label="Reference" value={r.request_reference} />
          <DecisionFact label="Requested by" value={requester} />
        </div>
        {r.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.description}</p>
        ) : null}
      </DecisionBand>

      {hasPayee ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-500">Pay to</p>
          {payeeName ? <p className="mt-1 text-sm font-bold text-slate-900">{payeeName}</p> : null}
          <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-slate-700">
            {[payeeBank, payeeAcct].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      ) : null}

      {lineTotal > 0 ? (
        <div className="z-scroll-x overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[320px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="p-2.5">Item</th>
                <th className="p-2.5 text-right">Qty</th>
                <th className="p-2.5 text-right">Price</th>
                <th className="p-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((ln, i) => (
                <tr key={i} className="border-b border-slate-100 text-slate-700">
                  <td className="max-w-0 truncate whitespace-nowrap p-2.5" title={ln.item || '—'}>
                    {ln.item || '—'}
                  </td>
                  <td className="whitespace-nowrap p-2.5 text-right tabular-nums">{Number(ln.unit) || 0}</td>
                  <td className="whitespace-nowrap p-2.5 text-right tabular-nums">
                    {formatNgn(Number(ln.unitPriceNgn ?? ln.unit_price_ngn) || 0)}
                  </td>
                  <td className="whitespace-nowrap p-2.5 text-right font-semibold tabular-nums text-slate-900">
                    {formatNgn(Number(ln.lineTotalNgn ?? ln.line_total_ngn) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lineTotal > 20 ? (
            <p className="px-2.5 py-2 text-xs font-semibold text-slate-500">Showing 20 of {lineTotal} lines.</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {r.attachment_present ? (
          <a
            href={attachmentHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            <Paperclip size={14} />
            {r.attachment_name || 'View attachment'}
          </a>
        ) : (
          <span className="inline-flex items-center rounded-xl border border-dashed border-slate-200 px-3 py-2 text-ui-xs text-slate-400">
            No attachment
          </span>
        )}
        {onPrint ? (
          <button
            type="button"
            onClick={() => void onPrint()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            <Printer size={14} />
            Print record
          </button>
        ) : null}
      </div>

      <DecisionWhatNext title="If you approve">
        Cashier can pay {amount} to the payee. Reject returns the request so the requester can correct it and resubmit.
      </DecisionWhatNext>

      <OfficialRecordBanner
        item={officialRecord}
        light={isLight}
        quoteFallbackId={officialRecordFallbackId}
        showOpenRecord
        openRecordLabel="Edit request"
        onOpenRecord={onOpenRecord}
      />
    </div>
  );
}
