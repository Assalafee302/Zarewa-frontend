import React, { useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatNgn } from '../../Data/mockData';
import { refundsOnFinanceRefundQueue } from '../../lib/refundsStore';
import { flattenRefundDeskQueue, actorMayOverrideRefundUnclearedPayoutHold } from '../../lib/refundCashierDetail';
import { registerSettlementsAwaitingPayment } from '../../lib/registerSettlementPay';
import { effectiveOutstandingNgn } from '../../lib/paymentOutstandingTolerance.js';
import { paymentRequestPayoutMetaLine } from '../../lib/financeTreasuryPayoutQueueMeta';
import { TREASURY_STATEMENT_TYPE_LABEL } from '../../lib/accountCore';
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

/**
 * Cashier Payouts: what still needs paying vs what already left treasury.
 */
export function FinanceCashierPayoutsPanel() {
  const {
    handleDeskPayRequest,
    handleDeskPayRefund,
    handleDeskViewRefund,
    handleDeskViewPaymentRequest,
    handleDeskPayRegisterSettlement,
    handleDeskPayPoTransport,
    canPayRequests,
    paymentsListWindow,
    setPaymentsTablePage,
    togglePaymentsSort,
    paymentsTableSortKey,
    paymentsTableSortDir,
    disbursementsSearch,
    setDisbursementsSearch,
    ws,
  } = useAccountPage();
  const workspace = useWorkspace();
  const snap = workspace?.snapshot || ws?.snapshot || {};
  const [view, setView] = useState('due');
  const overrideUnclearedHold = actorMayOverrideRefundUnclearedPayoutHold(
    workspace?.session?.user || ws?.session?.user,
    workspace?.hasPermission || ws?.hasPermission
  );

  const dueRows = useMemo(() => {
    const rows = [];
    for (const pr of Array.isArray(snap.paymentRequests) ? snap.paymentRequests : []) {
      if (String(pr.approvalStatus || '').trim() !== 'Approved') continue;
      const req = Math.round(Number(pr.amountRequestedNgn) || 0);
      const paid = Math.round(Number(pr.paidAmountNgn) || 0);
      const due = effectiveOutstandingNgn(req, paid);
      if (due <= 0) continue;
      rows.push({
        id: String(pr.requestID || pr.id || ''),
        kind: 'Expense request',
        party: pr.payeeName || pr.requestedByName || pr.category || '—',
        ref: paymentRequestPayoutMetaLine(pr) || String(pr.requestID || pr.id || ''),
        date: String(pr.approvedAtISO || pr.requestDate || '').slice(0, 10),
        amount: due,
        pay: () => handleDeskPayRequest(String(pr.requestID || pr.id || '')),
        view: () => handleDeskViewPaymentRequest?.(String(pr.requestID || pr.id || '')),
      });
    }
    for (const line of flattenRefundDeskQueue(refundsOnFinanceRefundQueue(snap.refunds || []), {
      overrideUnclearedHold,
    })) {
      const r = line.parentRefund || {};
      const due = Math.round(Number(line.amountDueNgn) || 0);
      const canPay =
        due > 0 || line.payoutStatus === 'admin_override_uncleared';
      rows.push({
        id: `${line.refundID}-${line.queueKey}`,
        kind:
          canPay
            ? 'Customer refund'
            : line.payoutStatusLabel || 'Refund pending',
        party: line.recipientLabel || r.customerName || r.customerID || '—',
        ref: line.refundID,
        date: String(r.approvedAtISO || r.approvalDate || r.dateISO || '').slice(0, 10),
        amount: due > 0 ? due : Math.round(Number(line.netPayoutNgn) || 0),
        pay: canPay ? () => handleDeskPayRefund(String(line.refundID || ''), line.queueKey) : null,
        view: () => handleDeskViewRefund?.(String(line.refundID || '')),
      });
    }
    for (const s of registerSettlementsAwaitingPayment(snap.registerSettlementsAwaitingPayment || [])) {
      const due = Math.max(0, Number(s.outstandingNgn) || 0);
      if (due <= 0) continue;
      rows.push({
        id: String(s.settlementId || s.id || ''),
        kind: 'Register withdrawal',
        party: s.payeeName || s.registerName || '—',
        date: String(s.approvedAtISO || s.dateISO || '').slice(0, 10),
        amount: due,
        pay: () => handleDeskPayRegisterSettlement(String(s.settlementId || '')),
      });
    }
    for (const row of Array.isArray(snap.poTransportAwaitingTreasury) ? snap.poTransportAwaitingTreasury : []) {
      const due = Math.max(0, Number(row.outstandingNgn) || 0);
      if (due <= 0) continue;
      rows.push({
        id: String(row.poId || row.id || ''),
        kind: 'PO haulage',
        party: row.transporterName || row.supplierName || '—',
        date: String(row.approvedAtISO || row.dateISO || '').slice(0, 10),
        amount: due,
        pay: () => handleDeskPayPoTransport(String(row.poId || row.id || '')),
      });
    }
    return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [
    snap.paymentRequests,
    snap.refunds,
    snap.registerSettlementsAwaitingPayment,
    snap.poTransportAwaitingTreasury,
    handleDeskPayRequest,
    handleDeskPayRefund,
    handleDeskViewRefund,
    handleDeskViewPaymentRequest,
    handleDeskPayRegisterSettlement,
    handleDeskPayPoTransport,
    overrideUnclearedHold,
  ]);

  const paidSlice = paymentsListWindow?.slice || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[
          ['due', `To pay (${dueRows.length})`],
          ['paid', `Paid (${paymentsListWindow?.total || 0})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
              view === id ? 'bg-zarewa-teal text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'due' ? (
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Date</AppTableTh>
              <AppTableTh>Type</AppTableTh>
              <AppTableTh>Payee</AppTableTh>
              <AppTableTh>Ref</AppTableTh>
              <AppTableTh align="right">Due</AppTableTh>
              <AppTableTh align="right"> </AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {dueRows.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={6} truncate={false} className="text-center text-slate-500">
                    Nothing waiting to be paid.
                  </AppTableTd>
                </AppTableTr>
              ) : (
                dueRows.map((row) => (
                  <AppTableTr key={`${row.kind}-${row.id}`}>
                    <AppTableTd>{row.date || '—'}</AppTableTd>
                    <AppTableTd>{row.kind}</AppTableTd>
                    <AppTableTd title={row.party}>{row.party}</AppTableTd>
                    <AppTableTd monospace title={row.ref || row.id}>
                      {row.ref || row.id || '—'}
                    </AppTableTd>
                    <AppTableTd align="right">{formatNgn(row.amount)}</AppTableTd>
                    <AppTableTd align="right" truncate={false}>
                      <div className="inline-flex items-center justify-end gap-1">
                        {row.view ? (
                          <button
                            type="button"
                            onClick={row.view}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>
                        ) : null}
                        {canPayRequests && row.pay ? (
                          <button
                            type="button"
                            onClick={row.pay}
                            className="rounded-md bg-zarewa-teal px-2 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                          >
                            Pay
                          </button>
                        ) : !row.view && !row.pay ? (
                          <span className="text-[11px] text-slate-400">View only</span>
                        ) : null}
                      </div>
                    </AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : (
        <div className="space-y-2">
          <div className="relative max-w-sm">
            <input
              type="search"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-2 text-sm outline-none focus:ring-2 focus:ring-zarewa-teal/15"
              placeholder="Search paid lines…"
              value={disbursementsSearch}
              onChange={(e) => setDisbursementsSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          <AppTableWrap>
            <AppTable role="numeric">
              <AppTableThead>
                <AppTableTh>
                  <button type="button" onClick={() => togglePaymentsSort('date')} className="hover:text-zarewa-teal">
                    Date
                    {paymentsTableSortKey === 'date' ? (paymentsTableSortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                </AppTableTh>
                <AppTableTh>Type</AppTableTh>
                <AppTableTh>Description</AppTableTh>
                <AppTableTh>Account</AppTableTh>
                <AppTableTh align="right">Amount</AppTableTh>
                <AppTableTh align="right"> </AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {paidSlice.length === 0 ? (
                  <AppTableTr>
                    <AppTableTd colSpan={6} truncate={false} className="text-center text-slate-500">
                      No paid lines in this view.
                    </AppTableTd>
                  </AppTableTr>
                ) : (
                  paidSlice.map((row, idx) => {
                    const canViewExpense =
                      row.sourceKind === 'PAYMENT_REQUEST' || row.sourceKind === 'EXPENSE';
                    return (
                    <AppTableTr key={row.movementId || `paid-${idx}`}>
                      <AppTableTd>{String(row.postedAtISO || '').slice(0, 10) || '—'}</AppTableTd>
                      <AppTableTd>{TREASURY_STATEMENT_TYPE_LABEL[row.type] || row.type}</AppTableTd>
                      <AppTableTd title={row.description}>{row.description || '—'}</AppTableTd>
                      <AppTableTd title={row.accountName}>{row.accountName || '—'}</AppTableTd>
                      <AppTableTd align="right">{formatNgn(row.amountAbs)}</AppTableTd>
                      <AppTableTd align="right" truncate={false}>
                        {canViewExpense ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeskViewPaymentRequest?.(
                                row.sourceKind === 'PAYMENT_REQUEST' ? row.sourceId : '',
                                { expenseId: row.sourceKind === 'EXPENSE' ? row.sourceId : '' }
                              )
                            }
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </AppTableTd>
                    </AppTableTr>
                    );
                  })
                )}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
          {paymentsListWindow?.pageCount > 1 ? (
            <div className="flex items-center justify-end gap-2 text-xs text-slate-600">
              <span className="tabular-nums">
                {paymentsListWindow.from}–{paymentsListWindow.to} of {paymentsListWindow.total}
              </span>
              <button
                type="button"
                disabled={paymentsListWindow.safePage <= 0}
                onClick={() => setPaymentsTablePage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={paymentsListWindow.safePage >= paymentsListWindow.pageCount - 1}
                onClick={() => setPaymentsTablePage((p) => p + 1)}
                className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
