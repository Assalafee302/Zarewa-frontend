import React, { useMemo, useState } from 'react';
import { formatNgn } from '../../Data/mockData';
import {
  PARTIAL_QUOTE_DESK_MIN_BALANCE_NGN,
  quotationsStillToBalanceRows,
} from '../../lib/quotationPaymentSummary.js';
import { quotationColourGaugeLabel } from '../../lib/quotationColourGauge.js';
import { useFinanceDepositQuoteMatches } from '../../hooks/useFinanceDepositQuoteMatches.js';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';
import { useAccountPage } from '../../pages/account/AccountPageContext.jsx';
import { FinancePartialQuoteDetailModal } from './FinancePartialQuoteDetailModal.jsx';

/**
 * Quotations with a remaining balance so cashiers can see who still needs to pay.
 */
export function FinancePartialQuotesPanel() {
  const { liveQuotations, liveReceipts, liveLedgerEntries, openReceiptFinance } = useAccountPage();
  const { byQuote, busyKey, runMatch, canApply, canConfirmPending } = useFinanceDepositQuoteMatches();
  const [detailRow, setDetailRow] = useState(null);
  const payOpts = useMemo(
    () => ({
      salesReceipts: liveReceipts,
      ledgerEntries: liveLedgerEntries,
      minBalanceNgn: PARTIAL_QUOTE_DESK_MIN_BALANCE_NGN,
    }),
    [liveReceipts, liveLedgerEntries]
  );

  const rows = useMemo(
    () =>
      quotationsStillToBalanceRows(liveQuotations, payOpts).map((row) => ({
        ...row,
        spec: quotationColourGaugeLabel(row.quotation) || '—',
      })),
    [liveQuotations, payOpts]
  );

  if (rows.length === 0 && !detailRow) return null;

  return (
    <section className="space-y-2" data-testid="finance-partial-quotes">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-900">
          Quotations still to balance
        </h3>
        <p className="text-ui-xs text-slate-600 mt-0.5">
          Remaining balances over ₦999. Click a row for receipts and ledger on that quotation. When a
          registered bank payment amount fits, a confirm action is offered.
        </p>
      </div>
      <AppTableWrap>
        <AppTable role="numeric">
          <AppTableThead>
            <AppTableTh>Date</AppTableTh>
            <AppTableTh>Quote</AppTableTh>
            <AppTableTh>Customer</AppTableTh>
            <AppTableTh>Colour / gauge</AppTableTh>
            <AppTableTh align="right">Paid</AppTableTh>
            <AppTableTh align="right">Total</AppTableTh>
            <AppTableTh align="right">Balance</AppTableTh>
            <AppTableTh>Bank match</AppTableTh>
          </AppTableThead>
          <AppTableBody>
            {rows.map((row) => {
              const match = byQuote.get(row.id);
              const canAct = match
                ? match.action === 'confirm_receipt'
                  ? canConfirmPending
                  : canApply
                : false;
              return (
                <AppTableTr
                  key={row.id}
                  onClick={() => setDetailRow(row)}
                  title="Open quotation transaction details"
                >
                  <AppTableTd>{row.date || '—'}</AppTableTd>
                  <AppTableTd monospace title={row.id}>
                    {row.id}
                  </AppTableTd>
                  <AppTableTd title={row.customer}>{row.customer}</AppTableTd>
                  <AppTableTd title={row.spec}>{row.spec}</AppTableTd>
                  <AppTableTd align="right">{formatNgn(row.paid)}</AppTableTd>
                  <AppTableTd align="right">{formatNgn(row.total)}</AppTableTd>
                  <AppTableTd align="right" className="font-semibold text-amber-900">
                    {formatNgn(row.balance)}
                  </AppTableTd>
                  <AppTableTd truncate={false}>
                    {match ? (
                      canAct ? (
                        <button
                          type="button"
                          disabled={busyKey === match.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            void runMatch(match);
                          }}
                          className="rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-ui-xs font-bold uppercase text-teal-900 hover:bg-teal-100 disabled:opacity-50"
                          title={`${match.depositId} remaining ${formatNgn(match.depositRemainingNgn)}`}
                        >
                          {busyKey === match.key
                            ? 'Posting…'
                            : match.action === 'confirm_receipt'
                              ? `Confirm ${match.pendingReceipt?.id || 'receipt'}`
                              : `Fits ${match.depositId}`}
                        </button>
                      ) : (
                        <span className="text-ui-xs font-semibold text-teal-800" title={match.depositId}>
                          Fits {match.depositId}
                        </span>
                      )
                    ) : (
                      <span className="text-ui-xs text-slate-400">—</span>
                    )}
                  </AppTableTd>
                </AppTableTr>
              );
            })}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>

      <FinancePartialQuoteDetailModal
        row={detailRow}
        isOpen={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        receipts={liveReceipts}
        ledgerEntries={liveLedgerEntries}
        onOpenReceipt={(receipt) => {
          setDetailRow(null);
          openReceiptFinance?.(receipt);
        }}
      />
    </section>
  );
}
