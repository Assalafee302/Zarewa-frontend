import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { receiptLedgerReceiptTreasurySplits } from '../../lib/salesReceiptsList';
import { SALES_STATUS_CHIP, receiptCuttingListChipClass } from '../../lib/salesStatusUi';
import { receiptClearanceBadgeLabel, receiptRegisteredByLabel } from '../../lib/receiptClearance.js';
import {
  findQuotationByRef,
  quotationColourGaugeLabel,
  receiptDateLabel,
} from '../../lib/quotationColourGauge.js';
import { HangingCustomerRefundChip } from './HangingCustomerRefundHint.jsx';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

/**
 * Pending / confirmed receipts as a uniform AppDataTable.
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
  canConfirm,
  onConfirm,
  confirmLabel = 'Confirm',
}) {
  const headerCls =
    tone === 'emerald'
      ? 'rounded-lg border border-emerald-200/70 bg-emerald-50/65 px-3 py-2'
      : 'rounded-lg border border-amber-200/70 bg-amber-50/65 px-3 py-2';
  const titleCls = tone === 'emerald' ? 'text-emerald-900' : 'text-amber-900';
  const descCls = tone === 'emerald' ? 'text-emerald-800/90' : 'text-amber-800/90';
  const navCls = tone === 'emerald' ? 'text-emerald-900 border-emerald-200' : 'text-amber-900 border-amber-200';

  return (
    <section className="space-y-2 min-w-0">
      <div className={`flex items-center justify-between gap-2 ${headerCls}`}>
        <div>
          <p className={`text-ui-xs font-black uppercase tracking-wide ${titleCls}`}>{title}</p>
          <p className={`text-ui-xs ${descCls}`}>{description}</p>
        </div>
        <div className={`flex flex-wrap items-center gap-2 text-ui-xs ${titleCls}`}>
          <span className="tabular-nums">
            {listWindow.total === 0
              ? '0 receipts'
              : `Showing ${listWindow.from}–${listWindow.to} of ${listWindow.total}`}
          </span>
          <button
            type="button"
            disabled={listWindow.safePage <= 0}
            onClick={onPrev}
            className={`inline-flex items-center rounded-lg border bg-white px-2 py-1 disabled:opacity-40 ${navCls}`}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-ui-xs font-bold tabular-nums">
            {listWindow.safePage + 1}/{listWindow.pageCount}
          </span>
          <button
            type="button"
            disabled={listWindow.safePage >= listWindow.pageCount - 1}
            onClick={onNext}
            className={`inline-flex items-center rounded-lg border bg-white px-2 py-1 disabled:opacity-40 ${navCls}`}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      {listWindow.total === 0 ? (
        <p className="text-ui-xs text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
          {emptyMessage}
        </p>
      ) : (
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Date</AppTableTh>
              <AppTableTh>Receipt</AppTableTh>
              <AppTableTh>Customer</AppTableTh>
              <AppTableTh>Colour / gauge</AppTableTh>
              <AppTableTh align="right">Amount</AppTableTh>
              <AppTableTh>Status</AppTableTh>
              <AppTableTh align="right"> </AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {listWindow.slice.map((r) => {
                const allocated = Number(r.amountNgn) || 0;
                const cash =
                  r.cashReceivedNgn != null ? Number(r.cashReceivedNgn) || allocated : allocated;
                const bank =
                  r.bankReceivedAmountNgn != null ? Number(r.bankReceivedAmountNgn) : null;
                const cleared = Boolean(r.financeDeliveryClearedAtISO);
                const paySplits = receiptLedgerReceiptTreasurySplits(r, liveTreasuryMovements);
                const hanging = hangingRefundByCustomerId?.get(String(r.customerID || '').trim());
                const registeredBy = receiptRegisteredByLabel(r, liveLedgerEntries);
                const quote = findQuotationByRef(quotations, r.quotationRef);
                const spec = quotationColourGaugeLabel(quote);
                const date = receiptDateLabel(r);
                const cuttingChipLabel =
                  r._cuttingListLinkKind === 'linked' && r._cuttingListId
                    ? `CL ${r._cuttingListId}`
                    : r._cuttingListLabel || 'No cutting list';
                const clearanceLabel = receiptClearanceBadgeLabel(r);
                const confirmText =
                  typeof confirmLabel === 'function' ? confirmLabel(r) : confirmLabel;
                return (
                  <AppTableTr key={r.id}>
                    <AppTableTd>{date || '—'}</AppTableTd>
                    <AppTableTd truncate={false}>
                      <div className="min-w-0">
                        <p className="font-mono text-[13px] font-semibold text-zarewa-teal">{r.id}</p>
                        <p className="text-ui-xs text-slate-500 truncate" title={r.quotationRef || ''}>
                          {r.quotationRef || '—'}
                          {registeredBy ? ` · ${registeredBy}` : ''}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span
                            className={`${SALES_STATUS_CHIP} ${receiptCuttingListChipClass(r._cuttingListLinkKind)} whitespace-nowrap`}
                            title={r._cuttingListTitle || cuttingChipLabel}
                          >
                            {cuttingChipLabel}
                          </span>
                          {hanging ? <HangingCustomerRefundChip indicator={hanging} /> : null}
                        </div>
                      </div>
                    </AppTableTd>
                    <AppTableTd title={r.customer || ''}>{r.customer || '—'}</AppTableTd>
                    <AppTableTd title={spec}>{spec || '—'}</AppTableTd>
                    <AppTableTd align="right" truncate={false}>
                      <span className="font-semibold">{formatNgn(cash)}</span>
                      {Math.round(allocated) !== Math.round(cash) ? (
                        <span className="block text-ui-xs text-slate-500">Quote {formatNgn(allocated)}</span>
                      ) : null}
                      {bank != null && Math.round(bank) !== Math.round(cash) ? (
                        <span className="block text-ui-xs text-amber-800">Bank {formatNgn(bank)}</span>
                      ) : null}
                      {paySplits.length > 0 ? (
                        <span className="block text-ui-xs text-slate-500">
                          {paySplits.map((s) => s.accountLabel).join(', ')}
                        </span>
                      ) : null}
                    </AppTableTd>
                    <AppTableTd truncate={false}>
                      {r.financeReconciliationSavedAtISO ? (
                        <span className="text-ui-xs font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                          Reconciled
                        </span>
                      ) : (
                        <span
                          className={`text-ui-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                            clearanceLabel === 'Pending clearance' || !cleared
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {tone === 'emerald' && cleared ? 'Cleared' : clearanceLabel}
                        </span>
                      )}
                    </AppTableTd>
                    <AppTableTd align="right" truncate={false}>
                      {canConfirm ? (
                        <button
                          type="button"
                          onClick={() => onConfirm(r)}
                          className="text-ui-xs font-bold uppercase px-2 py-1 rounded-md bg-zarewa-teal text-white hover:bg-[#0f3d3a]"
                        >
                          {confirmText}
                        </button>
                      ) : null}
                    </AppTableTd>
                  </AppTableTr>
                );
              })}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}
    </section>
  );
}
