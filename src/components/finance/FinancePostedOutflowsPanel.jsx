/**
 * Finance → Payment register: posted outflows, open requests, expense cards, archive.
 * Same chrome as creditors/debtors (header + section nav + table).
 */
import React, { useMemo, useState } from 'react';
import { Pencil, RotateCcw, Trash2, Upload } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { effectiveOutstandingNgn } from '../../lib/paymentOutstandingTolerance.js';
import {
  formatPayoutQueueDate,
  paymentRequestOutstandingNgn,
  paymentRequestPayoutMetaLine,
} from '../../lib/financeTreasuryPayoutQueueMeta';
import { useAppTablePaging } from '../../lib/appDataTable';
import {
  isPayFromCorrectionTreasuryRow,
  treasuryMovementSourceBadge,
  treasuryOutflowLinesForExpense,
  treasuryOutflowLinesForPaymentRequest,
} from '../../lib/accountCore';
import { ZareApprovalHint } from '../ZareApprovalHint';
import { EditSecondApprovalInline } from '../EditSecondApprovalInline';
import { ExpenseCategoryLaneBadge } from '../office/ExpenseCategoryLaneBadge.jsx';
import { ExpenseCategoryExceptionBanner } from '../office/ExpenseCategoryExceptionBanner.jsx';
import {
  AppTable,
  AppTableBody,
  AppTablePager,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';
import { SalesListSearchInput } from '../sales/SalesListTableFrame';
import { AccountingDeskNotice } from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader, AccountingSectionNav } from './accounting/AccountingRegisterLayout';
import { useAccountPage } from '../../pages/account/AccountPageContext.jsx';

const LIST_PAGE = 15;

function QuietAction({ tone = 'slate', children, className = '', ...props }) {
  const tones = {
    slate: 'text-slate-700 bg-slate-100 hover:bg-slate-200',
    teal: 'text-zarewa-teal bg-teal-50 hover:bg-teal-100',
    amber: 'text-amber-950 bg-amber-50 hover:bg-amber-100',
    rose: 'text-rose-800 bg-rose-50 hover:bg-rose-100',
    sky: 'text-sky-900 bg-sky-50 hover:bg-sky-100',
    violet: 'text-violet-900 bg-violet-50 hover:bg-violet-100',
  };
  return (
    <button
      type="button"
      className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors disabled:opacity-50 ${tones[tone] || tones.slate} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function SortLabel({ label, active, dir, onClick, align = 'left' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-0.5 hover:text-zarewa-teal ${align === 'right' ? 'ml-auto' : ''}`}
    >
      {label}
      {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  );
}

function partyName(entity) {
  return String(
    entity?.payeeName ||
      entity?.payee_name ||
      entity?.staffDisplayName ||
      entity?.customerName ||
      entity?.customer ||
      ''
  ).trim();
}

function postedParty(row, pr, ex, rf) {
  return String(row?.counterpartyName || '').trim() || partyName(pr) || partyName(ex) || partyName(rf);
}

function dateCell(value) {
  return formatPayoutQueueDate(value) || '—';
}

function StatusChip({ status }) {
  const s = String(status || '').trim();
  const lower = s.toLowerCase();
  const cls =
    lower === 'approved'
      ? 'bg-teal-50 text-zarewa-teal'
      : lower === 'rejected' || lower === 'cancelled' || lower === 'refused'
        ? 'bg-rose-50 text-rose-800'
        : lower === 'paid'
          ? 'bg-slate-100 text-slate-700'
          : 'bg-amber-50 text-amber-950';
  return (
    <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-ui-xs font-semibold ${cls}`}>{s || '—'}</span>
  );
}

function PostedRowActions({ row }) {
  const {
    payRequestById,
    expenseById,
    refundById,
    prPayoutPrimaryMovementId,
    refundPayoutPrimaryMovementId,
    canFinanceReceiptSettlement,
    canReversePaymentRequestTreasury,
    canDeleteRolloutExpenseOrRequest,
    ws,
    openPayFromEditForTableRow,
    reversePaymentRequestTreasuryPayout,
    reverseRefundTreasuryPayout,
    reversingTreasuryPayoutId,
    reversingRefundTreasuryPayoutId,
    deleteRolloutExpense,
    deleteRolloutPaymentRequest,
    deletingExpenseId,
    deletingPayRequestId,
    handleDeskViewPaymentRequest,
  } = useAccountPage();

  const pr = row.sourceKind === 'PAYMENT_REQUEST' ? payRequestById[row.sourceId] : null;
  const ex = row.sourceKind === 'EXPENSE' ? expenseById[row.sourceId] : null;
  const rf = row.sourceKind === 'REFUND' ? refundById[row.sourceId] : null;
  const paidPr = pr ? Number(pr.paidAmountNgn) || 0 : 0;
  const paidRf = rf ? Number(rf.paidAmountNgn) || 0 : 0;
  const isPrPrimary =
    row.type === 'PAYMENT_REQUEST_OUT' &&
    row.sourceKind === 'PAYMENT_REQUEST' &&
    prPayoutPrimaryMovementId.get(row.sourceId) === row.movementId;
  const isRefundPrimary =
    row.type === 'REFUND_PAYOUT' &&
    row.sourceKind === 'REFUND' &&
    refundPayoutPrimaryMovementId.get(row.sourceId) === row.movementId;
  const showPayFrom = canFinanceReceiptSettlement && ws?.canMutate && isPayFromCorrectionTreasuryRow(row);
  const showReverse =
    canReversePaymentRequestTreasury &&
    ws?.canMutate &&
    ((row.type === 'PAYMENT_REQUEST_OUT' && pr && paidPr > 0 && isPrPrimary) ||
      (row.type === 'REFUND_PAYOUT' && rf && paidRf > 0 && isRefundPrimary));
  const showDeleteExpenseRow =
    canDeleteRolloutExpenseOrRequest &&
    ws?.canMutate &&
    row.type === 'EXPENSE' &&
    row.sourceKind === 'EXPENSE' &&
    ex;
  const showDeletePrRow =
    canDeleteRolloutExpenseOrRequest &&
    ws?.canMutate &&
    row.type === 'PAYMENT_REQUEST_OUT' &&
    pr &&
    paidPr <= 0 &&
    isPrPrimary;
  const canView = row.sourceKind === 'PAYMENT_REQUEST' || row.sourceKind === 'EXPENSE';

  if (!canView && !showPayFrom && !showReverse && !showDeleteExpenseRow && !showDeletePrRow) return null;

  return (
    <div className="inline-flex flex-wrap justify-end gap-1">
      {canView ? (
        <QuietAction
          onClick={() =>
            handleDeskViewPaymentRequest?.(
              row.sourceKind === 'PAYMENT_REQUEST' ? row.sourceId : '',
              { expenseId: row.sourceKind === 'EXPENSE' ? row.sourceId : '' }
            )
          }
        >
          View
        </QuietAction>
      ) : null}
      {showPayFrom ? (
        <QuietAction tone="teal" onClick={() => openPayFromEditForTableRow(row)}>
          Pay-from
        </QuietAction>
      ) : null}
      {showReverse ? (
        <QuietAction
          tone="amber"
          disabled={
            row.type === 'REFUND_PAYOUT'
              ? reversingRefundTreasuryPayoutId === row.sourceId
              : reversingTreasuryPayoutId === row.sourceId
          }
          onClick={() =>
            row.type === 'REFUND_PAYOUT'
              ? void reverseRefundTreasuryPayout(row.sourceId)
              : void reversePaymentRequestTreasuryPayout(row.sourceId)
          }
        >
          Reverse
        </QuietAction>
      ) : null}
      {showDeleteExpenseRow ? (
        <QuietAction
          tone="rose"
          disabled={deletingExpenseId === row.sourceId}
          onClick={() => void deleteRolloutExpense(row.sourceId)}
        >
          Delete
        </QuietAction>
      ) : null}
      {showDeletePrRow ? (
        <QuietAction
          tone="rose"
          disabled={deletingPayRequestId === row.sourceId}
          onClick={() => void deleteRolloutPaymentRequest(row.sourceId)}
        >
          Delete
        </QuietAction>
      ) : null}
    </div>
  );
}

function RequestRowActions({ req }) {
  const {
    liveTreasuryMovements,
    canApprovePaymentRequests,
    canPayRequests,
    canPostExpenseReclass,
    canFinanceReceiptSettlement,
    canReversePaymentRequestTreasury,
    canDeleteRolloutExpenseOrRequest,
    ws,
    handleDeskViewPaymentRequest,
    openRequestPayment,
    cancelPaymentRequestBeforePay,
    cancelPayRequestBusyId,
    openReclassifyPaymentRequest,
    openPaymentRequestOutflowEdit,
    reversePaymentRequestTreasuryPayout,
    reversingTreasuryPayoutId,
    deleteRolloutPaymentRequest,
    deletingPayRequestId,
  } = useAccountPage();

  const paid = Number(req.paidAmountNgn) || 0;
  const prTreasuryOut = treasuryOutflowLinesForPaymentRequest(req.requestID, liveTreasuryMovements);

  return (
    <div className="inline-flex flex-wrap justify-end gap-1">
      <QuietAction onClick={() => handleDeskViewPaymentRequest(req.requestID)}>View</QuietAction>
      {req.approvalStatus === 'Approved' &&
      effectiveOutstandingNgn(Number(req.amountRequestedNgn) || 0, paid) > 0 &&
      canPayRequests &&
      ws?.canMutate ? (
        <QuietAction tone="sky" onClick={() => openRequestPayment(req)}>
          Pay
        </QuietAction>
      ) : null}
      {req.approvalStatus === 'Approved' && paid <= 0 && canPayRequests && ws?.canMutate ? (
        <QuietAction
          tone="rose"
          disabled={cancelPayRequestBusyId === req.requestID}
          onClick={() => void cancelPaymentRequestBeforePay(req)}
        >
          Refuse
        </QuietAction>
      ) : null}
      {req.approvalStatus === 'Approved' && paid <= 0 && canApprovePaymentRequests && ws?.canMutate ? (
        <QuietAction tone="violet" onClick={() => openReclassifyPaymentRequest(req)}>
          Reclassify
        </QuietAction>
      ) : null}
      {paid > 0 && canPostExpenseReclass && ws?.canMutate ? (
        <QuietAction tone="violet" onClick={() => openReclassifyPaymentRequest(req)}>
          Reclass
        </QuietAction>
      ) : null}
      {canFinanceReceiptSettlement && ws?.canMutate && prTreasuryOut.length > 0 ? (
        <QuietAction tone="teal" onClick={() => openPaymentRequestOutflowEdit(req)}>
          <Pencil size={11} aria-hidden />
          Pay-from
        </QuietAction>
      ) : null}
      {canReversePaymentRequestTreasury && ws?.canMutate && paid > 0 ? (
        <QuietAction
          tone="amber"
          disabled={reversingTreasuryPayoutId === req.requestID}
          onClick={() => void reversePaymentRequestTreasuryPayout(req.requestID)}
        >
          <RotateCcw size={11} aria-hidden />
          Reverse
        </QuietAction>
      ) : null}
      {canDeleteRolloutExpenseOrRequest && paid <= 0 ? (
        <QuietAction
          tone="rose"
          disabled={deletingPayRequestId === req.requestID}
          onClick={() => void deleteRolloutPaymentRequest(req.requestID)}
        >
          <Trash2 size={11} aria-hidden />
          Delete
        </QuietAction>
      ) : null}
    </div>
  );
}

function PostedOutflowsTable() {
  const {
    paymentsListWindow,
    PAYMENTS_PAGE_SIZE,
    setPaymentsTablePage,
    togglePaymentsSort,
    paymentsTableSortKey,
    paymentsTableSortDir,
    payRequestById,
    expenseById,
    refundById,
  } = useAccountPage();

  const slice = paymentsListWindow?.slice || [];

  return (
    <div className="space-y-3">
      <ul className="space-y-2 lg:hidden">
        {slice.length === 0 ? (
          <li className="rounded-md border border-dashed border-[var(--z-border)] bg-[var(--z-surface-muted)]/40 px-4 py-8 text-center text-sm text-[var(--z-text-muted)]">
            No posted outflows in this view. Pay approved items from Desk.
          </li>
        ) : (
          slice.map((row, idx) => {
            const pr = row.sourceKind === 'PAYMENT_REQUEST' ? payRequestById[row.sourceId] : null;
            const ex = row.sourceKind === 'EXPENSE' ? expenseById[row.sourceId] : null;
            const rf = row.sourceKind === 'REFUND' ? refundById[row.sourceId] : null;
            const badge = treasuryMovementSourceBadge(row);
            const payee = postedParty(row, pr, ex, rf);
            return (
              <li
                key={row.movementId || `m-${idx}`}
                className="rounded-md border border-[var(--z-border)] bg-white px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--z-text)] line-clamp-2">{row.description}</p>
                    <p className="mt-0.5 text-xs text-[var(--z-text-muted)]">
                      {dateCell(row.postedAtISO)}
                      {payee ? ` · ${payee}` : ''}
                      {row.accountName ? ` · ${row.accountName}` : ''}
                    </p>
                    <span className={`mt-1 inline-flex rounded-sm px-1.5 py-0.5 text-ui-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="z-stencil shrink-0 text-sm text-zarewa-teal">{formatNgn(row.amountAbs)}</p>
                </div>
                <div className="mt-2">
                  <PostedRowActions row={row} />
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="hidden lg:block">
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>
                <SortLabel
                  label="Date"
                  active={paymentsTableSortKey === 'date'}
                  dir={paymentsTableSortDir}
                  onClick={() => togglePaymentsSort('date')}
                />
              </AppTableTh>
              <AppTableTh>
                <SortLabel
                  label="Type"
                  active={paymentsTableSortKey === 'type'}
                  dir={paymentsTableSortDir}
                  onClick={() => togglePaymentsSort('type')}
                />
              </AppTableTh>
              <AppTableTh>Payee</AppTableTh>
              <AppTableTh>
                <SortLabel
                  label="Description"
                  active={paymentsTableSortKey === 'description'}
                  dir={paymentsTableSortDir}
                  onClick={() => togglePaymentsSort('description')}
                />
              </AppTableTh>
              <AppTableTh>
                <SortLabel
                  label="Paid from"
                  active={paymentsTableSortKey === 'account'}
                  dir={paymentsTableSortDir}
                  onClick={() => togglePaymentsSort('account')}
                />
              </AppTableTh>
              <AppTableTh align="right">
                <SortLabel
                  label="Amount"
                  active={paymentsTableSortKey === 'amount'}
                  dir={paymentsTableSortDir}
                  onClick={() => togglePaymentsSort('amount')}
                  align="right"
                />
              </AppTableTh>
              <AppTableTh>
                <SortLabel
                  label="Source"
                  active={paymentsTableSortKey === 'source'}
                  dir={paymentsTableSortDir}
                  onClick={() => togglePaymentsSort('source')}
                />
              </AppTableTh>
              <AppTableTh align="right"> </AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {slice.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={8} truncate={false} className="py-10 text-center text-[var(--z-text-muted)]">
                    No posted outflows in this view. Pay approved items from Desk.
                  </AppTableTd>
                </AppTableTr>
              ) : (
                slice.map((row, idx) => {
                  const pr = row.sourceKind === 'PAYMENT_REQUEST' ? payRequestById[row.sourceId] : null;
                  const ex = row.sourceKind === 'EXPENSE' ? expenseById[row.sourceId] : null;
                  const rf = row.sourceKind === 'REFUND' ? refundById[row.sourceId] : null;
                  const badge = treasuryMovementSourceBadge(row);
                  const payee = postedParty(row, pr, ex, rf);
                  return (
                    <AppTableTr key={row.movementId || `${idx}`}>
                      <AppTableTd>{dateCell(row.postedAtISO)}</AppTableTd>
                      <AppTableTd>
                        <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-ui-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </AppTableTd>
                      <AppTableTd title={payee}>{payee || '—'}</AppTableTd>
                      <AppTableTd title={row.description}>{row.description || '—'}</AppTableTd>
                      <AppTableTd title={row.accountName}>{row.accountName || '—'}</AppTableTd>
                      <AppTableTd align="right" className="font-semibold text-zarewa-teal">
                        {formatNgn(row.amountAbs)}
                      </AppTableTd>
                      <AppTableTd monospace title={row.sourceId}>
                        {row.sourceId || '—'}
                      </AppTableTd>
                      <AppTableTd align="right" truncate={false}>
                        <PostedRowActions row={row} />
                      </AppTableTd>
                    </AppTableTr>
                  );
                })
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      </div>

      <AppTablePager
        showingFrom={paymentsListWindow.from}
        showingTo={paymentsListWindow.to}
        total={paymentsListWindow.total}
        hasPrev={paymentsListWindow.safePage > 0}
        hasNext={paymentsListWindow.safePage < paymentsListWindow.pageCount - 1}
        onPrev={() => setPaymentsTablePage((p) => Math.max(0, p - 1))}
        onNext={() => setPaymentsTablePage((p) => p + 1)}
        pageSize={PAYMENTS_PAGE_SIZE}
      />
    </div>
  );
}

function RequestPipelineList() {
  const {
    disbursementsVisiblePayRequests,
    disbursementsPayRequestQueue,
    disbursementsExceptionPayRequests,
    disbursementsActivePayRequests,
    disbursementsSearch,
    setDisbursementsPayRequestQueue,
    exceptionReportSummary,
    exportExceptionsCsv,
    branchNameById,
    canApprovePaymentRequests,
    ws,
  } = useAccountPage();

  const paging = useAppTablePaging(
    disbursementsVisiblePayRequests || [],
    LIST_PAGE,
    disbursementsPayRequestQueue,
    disbursementsSearch
  );

  return (
    <div className="space-y-3">
      <ExpenseCategoryExceptionBanner
        summary={exceptionReportSummary}
        formatNgn={formatNgn}
        activeFilter={disbursementsPayRequestQueue === 'exceptions'}
        onFilterExceptions={() =>
          setDisbursementsPayRequestQueue((q) => (q === 'exceptions' ? 'all' : 'exceptions'))
        }
        onExportCsv={() => void exportExceptionsCsv()}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDisbursementsPayRequestQueue('all')}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
            disbursementsPayRequestQueue === 'all'
              ? 'bg-zarewa-teal text-white'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          All ({disbursementsActivePayRequests.length})
        </button>
        <button
          type="button"
          onClick={() => setDisbursementsPayRequestQueue('exceptions')}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
            disbursementsPayRequestQueue === 'exceptions'
              ? 'bg-amber-800 text-white'
              : 'border border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100'
          }`}
        >
          Exceptions ({disbursementsExceptionPayRequests.length})
        </button>
        <button
          type="button"
          onClick={() => void exportExceptionsCsv()}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>
      {paging.slice.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--z-border)] bg-[var(--z-surface-muted)]/40 px-4 py-8 text-center text-sm text-[var(--z-text-muted)]">
          {disbursementsPayRequestQueue === 'exceptions'
            ? 'No exception requests in this filter.'
            : 'No expense requests in this filter.'}
        </p>
      ) : (
        <>
          <ul className="space-y-2 lg:hidden">
            {paging.slice.map((req) => {
              const paid = Number(req.paidAmountNgn) || 0;
              const outstanding = paymentRequestOutstandingNgn(req);
              const payee = partyName(req);
              const meta = [paymentRequestPayoutMetaLine(req, branchNameById), req.approvalStatus]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={req.requestID} className="rounded-md border border-[var(--z-border)] bg-white px-3 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--z-text)]">
                        <span className="font-mono text-xs text-zarewa-teal">{req.requestID}</span>
                        {payee ? <span className="font-medium text-slate-700"> · {payee}</span> : null}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-700 line-clamp-2">
                        {req.description || req.expenseCategory || '—'}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <ExpenseCategoryLaneBadge
                          category={req.expenseCategory}
                          laneKey={req.expenseCategoryLane}
                        />
                        <StatusChip status={req.approvalStatus} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--z-text-muted)] line-clamp-2" title={meta}>
                        {meta}
                      </p>
                      {['pending', 'submitted'].includes(String(req.approvalStatus || '').trim().toLowerCase()) &&
                      !canApprovePaymentRequests ? (
                        <ZareApprovalHint
                          compact
                          className="mt-2"
                          context={{
                            referenceNo: req.requestID,
                            documentType: 'payment_request',
                            status: req.approvalStatus,
                            canApprove: false,
                            canMutate: ws?.canMutate !== false,
                            missingPermission: 'Awaiting Branch Manager approval in Management / Needs action.',
                            zareQuery: `Why can't I approve payment request ${req.requestID}?`,
                          }}
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <p className="z-stencil text-sm text-zarewa-teal">
                        {formatNgn(Number(req.amountRequestedNgn) || 0)}
                      </p>
                      {paid > 0 && outstanding > 0 ? (
                        <p className="text-ui-xs font-semibold text-amber-900">Due {formatNgn(outstanding)}</p>
                      ) : null}
                      <RequestRowActions req={req} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="hidden lg:block">
            <AppTableWrap>
              <AppTable role="numeric">
                <AppTableThead>
                  <AppTableTh>Date</AppTableTh>
                  <AppTableTh>Request</AppTableTh>
                  <AppTableTh>Payee</AppTableTh>
                  <AppTableTh>Category</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh align="right">Amount</AppTableTh>
                  <AppTableTh align="right"> </AppTableTh>
                </AppTableThead>
                <AppTableBody>
                  {paging.slice.map((req) => {
                    const paid = Number(req.paidAmountNgn) || 0;
                    const outstanding = paymentRequestOutstandingNgn(req);
                    const payee = partyName(req);
                    return (
                      <AppTableTr key={req.requestID}>
                        <AppTableTd>{dateCell(req.requestDate)}</AppTableTd>
                        <AppTableTd monospace title={req.description || req.requestID}>
                          {req.requestID}
                        </AppTableTd>
                        <AppTableTd title={payee}>{payee || '—'}</AppTableTd>
                        <AppTableTd truncate={false}>
                          <div className="flex min-w-0 flex-col gap-1">
                            <ExpenseCategoryLaneBadge
                              category={req.expenseCategory}
                              laneKey={req.expenseCategoryLane}
                            />
                            <span className="truncate text-xs text-slate-600" title={req.description}>
                              {req.description || '—'}
                            </span>
                          </div>
                        </AppTableTd>
                        <AppTableTd>
                          <StatusChip status={req.approvalStatus} />
                        </AppTableTd>
                        <AppTableTd align="right" truncate={false}>
                          <p className="font-semibold text-zarewa-teal">
                            {formatNgn(Number(req.amountRequestedNgn) || 0)}
                          </p>
                          {paid > 0 ? (
                            <p className="text-ui-xs text-slate-500">Paid {formatNgn(paid)}</p>
                          ) : null}
                          {outstanding > 0 && paid > 0 ? (
                            <p className="text-ui-xs font-semibold text-amber-900">Due {formatNgn(outstanding)}</p>
                          ) : null}
                        </AppTableTd>
                        <AppTableTd align="right" truncate={false}>
                          <RequestRowActions req={req} />
                        </AppTableTd>
                      </AppTableTr>
                    );
                  })}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </div>
        </>
      )}
      <AppTablePager
        showingFrom={paging.showingFrom}
        showingTo={paging.showingTo}
        total={paging.total}
        hasPrev={paging.hasPrev}
        hasNext={paging.hasNext}
        onPrev={paging.goPrev}
        onNext={paging.goNext}
        pageSize={LIST_PAGE}
      />
    </div>
  );
}

function PostedExpenseList() {
  const {
    disbursementsFilteredExpenses,
    disbursementsSearch,
    branchNameById,
    liveTreasuryMovements,
    canFinanceReceiptSettlement,
    canPostExpenseReclass,
    canDeleteRolloutExpenseOrRequest,
    ws,
    openExpenseOutflowEdit,
    openReclassifyExpense,
    deleteRolloutExpense,
    deletingExpenseId,
    handleDeskViewPaymentRequest,
  } = useAccountPage();
  const paging = useAppTablePaging(disbursementsFilteredExpenses || [], LIST_PAGE, disbursementsSearch);

  const actionsFor = (ex) => {
    const expenseTreasuryOut = treasuryOutflowLinesForExpense(ex.expenseID, liveTreasuryMovements);
    return (
      <div className="inline-flex flex-wrap justify-end gap-1">
        <QuietAction onClick={() => handleDeskViewPaymentRequest('', { expenseId: ex.expenseID })}>View</QuietAction>
        {canFinanceReceiptSettlement && ws?.canMutate && expenseTreasuryOut.length > 0 ? (
          <QuietAction tone="teal" onClick={() => openExpenseOutflowEdit(ex)}>
            <Pencil size={11} aria-hidden />
            Pay-from
          </QuietAction>
        ) : null}
        {canPostExpenseReclass && ws?.canMutate && expenseTreasuryOut.length > 0 ? (
          <QuietAction tone="violet" onClick={() => openReclassifyExpense(ex)}>
            Reclass
          </QuietAction>
        ) : null}
        {canDeleteRolloutExpenseOrRequest ? (
          <QuietAction
            tone="rose"
            disabled={deletingExpenseId === ex.expenseID}
            onClick={() => void deleteRolloutExpense(ex.expenseID)}
          >
            <Trash2 size={11} aria-hidden />
            Delete
          </QuietAction>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {paging.slice.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--z-border)] bg-[var(--z-surface-muted)]/40 px-4 py-8 text-center text-sm text-[var(--z-text-muted)]">
          No posted expense cards in this filter.
        </p>
      ) : (
        <>
          <ul className="space-y-2 lg:hidden">
            {paging.slice.map((ex) => {
              const payee = partyName(ex);
              const meta = [
                ex.expenseType,
                ex.category,
                ex.branchId ? branchNameById[ex.branchId] || ex.branchId : null,
                ex.paymentMethod ? `${ex.paymentMethod}${ex.reference ? ` · ${ex.reference}` : ''}` : null,
                dateCell(ex.date),
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={ex.expenseID} className="rounded-md border border-[var(--z-border)] bg-white px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-zarewa-teal">{ex.expenseID}</p>
                      {payee ? <p className="mt-0.5 text-sm font-medium text-slate-800">{payee}</p> : null}
                      <p className="mt-0.5 text-xs text-[var(--z-text-muted)] line-clamp-2" title={meta}>
                        {meta}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <p className="z-stencil text-sm text-zarewa-teal">{formatNgn(ex.amountNgn)}</p>
                      {actionsFor(ex)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden lg:block">
            <AppTableWrap>
              <AppTable role="numeric">
                <AppTableThead>
                  <AppTableTh>Date</AppTableTh>
                  <AppTableTh>Expense</AppTableTh>
                  <AppTableTh>Payee</AppTableTh>
                  <AppTableTh>Category</AppTableTh>
                  <AppTableTh>Paid from</AppTableTh>
                  <AppTableTh align="right">Amount</AppTableTh>
                  <AppTableTh align="right"> </AppTableTh>
                </AppTableThead>
                <AppTableBody>
                  {paging.slice.map((ex) => {
                    const payee = partyName(ex);
                    const paidFrom = [ex.paymentMethod, ex.reference].filter(Boolean).join(' · ');
                    return (
                      <AppTableTr key={ex.expenseID}>
                        <AppTableTd>{dateCell(ex.date)}</AppTableTd>
                        <AppTableTd monospace>{ex.expenseID}</AppTableTd>
                        <AppTableTd title={payee}>{payee || '—'}</AppTableTd>
                        <AppTableTd title={[ex.expenseType, ex.category].filter(Boolean).join(' · ')}>
                          {[ex.expenseType, ex.category].filter(Boolean).join(' · ') || '—'}
                        </AppTableTd>
                        <AppTableTd title={paidFrom}>{paidFrom || '—'}</AppTableTd>
                        <AppTableTd align="right" className="font-semibold text-zarewa-teal">
                          {formatNgn(ex.amountNgn)}
                        </AppTableTd>
                        <AppTableTd align="right" truncate={false}>
                          {actionsFor(ex)}
                        </AppTableTd>
                      </AppTableTr>
                    );
                  })}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </div>
        </>
      )}
      <AppTablePager
        showingFrom={paging.showingFrom}
        showingTo={paging.showingTo}
        total={paging.total}
        hasPrev={paging.hasPrev}
        hasNext={paging.hasNext}
        onPrev={paging.goPrev}
        onNext={paging.goNext}
        pageSize={LIST_PAGE}
      />
    </div>
  );
}

function ArchiveRequestList() {
  const {
    disbursementsArchivedRejectedPayRequests,
    disbursementsSearch,
    branchNameById,
    liveTreasuryMovements,
    openExpenseRequestForCorrection,
    canFinanceReceiptSettlement,
    canReversePaymentRequestTreasury,
    canDeleteRolloutExpenseOrRequest,
    ws,
    openPaymentRequestOutflowEdit,
    reversePaymentRequestTreasuryPayout,
    reversingTreasuryPayoutId,
    deleteRolloutPaymentRequest,
    deletingPayRequestId,
    handleDeskViewPaymentRequest,
  } = useAccountPage();
  const paging = useAppTablePaging(
    disbursementsArchivedRejectedPayRequests || [],
    LIST_PAGE,
    disbursementsSearch
  );

  const actionsFor = (req) => {
    const archPaid = Number(req.paidAmountNgn) || 0;
    const archPrTreasuryOut = treasuryOutflowLinesForPaymentRequest(req.requestID, liveTreasuryMovements);
    return (
      <div className="inline-flex flex-wrap justify-end gap-1">
        <QuietAction onClick={() => handleDeskViewPaymentRequest(req.requestID)}>View</QuietAction>
        <QuietAction tone="sky" onClick={() => openExpenseRequestForCorrection(req)}>
          Resubmit
        </QuietAction>
        {canFinanceReceiptSettlement && ws?.canMutate && archPrTreasuryOut.length > 0 ? (
          <QuietAction tone="teal" onClick={() => openPaymentRequestOutflowEdit(req)}>
            Pay-from
          </QuietAction>
        ) : null}
        {canReversePaymentRequestTreasury && ws?.canMutate && archPaid > 0 ? (
          <QuietAction
            tone="amber"
            disabled={reversingTreasuryPayoutId === req.requestID}
            onClick={() => void reversePaymentRequestTreasuryPayout(req.requestID)}
          >
            Reverse
          </QuietAction>
        ) : null}
        {canDeleteRolloutExpenseOrRequest && archPaid <= 0 ? (
          <QuietAction
            tone="rose"
            disabled={deletingPayRequestId === req.requestID}
            onClick={() => void deleteRolloutPaymentRequest(req.requestID)}
          >
            Delete
          </QuietAction>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {paging.slice.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--z-border)] bg-[var(--z-surface-muted)]/40 px-4 py-8 text-center text-sm text-[var(--z-text-muted)]">
          No rejected or cancelled requests.
        </p>
      ) : (
        <>
          <ul className="space-y-2 lg:hidden">
            {paging.slice.map((req) => {
              const payee = partyName(req);
              const meta = [
                req.requestDate ? `Requested ${dateCell(req.requestDate)}` : null,
                req.expenseCategory,
                req.branchId ? branchNameById[req.branchId] || req.branchId : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <li
                  key={req.requestID}
                  className="rounded-md border border-[var(--z-border)] bg-slate-50/70 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        <span className="font-mono text-xs">{req.requestID}</span>
                        <span className="ml-1.5">
                          <StatusChip status={req.approvalStatus || 'Rejected'} />
                        </span>
                      </p>
                      {payee ? <p className="mt-0.5 text-sm text-slate-700">{payee}</p> : null}
                      <p className="mt-1 text-xs text-[var(--z-text-muted)] line-clamp-2">
                        {req.description || 'Archived request'}
                        {meta ? ` · ${meta}` : ''}
                      </p>
                      {req.approvalNote ? (
                        <p className="mt-1 text-xs text-rose-800 line-clamp-2" title={req.approvalNote}>
                          {req.approvalNote}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <p className="z-stencil text-sm text-slate-800">
                        {formatNgn(Number(req.amountRequestedNgn) || 0)}
                      </p>
                      {actionsFor(req)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden lg:block">
            <AppTableWrap>
              <AppTable role="numeric">
                <AppTableThead>
                  <AppTableTh>Date</AppTableTh>
                  <AppTableTh>Request</AppTableTh>
                  <AppTableTh>Payee</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh>Note</AppTableTh>
                  <AppTableTh align="right">Amount</AppTableTh>
                  <AppTableTh align="right"> </AppTableTh>
                </AppTableThead>
                <AppTableBody>
                  {paging.slice.map((req) => {
                    const payee = partyName(req);
                    return (
                      <AppTableTr key={req.requestID}>
                        <AppTableTd>{dateCell(req.requestDate)}</AppTableTd>
                        <AppTableTd monospace title={req.description}>
                          {req.requestID}
                        </AppTableTd>
                        <AppTableTd title={payee}>{payee || '—'}</AppTableTd>
                        <AppTableTd>
                          <StatusChip status={req.approvalStatus || 'Rejected'} />
                        </AppTableTd>
                        <AppTableTd title={req.approvalNote || req.description}>
                          {req.approvalNote || req.description || '—'}
                        </AppTableTd>
                        <AppTableTd align="right" className="font-semibold text-slate-800">
                          {formatNgn(Number(req.amountRequestedNgn) || 0)}
                        </AppTableTd>
                        <AppTableTd align="right" truncate={false}>
                          {actionsFor(req)}
                        </AppTableTd>
                      </AppTableTr>
                    );
                  })}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </div>
        </>
      )}
      <AppTablePager
        showingFrom={paging.showingFrom}
        showingTo={paging.showingTo}
        total={paging.total}
        hasPrev={paging.hasPrev}
        hasNext={paging.hasNext}
        onPrev={paging.goPrev}
        onNext={paging.goNext}
        pageSize={LIST_PAGE}
      />
    </div>
  );
}

const SECTION_HINT = {
  posted: 'Treasury lines that already left till or bank. View opens the source request or expense.',
  requests: 'Open payment requests. Pay approved items here or from Desk.',
  expenses: 'Posted expense cards after payout. Open View to compare payee, memo, and lines.',
  archive: 'Rejected or refused before payout. Resubmit a corrected request — treasury does not pay from this list.',
};

const SEARCH_PLACEHOLDER = {
  posted: 'Search date, payee, account, source id…',
  requests: 'Search request id, payee, category…',
  expenses: 'Search expense id, payee, category…',
  archive: 'Search archived request id, payee, note…',
};

export function FinancePostedOutflowsPanel() {
  const {
    paymentsListWindow,
    paymentsRegisterTotalNgn,
    disbursementsActivePayRequests,
    disbursementsFilteredExpenses,
    disbursementsArchivedRejectedPayRequests,
    disbursementsExceptionPayRequests,
    disbursementsSearch,
    setDisbursementsSearch,
    canImportExpenses,
    openExpenseBulkImport,
    handleAccountTabChange,
    needsPaymentsMutateSecondApproval,
    paymentsApprovalEntity,
    paymentsMutateApprovalId,
    setPaymentsMutateApprovalId,
    ws,
  } = useAccountPage();
  const [section, setSection] = useState('posted');

  const dueRequests = useMemo(
    () =>
      (disbursementsActivePayRequests || []).filter(
        (pr) => String(pr.approvalStatus || '').trim() === 'Approved' && paymentRequestOutstandingNgn(pr) > 0
      ),
    [disbursementsActivePayRequests]
  );
  const dueNgn = useMemo(
    () => dueRequests.reduce((sum, pr) => sum + paymentRequestOutstandingNgn(pr), 0),
    [dueRequests]
  );
  const expenseTotalNgn = useMemo(
    () => (disbursementsFilteredExpenses || []).reduce((sum, ex) => sum + Math.round(Number(ex.amountNgn) || 0), 0),
    [disbursementsFilteredExpenses]
  );

  const sections = [
    {
      id: 'posted',
      title: 'Posted',
      count: paymentsListWindow?.total || 0,
      subtotalNgn: paymentsRegisterTotalNgn || 0,
      unit: 'line',
    },
    {
      id: 'requests',
      title: 'Requests',
      count: disbursementsActivePayRequests.length,
      subtotalNgn: dueNgn,
      unit: 'request',
    },
    {
      id: 'expenses',
      title: 'Expenses',
      count: disbursementsFilteredExpenses.length,
      subtotalNgn: expenseTotalNgn,
      unit: 'card',
    },
    {
      id: 'archive',
      title: 'Archive',
      count: disbursementsArchivedRejectedPayRequests.length,
      unit: 'request',
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300" data-testid="finance-payment-register">
      <AccountingRegisterHeader
        title="Payment register"
        subtitle="Money that already left till and bank. Pay new approved items from Desk."
        totalLabel="Posted out"
        totalValue={formatNgn(paymentsRegisterTotalNgn || 0)}
        actions={
          <>
            {canImportExpenses && ws?.canMutate ? (
              <button
                type="button"
                className="z-btn-secondary inline-flex items-center gap-1.5 text-xs"
                onClick={() => openExpenseBulkImport?.()}
              >
                <Upload size={14} aria-hidden />
                Import expenses
              </button>
            ) : null}
            <button
              type="button"
              className="z-btn-primary inline-flex items-center text-xs"
              onClick={() => handleAccountTabChange('desk')}
            >
              Open desk
            </button>
          </>
        }
      />

      {dueRequests.length > 0 || (disbursementsExceptionPayRequests || []).length > 0 ? (
        <AccountingDeskNotice tone={dueRequests.length > 0 ? 'info' : 'warn'}>
          {dueRequests.length > 0 ? (
            <button
              type="button"
              className="font-semibold text-zarewa-teal hover:underline"
              onClick={() => setSection('requests')}
            >
              {dueRequests.length} approved request{dueRequests.length === 1 ? '' : 's'} still to pay (
              {formatNgn(dueNgn)})
            </button>
          ) : null}
          {dueRequests.length > 0 && (disbursementsExceptionPayRequests || []).length > 0 ? (
            <span className="text-slate-400"> · </span>
          ) : null}
          {(disbursementsExceptionPayRequests || []).length > 0 ? (
            <button
              type="button"
              className="font-semibold text-amber-900 hover:underline"
              onClick={() => setSection('requests')}
            >
              {(disbursementsExceptionPayRequests || []).length} need category review
            </button>
          ) : null}
        </AccountingDeskNotice>
      ) : null}

      <AccountingSectionNav sections={sections} value={section} onChange={setSection} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-xs leading-relaxed text-[var(--z-text-muted)]">{SECTION_HINT[section]}</p>
        <div className="w-full max-w-md shrink-0">
          <SalesListSearchInput
            value={disbursementsSearch}
            onChange={setDisbursementsSearch}
            placeholder={SEARCH_PLACEHOLDER[section]}
            label="Search payment register"
          />
        </div>
      </div>

      {needsPaymentsMutateSecondApproval ? (
        <AccountingDeskNotice tone="warn">
          <p>
            Reverse and delete on this register need a manager edit-approval code for the same expense, request, or
            refund.
          </p>
          {paymentsApprovalEntity ? (
            <div className="mt-2 space-y-1.5">
              <p className="font-mono text-xs text-slate-800">
                {paymentsApprovalEntity.kind} · {paymentsApprovalEntity.id}
              </p>
              <EditSecondApprovalInline
                entityKind={
                  paymentsApprovalEntity.kind === 'expense'
                    ? 'expense'
                    : paymentsApprovalEntity.kind === 'refund'
                      ? 'refund'
                      : 'payment_request'
                }
                entityId={paymentsApprovalEntity.id}
                value={paymentsMutateApprovalId}
                onChange={setPaymentsMutateApprovalId}
              />
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-600">
              Choose Reverse, Delete, or Pay-from on a row to lock the code to that record.
            </p>
          )}
        </AccountingDeskNotice>
      ) : null}

      {section === 'posted' ? <PostedOutflowsTable /> : null}
      {section === 'requests' ? <RequestPipelineList /> : null}
      {section === 'expenses' ? <PostedExpenseList /> : null}
      {section === 'archive' ? <ArchiveRequestList /> : null}
    </div>
  );
}
