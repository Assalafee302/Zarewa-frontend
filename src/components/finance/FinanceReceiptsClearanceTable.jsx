import React from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { receiptLedgerReceiptTreasurySplits } from '../../lib/salesReceiptsList';
import { receiptClearanceBadgeLabel, receiptRegisteredByLabel } from '../../lib/receiptClearance.js';
import {
  findQuotationByRef,
  quotationColourGaugeLabel,
  receiptDateLabel,
} from '../../lib/quotationColourGauge.js';

const TH =
  'px-1.5 py-1 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap';
const TD = 'px-1.5 py-1 align-middle text-[11px] leading-tight text-slate-800';

/**
 * Pending / confirmed receipts as one compact line per row (no sideways scroll).
 */
export function FinanceReceiptsClearanceTable({
  tone = 'amber',
  title,
  description,
  listWindow,
  onPrev,
  onNext,
  emptyMessage,
  quotations = [],
  liveTreasuryMovements,
  liveLedgerEntries,
  hangingRefundByCustomerId,
  refundFundByQuote,
  canConfirm,
  onConfirm,
  confirmLabel = 'Confirm',
}) {
  const headerCls =
    tone === 'emerald'
      ? 'border-emerald-200/70 bg-emerald-50/65'
      : 'border-amber-200/70 bg-amber-50/65';
  const titleCls = tone === 'emerald' ? 'text-emerald-900' : 'text-amber-900';
  const navCls = tone === 'emerald' ? 'text-emerald-900 border-emerald-200' : 'text-amber-900 border-amber-200';

  return (
    <section className="min-w-0 space-y-1.5">
      <div className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2 py-1 ${headerCls}`}>
        <p className={`min-w-0 truncate text-[11px] font-black uppercase tracking-wide ${titleCls}`} title={description}>
          {title}
        </p>
        <div className={`flex shrink-0 items-center gap-1 text-[10px] ${titleCls}`}>
          <span className="tabular-nums">
            {listWindow.total === 0
              ? '0'
              : `${listWindow.from}–${listWindow.to}/${listWindow.total}`}
          </span>
          <button
            type="button"
            disabled={listWindow.safePage <= 0}
            onClick={onPrev}
            className={`inline-flex items-center rounded border bg-white p-0.5 disabled:opacity-40 ${navCls}`}
            aria-label="Previous page"
          >
            <ChevronLeft size={12} />
          </button>
          <span className="font-bold tabular-nums">
            {listWindow.safePage + 1}/{listWindow.pageCount}
          </span>
          <button
            type="button"
            disabled={listWindow.safePage >= listWindow.pageCount - 1}
            onClick={onNext}
            className={`inline-flex items-center rounded border bg-white p-0.5 disabled:opacity-40 ${navCls}`}
            aria-label="Next page"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
      {listWindow.total === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-2 text-center text-[11px] text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200/90 bg-white">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[26%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className={TH}>Date</th>
                <th className={TH}>Receipt</th>
                <th className={TH}>Customer</th>
                <th className={`${TH} hidden sm:table-cell`}>Colour / gauge</th>
                <th className={`${TH} text-right`}>Amount</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}> </th>
              </tr>
            </thead>
            <tbody>
              {listWindow.slice.map((r) => {
                const allocated = Number(r.amountNgn) || 0;
                const cash =
                  r.cashReceivedNgn != null ? Number(r.cashReceivedNgn) || allocated : allocated;
                const bank =
                  r.bankReceivedAmountNgn != null ? Number(r.bankReceivedAmountNgn) : null;
                const paySplits = receiptLedgerReceiptTreasurySplits(r, liveTreasuryMovements);
                const hanging = hangingRefundByCustomerId?.get(String(r.customerID || '').trim());
                const refundFund = refundFundByQuote?.get(String(r.quotationRef || '').trim());
                const registeredBy = receiptRegisteredByLabel(r, liveLedgerEntries);
                const quote = findQuotationByRef(quotations, r.quotationRef);
                const spec = quotationColourGaugeLabel(quote);
                const date = receiptDateLabel(r);
                const cuttingChipLabel =
                  r._cuttingListLinkKind === 'linked' && r._cuttingListId
                    ? r._cuttingListId
                    : r._cuttingListLabel || 'No CL';
                const clearanceLabel = receiptClearanceBadgeLabel(r);
                const confirmText =
                  typeof confirmLabel === 'function' ? confirmLabel(r) : confirmLabel;
                const statusShort = r.financeReconciliationSavedAtISO
                  ? 'Reconciled'
                  : clearanceLabel === 'Pending clearance'
                    ? 'Pending'
                    : clearanceLabel;
                const amountTitle = [
                  formatNgn(cash),
                  Math.round(allocated) !== Math.round(cash) ? `Quote ${formatNgn(allocated)}` : '',
                  bank != null && Math.round(bank) !== Math.round(cash) ? `Bank ${formatNgn(bank)}` : '',
                  paySplits.length > 0 ? paySplits.map((s) => s.accountLabel).join(', ') : '',
                ]
                  .filter(Boolean)
                  .join(' · ');
                const receiptTitle = [r.id, r.quotationRef, registeredBy, cuttingChipLabel]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-teal-50/30">
                    <td className={`${TD} whitespace-nowrap tabular-nums text-slate-600`} title={date}>
                      {date || '—'}
                    </td>
                    <td className={TD} title={receiptTitle}>
                      <div className="flex min-w-0 items-center gap-1">
                        <span className="min-w-0 truncate font-mono text-[11px] font-semibold text-zarewa-teal">
                          {r.id}
                          {r.quotationRef ? ` · ${r.quotationRef}` : ''}
                        </span>
                        <span
                          className={`shrink-0 truncate max-w-[5.5rem] text-[9px] font-semibold uppercase ${
                            r._cuttingListLinkKind === 'linked'
                              ? 'text-teal-800'
                              : 'text-amber-800'
                          }`}
                          title={r._cuttingListTitle || cuttingChipLabel}
                        >
                          {cuttingChipLabel}
                        </span>
                      </div>
                    </td>
                    <td className={`${TD} truncate`} title={r.customer || ''}>
                      {r.customer || '—'}
                    </td>
                    <td className={`${TD} hidden truncate sm:table-cell`} title={spec || ''}>
                      {spec || '—'}
                    </td>
                    <td className={`${TD} text-right font-semibold tabular-nums whitespace-nowrap`} title={amountTitle}>
                      {formatNgn(cash)}
                    </td>
                    <td className={TD}>
                      <div className="flex min-w-0 items-center gap-1">
                        {hanging ? (
                          <span
                            className="inline-flex shrink-0 items-center gap-0.5 text-[9px] font-bold uppercase text-rose-800"
                            title={hanging.shortLabel || 'Hanging refund'}
                          >
                            <AlertTriangle size={10} className="shrink-0" aria-hidden />
                            {formatNgn(hanging.totalOpenNgn || hanging.overpayCreditNgn || 0)}
                          </span>
                        ) : null}
                        {refundFund ? (
                          <span
                            className="inline-flex shrink-0 items-center gap-0.5 text-[9px] font-bold uppercase text-sky-800"
                            title={`Refund fund ${formatNgn(refundFund.appliedNgn)}`}
                          >
                            <Wallet size={10} className="shrink-0" aria-hidden />
                            {formatNgn(refundFund.appliedNgn)}
                          </span>
                        ) : null}
                        <span
                          className={`min-w-0 truncate text-[9px] font-bold uppercase ${
                            r.financeReconciliationSavedAtISO ? 'text-slate-600' : 'text-amber-900'
                          }`}
                          title={statusShort}
                        >
                          {statusShort}
                        </span>
                      </div>
                    </td>
                    <td className={`${TD} text-right`}>
                      {canConfirm ? (
                        <button
                          type="button"
                          onClick={() => onConfirm(r)}
                          className="rounded bg-zarewa-teal px-1.5 py-0.5 text-[10px] font-bold uppercase text-white hover:bg-[#0f3d3a]"
                        >
                          {confirmText}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
