import React from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  Printer,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

import { ZareApprovalHint } from '../../components/ZareApprovalHint';
import { EditSecondApprovalInline } from '../../components/EditSecondApprovalInline';
import { formatNgn } from '../../Data/mockData';
import { effectiveOutstandingNgn } from '../../lib/paymentOutstandingTolerance.js';
import { receiptCashReceivedNgn, receiptLedgerReceiptTreasurySplits } from '../../lib/salesReceiptsList';
import { ExpenseCategoryLaneBadge } from '../../components/office/ExpenseCategoryLaneBadge.jsx';
import { ExpenseCategoryExceptionBanner } from '../../components/office/ExpenseCategoryExceptionBanner.jsx';
import {
  treasuryOutflowLinesForExpense,
  treasuryOutflowLinesForPaymentRequest,
  isPayFromCorrectionTreasuryRow,
  TREASURY_STATEMENT_TYPE_LABEL,
} from '../../lib/accountCore';
import { FinanceDeskWorkQueues } from '../../components/finance/FinanceDeskWorkQueues.jsx';
import { FinanceTabContextBanner } from '../../components/finance/FinanceTabContextBanner.jsx';
import { FinanceReceiptsWorkflowStrip } from '../../components/finance/FinanceReceiptsWorkflowStrip.jsx';
import { FinanceTreasuryManageAccountsPanel } from '../../components/finance/FinanceTreasuryManageAccountsPanel.jsx';
import { AccountBankReconciliationPanel } from '../../components/account/AccountBankReconciliationPanel.jsx';
import { RegisterBankDepositPanel } from '../../components/finance/RegisterBankDepositPanel.jsx';
import { BankDepositExceptionPanel } from '../../components/finance/BankDepositExceptionPanel.jsx';
import { AccountGlManualJournalCard } from '../../components/account/AccountGlManualJournalCard.jsx';
import { receiptClearanceBadgeLabel } from '../../lib/receiptClearance.js';
import { useAccountPage } from './AccountPageContext.jsx';

export function AccountTabPanels() {
  const {
    activeTab,
    adminFinanceReapplyBusy,
    auditQueue,
    bankAccounts,
    bankAccountsForBranch,
    bankAccountsVisible,
    bankReconciliation,
    branchNameById,
    canApprovePaymentRequests,
    canDeleteRolloutExpenseOrRequest,
    canEditTreasuryTransfer,
    canExecTreasuryDelete,
    canFinanceReceiptSettlement,
    canManageTreasury,
    canPayRequests,
    canPostExpenseReclass,
    canReversePaymentRequestTreasury,
    deleteRolloutExpense,
    deleteRolloutPaymentRequest,
    deleteTreasuryTransfer,
    deletingExpenseId,
    deletingPayRequestId,
    deletingTransferBatchId,
    disbursementsActivePayRequests,
    disbursementsArchivedRejectedPayRequests,
    disbursementsExceptionPayRequests,
    disbursementsFilteredExpenses,
    disbursementsPayRequestQueue,
    disbursementsSearch,
    disbursementsVisiblePayRequests,
    exceptionReportSummary,
    expenseById,
    expenses,
    exportExceptionsCsv,
    filteredBankAccounts,
    filteredSalesReceipts,
    handleAccountTabChange,
    handleDeskCancelRefund,
    handleDeskConfirmReceipt,
    handleDeskPayPoTransport,
    handleDeskPayRefund,
    handleDeskPayRegisterSettlement,
    handleDeskPayRequest,
    handleDeskReceiveStaffObligation,
    handleDeskReceiveStaffRecovery,
    handleDeskViewPaymentRequest,
    handleDeskViewPoTransport,
    handleDeskViewReceipt,
    isAdminRole,
    isCashierRole,
    liveReceipts,
    liveTreasuryMovements,
    movementRows,
    needsPaymentsMutateSecondApproval,
    openBankDepositsCount,
    openEditTreasuryAccount,
    openEditTreasuryTransfer,
    openExpenseOutflowEdit,
    openPayFromEditForTableRow,
    openPaymentRequestOutflowEdit,
    openReceiptFinance,
    openReclassifyExpense,
    openReclassifyPaymentRequest,
    openRequestPayment,
    openUnreconciledReceiptsPrint,
    payRequestById,
    PAYMENTS_PAGE_SIZE,
    paymentsApprovalEntity,
    paymentsListWindow,
    paymentsMutateApprovalId,
    paymentsTableSortDir,
    paymentsTableSortKey,
    prPayoutPrimaryMovementId,
    receiptsListWindow,
    receiptsPendingClearanceNgn,
    receiptsSortDir,
    receiptsSortKey,
    receiptsTableSearch,
    reconciliationFlags,
    refundById,
    refundPayoutPrimaryMovementId,
    removeTreasuryAccount,
    reversePaymentRequestTreasuryPayout,
    reverseRefundTreasuryPayout,
    reversingRefundTreasuryPayoutId,
    reversingTreasuryPayoutId,
    runAdminReapplyFinanceReconciledReceipts,
    setConfirmedReceiptsPage,
    setDisbursementsPayRequestQueue,
    setDisbursementsSearch,
    setEditingTransferBatchId,
    setExpenseForm,
    setPaymentsMutateApprovalId,
    setPaymentsTablePage,
    setReceiptsSortDir,
    setReceiptsSortKey,
    setReceiptsTableSearch,
    setShowExpenseModal,
    setShowTransferModal,
    setStatementAccount,
    setTransferForm,
    setWaitingReceiptsPage,
    showAllTreasuryInTab,
    showToast,
    sortedFilteredSalesReceipts,
    togglePaymentsSort,
    todayIso,
    treasuryBookDisplayNgn,
    treasuryInflowsNgn,
    treasuryOutflowsNgn,
    waitingReceiptsListWindow,
    workspaceBranchId,
    workspaceBranchLabel,
    ws,
  } = useAccountPage();

  return (
            <>
            {activeTab === 'desk' && (
              <>
                <FinanceDeskWorkQueues
                  onConfirmReceipt={handleDeskConfirmReceipt}
                  onViewReceipt={handleDeskViewReceipt}
                  onPayRequest={handleDeskPayRequest}
                  onViewPaymentRequest={handleDeskViewPaymentRequest}
                  onPayRefund={handleDeskPayRefund}
                  onCancelRefund={handleDeskCancelRefund}
                  onPayRegisterSettlement={handleDeskPayRegisterSettlement}
                  onPayPoTransport={handleDeskPayPoTransport}
                  onViewPoTransport={handleDeskViewPoTransport}
                  onReceiveStaffRecovery={handleDeskReceiveStaffRecovery}
                  onReceiveStaffObligation={handleDeskReceiveStaffObligation}
                  onGoToTab={handleAccountTabChange}
                  onAccountClick={canManageTreasury ? undefined : setStatementAccount}
                  hideAccountGrid={canManageTreasury}
                  treasurySummary={{
                    inflowsNgn: ws?.hasWorkspaceData
                      ? treasuryInflowsNgn
                      : liveReceipts.reduce((s, r) => s + receiptCashReceivedNgn(r), 0),
                    outflowsNgn: ws?.hasWorkspaceData
                      ? treasuryOutflowsNgn
                      : expenses.reduce((s, e) => s + e.amountNgn, 0),
                    reconciliationCount: reconciliationFlags,
                    onGoToReceipts: () => handleAccountTabChange('receipts'),
                  }}
                />
                {canManageTreasury ? (
                  <FinanceTreasuryManageAccountsPanel
                    workspaceBranchLabel={workspaceBranchLabel}
                    accounts={filteredBankAccounts}
                    bankAccountsVisibleCount={bankAccountsVisible.length}
                    bookDisplayNgn={treasuryBookDisplayNgn}
                    branchNameById={branchNameById}
                    workspaceBranchId={workspaceBranchId}
                    showAllTreasuryInTab={showAllTreasuryInTab}
                    canManageTreasury={canManageTreasury}
                    canMutate={Boolean(ws?.canMutate)}
                    canExecTreasuryDelete={canExecTreasuryDelete}
                    onOpenStatement={setStatementAccount}
                    onEditAccount={openEditTreasuryAccount}
                    onRemoveAccount={removeTreasuryAccount}
                  />
                ) : null}
              </>
            )}

            {activeTab === 'receipts' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {isCashierRole ? (
                  <FinanceTabContextBanner
                    testId="cashier-receipts-desk-banner"
                    tone="amber"
                    title="Receipts & clearance"
                    body="Confirm bank/cash here or jump to Finance desk for the same queue. Cleared receipts unlock refunds and accurate balances."
                    action={
                      <button
                        type="button"
                        onClick={() => handleAccountTabChange('desk')}
                        className="text-[10px] font-bold uppercase tracking-wide text-white bg-zarewa-teal hover:bg-[#0f3d3a] px-3 py-1.5 rounded-lg"
                      >
                        Finance desk
                      </button>
                    }
                  />
                ) : null}
                <FinanceReceiptsWorkflowStrip
                  pendingCount={waitingReceiptsListWindow.total}
                  confirmedCount={receiptsListWindow.total}
                  pendingNgn={receiptsPendingClearanceNgn}
                  openBankDeposits={openBankDepositsCount}
                  onGoToDesk={() => handleAccountTabChange('desk')}
                />
                <section className="space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zarewa-teal">
                        Receipts confirmation & reconciliation
                      </h3>
                      <p className="text-[10px] text-slate-600 mt-1 max-w-3xl leading-relaxed">
                        Confirm sales receipts, register unknown bank inflows, then match daily bank lines.
                      </p>
                    </div>
                  </div>
                  {filteredSalesReceipts.length === 0 ? (
                    <p className="text-[10px] text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-lg">
                      No receipts in this branch scope.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/70 bg-slate-50/80 px-2.5 py-2">
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                          <div className="relative min-w-[8rem] flex-1 max-w-[14rem]">
                            <Search
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              size={14}
                            />
                            <input
                              type="search"
                              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-[10px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15"
                              placeholder="Search receipts…"
                              value={receiptsTableSearch}
                              onChange={(e) => setReceiptsTableSearch(e.target.value)}
                              autoComplete="off"
                              aria-label="Filter receipts table"
                            />
                          </div>
                          <span className="text-ui-xs font-bold text-slate-500 uppercase">Sort by</span>
                          <select
                            value={receiptsSortKey}
                            onChange={(e) => setReceiptsSortKey(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-zarewa-teal outline-none focus:ring-2 focus:ring-zarewa-teal/15"
                          >
                            <option value="date">Receipt date</option>
                            <option value="id">Receipt id</option>
                            <option value="customer">Customer</option>
                            <option value="amount">Amount received</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setReceiptsSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-ui-xs font-black uppercase tracking-wide text-slate-600"
                          >
                            {receiptsSortDir === 'asc' ? 'Ascending' : 'Descending'}
                          </button>
                          <button
                            type="button"
                            onClick={openUnreconciledReceiptsPrint}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-ui-xs font-black uppercase tracking-wide text-amber-900 hover:bg-amber-100"
                            title="Print full list of receipts pending finance clearance"
                          >
                            <Printer size={12} />
                            Print unreconciled
                          </button>
                          {isAdminRole ? (
                            <button
                              type="button"
                              disabled={adminFinanceReapplyBusy}
                              onClick={() => void runAdminReapplyFinanceReconciledReceipts()}
                              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-ui-xs font-black uppercase tracking-wide text-violet-950 hover:bg-violet-100 disabled:opacity-50"
                              title="Admin only: make reconciled bank amounts the real receipt total and fix quotation paid / refund overpayment"
                            >
                              <RefreshCw size={12} className={adminFinanceReapplyBusy ? 'animate-spin' : ''} />
                              {adminFinanceReapplyBusy ? 'Recalculating…' : 'Fix reconciled amounts'}
                            </button>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-slate-600 tabular-nums">
                          {sortedFilteredSalesReceipts.length} receipt
                          {sortedFilteredSalesReceipts.length !== 1 ? 's' : ''} in view
                        </div>
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
                      <section className="space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200/70 bg-amber-50/65 px-3 py-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-amber-900">
                              Pending clearance
                            </p>
                            <p className="text-ui-xs text-amber-800/90">
                              Sales recorded these payments — Finance must confirm bank/cash before refunds and cleared balances.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-amber-900">
                            <span className="tabular-nums">
                              {waitingReceiptsListWindow.total === 0
                                ? '0 receipts'
                                : `Showing ${waitingReceiptsListWindow.from}-${waitingReceiptsListWindow.to} of ${waitingReceiptsListWindow.total}`}
                            </span>
                            <button
                              type="button"
                              disabled={waitingReceiptsListWindow.safePage <= 0}
                              onClick={() => setWaitingReceiptsPage((p) => Math.max(0, p - 1))}
                              className="inline-flex items-center rounded-lg border border-amber-200 bg-white px-2 py-1 disabled:opacity-40"
                              aria-label="Previous waiting page"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-ui-xs font-bold tabular-nums text-amber-800">
                              {waitingReceiptsListWindow.safePage + 1}/{waitingReceiptsListWindow.pageCount}
                            </span>
                            <button
                              type="button"
                              disabled={waitingReceiptsListWindow.safePage >= waitingReceiptsListWindow.pageCount - 1}
                              onClick={() => setWaitingReceiptsPage((p) => p + 1)}
                              className="inline-flex items-center rounded-lg border border-amber-200 bg-white px-2 py-1 disabled:opacity-40"
                              aria-label="Next waiting page"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                        {waitingReceiptsListWindow.total === 0 ? (
                          <p className="text-[10px] text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                            No waiting receipts.
                          </p>
                        ) : null}
                        <ul className="space-y-1.5">
                          {waitingReceiptsListWindow.slice.map((r) => {
                            const allocated = Number(r.amountNgn) || 0;
                            const cash =
                              r.cashReceivedNgn != null ? Number(r.cashReceivedNgn) || allocated : allocated;
                            const bank =
                              r.bankReceivedAmountNgn != null ? Number(r.bankReceivedAmountNgn) : null;
                            const clearanceLabel = receiptClearanceBadgeLabel(r);
                            const paySplits = receiptLedgerReceiptTreasurySplits(r, liveTreasuryMovements);
                            return (
                              <li
                                key={r.id}
                                className="rounded-lg border border-slate-200/75 bg-white py-1.5 px-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2 transition-colors hover:border-slate-300/90"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold text-zarewa-teal font-mono">{r.id}</p>
                                  <p className="text-ui-xs text-slate-500 truncate">
                                    {r.customer || '-'} · {r.quotationRef || '-'} · {r.dateISO || r.date || '-'}
                                  </p>
                                  {paySplits.length > 0 ? (
                                    <ul className="mt-1.5 space-y-0.5 border-t border-dashed border-slate-200/80 pt-1.5">
                                      {paySplits.map((s) => (
                                        <li
                                          key={s.movementId}
                                          className="flex justify-between gap-2 text-ui-xs text-slate-700"
                                        >
                                          <span className="min-w-0 truncate font-medium" title={s.accountLabel}>
                                            {s.accountLabel}
                                          </span>
                                          <span className="shrink-0 font-bold tabular-nums text-zarewa-teal">
                                            {formatNgn(s.amountNgn)}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                                    Total {formatNgn(cash)}
                                    {Math.round(allocated) !== Math.round(cash) ? (
                                      <span className="text-slate-500 font-semibold"> (quote {formatNgn(allocated)})</span>
                                    ) : null}
                                    {bank != null && Math.round(bank) !== Math.round(cash) ? (
                                      <span className="text-amber-800"> · Bank {formatNgn(bank)}</span>
                                    ) : null}
                                  </span>
                                  <span
                                    className={`text-ui-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                                      clearanceLabel === 'Pending clearance'
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {clearanceLabel}
                                  </span>
                                  {canFinanceReceiptSettlement && ws?.canMutate ? (
                                    <button
                                      type="button"
                                      onClick={() => openReceiptFinance(r)}
                                      className="text-ui-xs font-bold uppercase px-2 py-1 rounded-md bg-zarewa-teal text-white hover:bg-[#0f3d3a]"
                                      >
                                      Confirm
                                    </button>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                      <section className="space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50/65 px-3 py-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-900">
                              Confirmed
                            </p>
                            <p className="text-ui-xs text-emerald-800/90">
                              Receipts already confirmed and reconciled by finance.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-emerald-900">
                            <span className="tabular-nums">
                              {receiptsListWindow.total === 0
                                ? '0 receipts'
                                : `Showing ${receiptsListWindow.from}-${receiptsListWindow.to} of ${receiptsListWindow.total}`}
                            </span>
                            <button
                              type="button"
                              disabled={receiptsListWindow.safePage <= 0}
                              onClick={() => setConfirmedReceiptsPage((p) => Math.max(0, p - 1))}
                              className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-2 py-1 disabled:opacity-40"
                              aria-label="Previous confirmed page"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span className="text-ui-xs font-bold tabular-nums text-emerald-800">
                              {receiptsListWindow.safePage + 1}/{receiptsListWindow.pageCount}
                            </span>
                            <button
                              type="button"
                              disabled={receiptsListWindow.safePage >= receiptsListWindow.pageCount - 1}
                              onClick={() => setConfirmedReceiptsPage((p) => p + 1)}
                              className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-2 py-1 disabled:opacity-40"
                              aria-label="Next confirmed page"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                        {receiptsListWindow.total === 0 ? (
                          <p className="text-[10px] text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                            No confirmed receipts yet.
                          </p>
                        ) : null}
                        <ul className="space-y-1.5">
                          {receiptsListWindow.slice.map((r) => {
                        const allocated = Number(r.amountNgn) || 0;
                        const cash =
                          r.cashReceivedNgn != null ? Number(r.cashReceivedNgn) || allocated : allocated;
                        const bank =
                          r.bankReceivedAmountNgn != null ? Number(r.bankReceivedAmountNgn) : null;
                        const cleared = Boolean(r.financeDeliveryClearedAtISO);
                        const paySplits = receiptLedgerReceiptTreasurySplits(r, liveTreasuryMovements);
                        return (
                          <li
                            key={r.id}
                            className="rounded-lg border border-slate-200/75 bg-white py-1.5 px-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2 transition-colors hover:border-slate-300/90"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-zarewa-teal font-mono">{r.id}</p>
                              <p className="text-ui-xs text-slate-500 truncate">
                                {r.customer || '—'} · {r.quotationRef || '—'} · {r.dateISO || r.date || '—'}
                              </p>
                              {paySplits.length > 0 ? (
                                <ul className="mt-1.5 space-y-0.5 border-t border-dashed border-slate-200/80 pt-1.5">
                                  {paySplits.map((s) => (
                                    <li
                                      key={s.movementId}
                                      className="flex justify-between gap-2 text-ui-xs text-slate-700"
                                    >
                                      <span className="min-w-0 truncate font-medium" title={s.accountLabel}>
                                        {s.accountLabel}
                                      </span>
                                      <span className="shrink-0 font-bold tabular-nums text-zarewa-teal">
                                        {formatNgn(s.amountNgn)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                                Total {formatNgn(cash)}
                                {Math.round(allocated) !== Math.round(cash) ? (
                                  <span className="text-slate-500 font-semibold">
                                    {' '}
                                    (quote {formatNgn(allocated)})
                                  </span>
                                ) : null}
                                {bank != null && Math.round(bank) !== Math.round(cash) ? (
                                  <span className="text-amber-800"> · Bank {formatNgn(bank)}</span>
                                ) : null}
                              </span>
                              {r.financeReconciliationSavedAtISO ? (
                                <span className="text-ui-xs font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                                  Reconciled
                                </span>
                              ) : null}
                              {cleared ? (
                                <span className="text-ui-xs font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                                  Cleared delivery
                                </span>
                              ) : (
                                <span className="text-ui-xs font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                  Pending
                                </span>
                              )}
                              {canFinanceReceiptSettlement && ws?.canMutate ? (
                                <button
                                  type="button"
                                  onClick={() => openReceiptFinance(r)}
                                  className="text-ui-xs font-bold uppercase px-2 py-1 rounded-md bg-zarewa-teal text-white hover:bg-[#0f3d3a]"
                                >
                                  {r.financeReconciliationSavedAtISO ? 'Revise' : 'Confirm'}
                                </button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                        </ul>
                      </section>
                      </div>

                      {ws?.hasPermission?.('finance.view') ? (
                        <section className="space-y-3 border-t border-slate-200/80 pt-6">
                          <RegisterBankDepositPanel
                            snapshot={ws?.snapshot}
                            session={ws?.session}
                            branchScope={ws?.branchScope}
                            viewAllBranches={ws?.viewAllBranches}
                            canPost={Boolean(ws?.hasPermission?.('finance.post') && ws?.canMutate)}
                            showToast={showToast}
                            onRegistered={() => ws?.refresh?.()}
                          />
                          <BankDepositExceptionPanel
                            canPost={Boolean(ws?.hasPermission?.('finance.post') && ws?.canMutate)}
                            showToast={showToast}
                            onChanged={() => ws?.refresh?.()}
                          />
                        </section>
                      ) : null}

                      {ws?.hasPermission?.('finance.view') ? (
                        <section className="space-y-3 border-t border-slate-200/80 pt-6">
                          <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zarewa-teal">
                              Daily bank line queue
                            </h3>
                            <p className="text-ui-xs text-slate-600 mt-0.5 max-w-3xl leading-relaxed">
                              Match treasury to your bank app or cash count — add lines manually.
                            </p>
                          </div>
                          <AccountBankReconciliationPanel
                            lines={bankReconciliation}
                            treasuryAccounts={bankAccounts}
                            treasuryMovements={liveTreasuryMovements}
                            canPost={Boolean(ws?.hasPermission?.('finance.post') && ws?.canMutate)}
                            canApprove={Boolean(ws?.hasPermission?.('finance.approve'))}
                            branchLabel={ws?.snapshot?.branch?.name || ws?.workspaceBranchId || ''}
                            onWorkspaceRefresh={() => ws?.refresh?.()}
                            showToast={showToast}
                          />
                        </section>
                      ) : null}
                    </>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'movements' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <FinanceTabContextBanner
                  tone="sky"
                  title="Treasury movements"
                  body={
                    isCashierRole
                      ? 'Same-branch transfers only — each movement debits one till/bank and credits another. Customer receipts and payouts stay on Finance desk.'
                      : 'Internal transfers update both accounts immediately. Cross-branch funding is on Accounting Desk → Inter-branch.'
                  }
                  action={
                    isCashierRole ? (
                      <button
                        type="button"
                        onClick={() => handleAccountTabChange('desk')}
                        className="text-[10px] font-bold uppercase tracking-wide text-zarewa-teal underline-offset-2 hover:underline"
                      >
                        Back to desk
                      </button>
                    ) : null
                  }
                />

                {ws?.hasPermission?.('finance.view') && !isCashierRole ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-[10px] text-slate-600 leading-relaxed">
                    Cross-branch treasury funding on{' '}
                    <Link
                      to="/accounting?tab=interBranch"
                      className="font-semibold text-zarewa-teal hover:underline"
                    >
                      Accounting Desk → Inter-branch
                    </Link>
                    .
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setEditingTransferBatchId('');
                    setTransferForm({
                      fromId: bankAccountsForBranch[0] ? String(bankAccountsForBranch[0].id) : '',
                      toId: bankAccountsForBranch[1]
                        ? String(bankAccountsForBranch[1].id)
                        : bankAccountsForBranch[0]
                          ? String(bankAccountsForBranch[0].id)
                          : '',
                      amountNgn: '',
                      reference: '',
                      dateISO: new Date().toISOString().slice(0, 10),
                    });
                    setShowTransferModal(true);
                  }}
                  className="z-btn-secondary"
                >
                  <ArrowRightLeft size={16} /> New transfer
                </button>
                {movementRows.length === 0 ? (
                  <div className="z-empty-state py-12">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      No internal transfers yet
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {movementRows.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <p className="text-[11px] font-bold text-zarewa-teal truncate min-w-0">
                            <span className="font-mono">{m.id}</span>
                            <span className="font-medium text-slate-600">
                              {' '}
                              · {m.fromName} → {m.toName}
                            </span>
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-black text-zarewa-teal tabular-nums">
                              {formatNgn(m.amountNgn)}
                            </span>
                            {m.isTreasuryTransfer && canEditTreasuryTransfer ? (
                              <button
                                type="button"
                                title="Edit transfer"
                                onClick={() => openEditTreasuryTransfer(m)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-zarewa-teal hover:bg-teal-50 transition-colors"
                                aria-label="Edit transfer"
                              >
                                <Pencil size={12} />
                              </button>
                            ) : null}
                            {m.isTreasuryTransfer && canExecTreasuryDelete ? (
                              <button
                                type="button"
                                title="Delete transfer (Admin, MD, or CEO)"
                                disabled={deletingTransferBatchId === m.id}
                                onClick={() => void deleteTreasuryTransfer(m.id)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50/80 transition-colors disabled:opacity-40"
                                aria-label="Delete transfer"
                              >
                                <Trash2 size={12} strokeWidth={1.65} />
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <p className="text-ui-xs text-slate-500 mt-0.5 tabular-nums">
                          {m.at}
                          {m.displayReference ? ` · ${m.displayReference}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'disbursements' && (
              <div className="space-y-4 animate-in slide-in-from-right-5">
                <FinanceTabContextBanner
                  tone="slate"
                  title="Payment register — posted outflows"
                  body="Read-only audit trail of money that already left treasury. To pay new approved items, use Treasury payout queues or Desk (cashiers). Edit rows here only to correct the debited account."
                />
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 space-y-2">
                  <label className="text-ui-xs font-bold uppercase tracking-wide text-slate-500 block mb-1">
                    Search payment register (this tab)
                  </label>
                  <div className="relative">
                    <Search
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      size={14}
                    />
                    <input
                      type="search"
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[11px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15"
                      placeholder="Movement id, type, account, counterparty, reference, source id…"
                      value={disbursementsSearch}
                      onChange={(e) => setDisbursementsSearch(e.target.value)}
                      autoComplete="off"
                      aria-label="Search payments register"
                    />
                  </div>
                  <p className="text-ui-xs text-slate-500 leading-snug">
                    Search posted debits (refunds, expenses, transport, AP). Officers need KPI approval to reverse or
                    delete. Payout execution is on <strong>Desk</strong> or <strong>Treasury</strong>.
                  </p>
                </div>

                {needsPaymentsMutateSecondApproval ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2.5 space-y-2">
                    <p className="text-[10px] text-amber-950 font-semibold leading-snug">
                      Officer / finance roles: rollout delete and payment-request or refund payout reversal need the KPI
                      gate below. Request an edit approval from a manager for the same expense, payment request, or
                      refund ID, then paste the code.
                    </p>
                    {paymentsApprovalEntity ? (
                      <div className="space-y-1.5">
                        <p className="text-ui-xs font-mono text-slate-800">
                          Target:{' '}
                          <span className="font-bold">{paymentsApprovalEntity.kind}</span> · {paymentsApprovalEntity.id}
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
                      <p className="text-ui-xs text-slate-600 italic">
                        Click <strong>Reverse</strong>, <strong>Delete</strong>, or set pay-from on a row to lock this
                        form to that expense, payment request, or refund.
                      </p>
                    )}
                  </div>
                ) : null}

                <section className="space-y-2">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zarewa-teal">
                        Posted treasury outflows
                      </h3>
                      <p className="text-[10px] text-slate-600 mt-0.5 max-w-3xl leading-snug">
                        Unified register of money leaving bank/cash — purchases, refunds, expense payment requests,
                        transport, AP, and related lines. Sort columns (date, type, description, account, amount,
                        source); <span className="font-semibold text-slate-700">{PAYMENTS_PAGE_SIZE} rows per page</span>
                        . Row actions where supported.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                        {paymentsListWindow.total} line{paymentsListWindow.total === 1 ? '' : 's'}
                        {paymentsListWindow.total > 0
                          ? ` · Showing ${paymentsListWindow.from}–${paymentsListWindow.to}`
                          : ''}
                      </span>
                      <button
                        type="button"
                        disabled={paymentsListWindow.safePage <= 0}
                        onClick={() => setPaymentsTablePage((p) => Math.max(0, p - 1))}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40"
                        aria-label="Previous payments page"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-ui-xs font-bold tabular-nums text-slate-500 min-w-[2.5rem] text-center">
                        {paymentsListWindow.safePage + 1}/{paymentsListWindow.pageCount}
                      </span>
                      <button
                        type="button"
                        disabled={paymentsListWindow.safePage >= paymentsListWindow.pageCount - 1}
                        onClick={() => setPaymentsTablePage((p) => p + 1)}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 disabled:opacity-40"
                        aria-label="Next payments page"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                  <ul className="lg:hidden space-y-2">
                    {paymentsListWindow.slice.map((row, idx) => {
                      const typeLabel = TREASURY_STATEMENT_TYPE_LABEL[row.type] || row.type;
                      const rowOrdinal =
                        paymentsListWindow.total === 0 ? idx + 1 : paymentsListWindow.from + idx;
                      return (
                        <li
                          key={row.movementId || `m-${idx}`}
                          className="rounded-lg border border-slate-200/90 bg-white py-1.5 px-2.5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 tabular-nums">#{rowOrdinal}</p>
                              <p className="text-[10px] font-semibold text-slate-800 line-clamp-2">{row.description}</p>
                              <p className="mt-0.5 text-ui-xs text-slate-500">
                                {String(row.postedAtISO || '').slice(0, 10) || '—'} · {typeLabel}
                              </p>
                              <p className="text-ui-xs text-slate-500 truncate">{row.accountName || '—'}</p>
                            </div>
                            <p className="shrink-0 text-[11px] font-black tabular-nums text-zarewa-teal">
                              {formatNgn(row.amountAbs)}
                            </p>
                          </div>
                          {row.sourceId ? (
                            <p className="mt-2 text-ui-xs font-mono text-slate-500 break-all">{row.sourceId}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm z-scroll-x">
                    <table className="min-w-[920px] w-full text-left text-[10px]">
                      <thead className="bg-slate-50 text-ui-xs font-bold uppercase text-slate-500 tracking-wide border-b border-slate-200">
                        <tr>
                          <th className="px-2 py-2 w-10">#</th>
                          <th className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => togglePaymentsSort('date')}
                              className="inline-flex items-center gap-0.5 hover:text-zarewa-teal"
                            >
                              Date
                              {paymentsTableSortKey === 'date'
                                ? paymentsTableSortDir === 'asc'
                                  ? ' ↑'
                                  : ' ↓'
                                : ''}
                            </button>
                          </th>
                          <th className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => togglePaymentsSort('type')}
                              className="inline-flex items-center gap-0.5 hover:text-zarewa-teal"
                            >
                              Type
                              {paymentsTableSortKey === 'type'
                                ? paymentsTableSortDir === 'asc'
                                  ? ' ↑'
                                  : ' ↓'
                                : ''}
                            </button>
                          </th>
                          <th className="px-2 py-2 min-w-[200px]">
                            <button
                              type="button"
                              onClick={() => togglePaymentsSort('description')}
                              className="inline-flex items-center gap-0.5 hover:text-zarewa-teal text-left"
                            >
                              Description
                              {paymentsTableSortKey === 'description'
                                ? paymentsTableSortDir === 'asc'
                                  ? ' ↑'
                                  : ' ↓'
                                : ''}
                            </button>
                          </th>
                          <th className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => togglePaymentsSort('account')}
                              className="inline-flex items-center gap-0.5 hover:text-zarewa-teal"
                            >
                              Paid from
                              {paymentsTableSortKey === 'account'
                                ? paymentsTableSortDir === 'asc'
                                  ? ' ↑'
                                  : ' ↓'
                                : ''}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => togglePaymentsSort('amount')}
                              className="inline-flex items-center gap-0.5 hover:text-zarewa-teal ml-auto"
                            >
                              Amount
                              {paymentsTableSortKey === 'amount'
                                ? paymentsTableSortDir === 'asc'
                                  ? ' ↑'
                                  : ' ↓'
                                : ''}
                            </button>
                          </th>
                          <th className="px-2 py-2 min-w-[120px]">
                            <button
                              type="button"
                              onClick={() => togglePaymentsSort('source')}
                              className="inline-flex items-center gap-0.5 hover:text-zarewa-teal text-left"
                            >
                              Source
                              {paymentsTableSortKey === 'source'
                                ? paymentsTableSortDir === 'asc'
                                  ? ' ↑'
                                  : ' ↓'
                                : ''}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsListWindow.slice.map((row, idx) => {
                          const pr =
                            row.sourceKind === 'PAYMENT_REQUEST' ? payRequestById[row.sourceId] : null;
                          const ex = row.sourceKind === 'EXPENSE' ? expenseById[row.sourceId] : null;
                          const rf = row.sourceKind === 'REFUND' ? refundById[row.sourceId] : null;
                          const typeLabel = TREASURY_STATEMENT_TYPE_LABEL[row.type] || row.type;
                          const rowOrdinal =
                            paymentsListWindow.total === 0 ? idx + 1 : paymentsListWindow.from + idx;
                          const showPayFrom =
                            canFinanceReceiptSettlement &&
                            ws?.canMutate &&
                            isPayFromCorrectionTreasuryRow(row);
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
                          const showReverse =
                            canReversePaymentRequestTreasury &&
                            ws?.canMutate &&
                            ((row.type === 'PAYMENT_REQUEST_OUT' &&
                              pr &&
                              paidPr > 0 &&
                              isPrPrimary) ||
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
                          return (
                            <tr
                              key={row.movementId || `${idx}`}
                              className="border-b border-slate-100/90 hover:bg-slate-50/80 align-top"
                            >
                              <td className="px-2 py-1.5 text-slate-400 tabular-nums">{rowOrdinal}</td>
                              <td className="px-2 py-1.5 whitespace-nowrap text-slate-700">
                                {String(row.postedAtISO || '').slice(0, 10) || '—'}
                              </td>
                              <td className="px-2 py-1.5">
                                <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-ui-xs font-bold text-slate-700">
                                  {typeLabel}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-slate-800 leading-snug max-w-[280px]">
                                <span className="line-clamp-2" title={row.description}>
                                  {row.description}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-slate-700">{row.accountName || '—'}</td>
                              <td className="px-2 py-1.5 text-right font-bold tabular-nums text-zarewa-teal">
                                {formatNgn(row.amountAbs)}
                              </td>
                              <td className="px-2 py-1.5 font-mono text-ui-xs text-slate-600 break-all">
                                {row.sourceId || '—'}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <div className="flex flex-wrap justify-end gap-1">
                                  {showPayFrom ? (
                                    <button
                                      type="button"
                                      title="Pay-from (bank/cash correction)"
                                      onClick={() => openPayFromEditForTableRow(row)}
                                      className="text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal bg-teal-100 hover:bg-teal-200 px-1.5 py-0.5 rounded"
                                    >
                                      Edit
                                    </button>
                                  ) : null}
                                  {showReverse ? (
                                    <button
                                      type="button"
                                      title={
                                        row.type === 'REFUND_PAYOUT'
                                          ? 'Reverse full treasury payout for this refund'
                                          : 'Reverse full payout for this request'
                                      }
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
                                      className="text-ui-xs font-bold uppercase text-amber-900 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded disabled:opacity-50"
                                    >
                                      {row.type === 'REFUND_PAYOUT'
                                        ? reversingRefundTreasuryPayoutId === row.sourceId
                                          ? '…'
                                          : 'Reverse'
                                        : reversingTreasuryPayoutId === row.sourceId
                                          ? '…'
                                          : 'Reverse'}
                                    </button>
                                  ) : null}
                                  {showDeleteExpenseRow ? (
                                    <button
                                      type="button"
                                      title="Rollout delete expense (linked unpaid requests only)"
                                      disabled={deletingExpenseId === row.sourceId}
                                      onClick={() => void deleteRolloutExpense(row.sourceId)}
                                      className="text-ui-xs font-bold uppercase text-rose-800 bg-rose-100 hover:bg-rose-200 px-1.5 py-0.5 rounded disabled:opacity-50"
                                    >
                                      {deletingExpenseId === row.sourceId ? '…' : 'Del'}
                                    </button>
                                  ) : null}
                                  {showDeletePrRow ? (
                                    <button
                                      type="button"
                                      title="Rollout delete payment request"
                                      disabled={deletingPayRequestId === row.sourceId}
                                      onClick={() => void deleteRolloutPaymentRequest(row.sourceId)}
                                      className="text-ui-xs font-bold uppercase text-rose-800 bg-rose-100 hover:bg-rose-200 px-1.5 py-0.5 rounded disabled:opacity-50"
                                    >
                                      {deletingPayRequestId === row.sourceId ? '…' : 'Del'}
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {paymentsListWindow.total === 0 ? (
                      <p className="text-[10px] text-slate-400 px-3 py-6 text-center border-t border-slate-100">
                        No treasury outflows match this filter (or workspace has no posted payment lines yet).
                      </p>
                    ) : null}
                  </div>
                </section>

                <details className="rounded-lg border border-slate-200/80 bg-white/50 px-3 py-2 group">
                  <summary className="text-[10px] font-bold uppercase tracking-wide text-zarewa-teal cursor-pointer list-none flex items-center gap-2">
                    <span className="group-open:rotate-90 transition-transform text-slate-400">▸</span>
                    Payment request pipeline &amp; expense cards (detail)
                  </summary>
                  <div className="mt-4 space-y-8 border-t border-slate-100 pt-4">
                <section className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zarewa-teal">
                      1) Expenses (posted records)
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Record completed spending entries. New expense requests open from the workspace; approval is in
                      Management or workspace Needs action. After approval, post treasury payout from{' '}
                      <span className="font-semibold text-slate-700">Desk</span> or{' '}
                      <span className="font-semibold text-slate-700">Treasury</span>.
                    </p>
                  </div>
                <ul className="space-y-1.5">
                {disbursementsFilteredExpenses.map((ex) => {
                  const meta2 = [
                    ex.expenseType,
                    ex.category,
                    ex.branchId ? branchNameById[ex.branchId] || ex.branchId : null,
                    `${ex.paymentMethod} · Ref ${ex.reference}`,
                    ex.date,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  const expenseTreasuryOut = treasuryOutflowLinesForExpense(
                    ex.expenseID,
                    liveTreasuryMovements
                  );
                  return (
                  <li
                    key={ex.expenseID}
                    className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm hover:bg-white/70 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 leading-tight flex-1">
                        <p className="text-[11px] font-bold text-zarewa-teal truncate uppercase">{ex.expenseID}</p>
                        <p className="text-ui-xs text-slate-500 mt-0.5 leading-snug line-clamp-2" title={meta2}>
                          {meta2}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <p className="text-[11px] font-black text-zarewa-teal tabular-nums">
                          {formatNgn(ex.amountNgn)}
                        </p>
                        <div className="flex flex-wrap justify-end gap-1">
                          {canFinanceReceiptSettlement && ws?.canMutate && expenseTreasuryOut.length > 0 ? (
                            <button
                              type="button"
                              title="Correct which bank or cash account this expense was paid from"
                              onClick={() => openExpenseOutflowEdit(ex)}
                              className="text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal bg-teal-100 hover:bg-teal-200 px-2 py-1 rounded-md inline-flex items-center gap-1"
                            >
                              <Pencil size={10} aria-hidden />
                              Pay-from
                            </button>
                          ) : null}
                          {canPostExpenseReclass && ws?.canMutate && expenseTreasuryOut.length > 0 ? (
                            <button
                              type="button"
                              title="Reclassify posted expense category (GL adjustment)"
                              onClick={() => openReclassifyExpense(ex)}
                              className="text-ui-xs font-semibold uppercase tracking-wide text-indigo-800 bg-indigo-100 hover:bg-indigo-200 px-2 py-1 rounded-md"
                            >
                              Reclass
                            </button>
                          ) : null}
                          {canDeleteRolloutExpenseOrRequest ? (
                            <button
                              type="button"
                              title="Temporary rollout delete (unpaid links only)"
                              disabled={deletingExpenseId === ex.expenseID}
                              onClick={() => void deleteRolloutExpense(ex.expenseID)}
                              className="text-ui-xs font-bold uppercase tracking-wide text-rose-800 bg-rose-100 hover:bg-rose-200 px-2 py-1 rounded-md disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <Trash2 size={10} aria-hidden />
                              {deletingExpenseId === ex.expenseID ? '…' : 'Delete'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                  );
                })}
                </ul>
                </section>
                <section className="space-y-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zarewa-teal">
                      2) Expense payment requests (pipeline)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pending, submitted, approved (awaiting treasury), and cancelled — same rows as workspace. Approved
                      items with balance due can be paid from here or from Desk / Treasury. Finance may reclassify category
                      on approved, unpaid requests before payout.
                    </p>
                  </div>
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
                    <span className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Queue</span>
                    <button
                      type="button"
                      onClick={() => setDisbursementsPayRequestQueue('all')}
                      className={`text-ui-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${
                        disbursementsPayRequestQueue === 'all'
                          ? 'bg-zarewa-teal text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All ({disbursementsActivePayRequests.length})
                    </button>
                    {!exceptionReportSummary?.shouldAlert ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setDisbursementsPayRequestQueue('exceptions')}
                          className={`text-ui-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${
                            disbursementsPayRequestQueue === 'exceptions'
                              ? 'bg-amber-700 text-white'
                              : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                          }`}
                        >
                          Finance exceptions ({disbursementsExceptionPayRequests.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => void exportExceptionsCsv()}
                          className="text-ui-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        >
                          Export CSV
                        </button>
                      </>
                    ) : null}
                  </div>
                  {disbursementsVisiblePayRequests.length === 0 ? (
                    <p className="text-[10px] text-slate-400 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                      {disbursementsPayRequestQueue === 'exceptions'
                        ? 'No finance exception payment requests match this filter.'
                        : 'No payment requests match this filter.'}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {disbursementsVisiblePayRequests.map((req) => {
                        const paid = Number(req.paidAmountNgn) || 0;
                        const prTreasuryOut = treasuryOutflowLinesForPaymentRequest(
                          req.requestID,
                          liveTreasuryMovements
                        );
                        const meta2 = [
                          req.expenseCategory || null,
                          req.expenseID ? `Expense ${req.expenseID}` : null,
                          req.requestReference ? `Ref ${req.requestReference}` : null,
                          req.branchId ? branchNameById[req.branchId] || req.branchId : null,
                          req.approvalStatus,
                          paid > 0 ? `Paid ${formatNgn(paid)}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <li
                            key={req.requestID}
                            className="rounded-lg border border-slate-200/60 bg-white/50 py-1.5 px-2.5 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 leading-tight flex-1">
                                <p className="text-[11px] font-bold text-zarewa-teal truncate">
                                  <span className="font-mono">{req.requestID}</span>
                                  <span className="font-medium text-slate-600">
                                    {' '}
                                    · {req.description || req.expenseCategory || '—'}
                                  </span>
                                </p>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  {req.expenseCategory || req.expenseCategoryLane ? (
                                    <ExpenseCategoryLaneBadge
                                      category={req.expenseCategory}
                                      laneKey={req.expenseCategoryLane}
                                    />
                                  ) : null}
                                  {req.expenseCategory ? (
                                    <span className="text-ui-xs font-semibold text-slate-600">{req.expenseCategory}</span>
                                  ) : null}
                                </div>
                                <p className="text-ui-xs text-slate-500 mt-0.5 line-clamp-2" title={meta2}>
                                  {meta2}
                                </p>
                                {req.categoryJustification ? (
                                  <p
                                    className="text-ui-xs text-amber-900/90 mt-1 line-clamp-2 italic"
                                    title={req.categoryJustification}
                                  >
                                    Justification: {req.categoryJustification}
                                  </p>
                                ) : null}
                                {['pending', 'submitted'].includes(
                                  String(req.approvalStatus || '').trim().toLowerCase()
                                ) && !canApprovePaymentRequests ? (
                                  <ZareApprovalHint
                                    compact
                                    className="mt-2"
                                    context={{
                                      referenceNo: req.requestID,
                                      documentType: 'payment_request',
                                      status: req.approvalStatus,
                                      canApprove: false,
                                      canMutate: ws?.canMutate !== false,
                                      missingPermission:
                                        'Expense payment requests need finance.approve before treasury payout.',
                                      zareQuery: `Why can't I approve payment request ${req.requestID}?`,
                                    }}
                                  />
                                ) : null}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[11px] font-black text-zarewa-teal tabular-nums">
                                  {formatNgn(Number(req.amountRequestedNgn) || 0)}
                                </span>
                                <div className="flex flex-wrap justify-end gap-1">
                                  {req.approvalStatus === 'Approved' &&
                                  effectiveOutstandingNgn(Number(req.amountRequestedNgn) || 0, paid) > 0 &&
                                  canPayRequests &&
                                  ws?.canMutate ? (
                                    <button
                                      type="button"
                                      onClick={() => openRequestPayment(req)}
                                      className="text-ui-xs font-semibold uppercase tracking-wide text-sky-800 bg-sky-100 hover:bg-sky-200 px-2 py-1 rounded-md"
                                      title="Record treasury payout"
                                    >
                                      Pay
                                    </button>
                                  ) : null}
                                  {req.approvalStatus === 'Approved' &&
                                  paid <= 0 &&
                                  canApprovePaymentRequests &&
                                  ws?.canMutate ? (
                                    <button
                                      type="button"
                                      onClick={() => openReclassifyPaymentRequest(req)}
                                      className="text-ui-xs font-semibold uppercase tracking-wide text-violet-800 bg-violet-100 hover:bg-violet-200 px-2 py-1 rounded-md"
                                      title="Change expense category before treasury payout"
                                    >
                                      Reclassify
                                    </button>
                                  ) : null}
                                  {paid > 0 && canPostExpenseReclass && ws?.canMutate ? (
                                    <button
                                      type="button"
                                      onClick={() => openReclassifyPaymentRequest(req)}
                                      className="text-ui-xs font-semibold uppercase tracking-wide text-indigo-800 bg-indigo-100 hover:bg-indigo-200 px-2 py-1 rounded-md"
                                      title="Reclassify category and post GL adjustment"
                                    >
                                      Reclass (posted)
                                    </button>
                                  ) : null}
                                  {canFinanceReceiptSettlement && ws?.canMutate && prTreasuryOut.length > 0 ? (
                                    <button
                                      type="button"
                                      title="Correct which bank or cash account this payout left from"
                                      onClick={() => openPaymentRequestOutflowEdit(req)}
                                      className="text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal bg-teal-100 hover:bg-teal-200 px-2 py-1 rounded-md inline-flex items-center gap-1"
                                    >
                                      <Pencil size={10} aria-hidden />
                                      Pay-from
                                    </button>
                                  ) : null}
                                  {canReversePaymentRequestTreasury && ws?.canMutate && paid > 0 ? (
                                    <button
                                      type="button"
                                      title="Post compensating treasury credits and reset paid balance (finance.reverse)"
                                      disabled={reversingTreasuryPayoutId === req.requestID}
                                      onClick={() => void reversePaymentRequestTreasuryPayout(req.requestID)}
                                      className="text-ui-xs font-bold uppercase tracking-wide text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md disabled:opacity-50 inline-flex items-center gap-1"
                                    >
                                      <RotateCcw size={10} aria-hidden />
                                      {reversingTreasuryPayoutId === req.requestID ? '…' : 'Reverse payout'}
                                    </button>
                                  ) : null}
                                  {canDeleteRolloutExpenseOrRequest && paid <= 0 ? (
                                    <button
                                      type="button"
                                      title="Temporary rollout delete (no treasury payout)"
                                      disabled={deletingPayRequestId === req.requestID}
                                      onClick={() => void deleteRolloutPaymentRequest(req.requestID)}
                                      className="text-ui-xs font-bold uppercase tracking-wide text-rose-800 bg-rose-100 hover:bg-rose-200 px-2 py-1 rounded-md disabled:opacity-50 inline-flex items-center gap-1"
                                    >
                                      <Trash2 size={10} aria-hidden />
                                      {deletingPayRequestId === req.requestID ? '…' : 'Delete'}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zarewa-teal">
                      Archived rejected expense requests
                    </h3>
                    <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                      {disbursementsArchivedRejectedPayRequests.length} archived
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Rejected requests are hidden from active payout flow and kept here as archived history.
                  </p>
                  {disbursementsArchivedRejectedPayRequests.length === 0 ? (
                    <p className="text-[10px] text-slate-400 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                      No rejected expense requests in archive.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {disbursementsArchivedRejectedPayRequests.map((req) => {
                        const archPaid = Number(req.paidAmountNgn) || 0;
                        const archPrTreasuryOut = treasuryOutflowLinesForPaymentRequest(
                          req.requestID,
                          liveTreasuryMovements
                        );
                        const meta2 = [
                          req.expenseCategory ? req.expenseCategory : null,
                          req.requestReference ? `Ref ${req.requestReference}` : null,
                          req.branchId ? branchNameById[req.branchId] || req.branchId : null,
                          req.requestDate,
                        ]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <li
                            key={req.requestID}
                            className="rounded-lg border border-slate-200/60 bg-slate-50/60 py-1.5 px-2.5 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 leading-tight flex-1">
                                <p className="text-[11px] font-bold text-slate-700 truncate">
                                  <span className="font-mono">{req.requestID}</span>
                                  <span className="font-medium text-slate-500">
                                    {' '}
                                    · {req.description || 'Rejected request'}
                                  </span>
                                </p>
                                <p className="text-ui-xs text-slate-500 mt-0.5 leading-snug line-clamp-2" title={meta2}>
                                  {meta2}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[11px] font-black text-slate-700 tabular-nums">
                                  {formatNgn(Number(req.amountRequestedNgn) || 0)}
                                </span>
                                <div className="flex flex-wrap justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpenseForm({
                                        expenseType: 'Operational — correction entry',
                                        amountNgn: String(Number(req.amountRequestedNgn) || ''),
                                        date: String(req.requestDate || todayIso).slice(0, 10),
                                        category: String(req.expenseCategory || '').trim(),
                                        categoryJustification: String(req.categoryJustification || '').trim(),
                                        paymentMethod: 'Bank Transfer',
                                        debitAccountId: String(bankAccountsForBranch[0]?.id ?? ''),
                                        reference: String(
                                          req.requestReference || req.requestID || 'Correction entry'
                                        ).trim(),
                                      });
                                      setShowExpenseModal(true);
                                    }}
                                    className="text-ui-xs font-semibold uppercase tracking-wide text-sky-800 bg-sky-100 hover:bg-sky-200 px-2 py-1 rounded-md"
                                  >
                                    Correct entry
                                  </button>
                                  {canFinanceReceiptSettlement && ws?.canMutate && archPrTreasuryOut.length > 0 ? (
                                    <button
                                      type="button"
                                      title="Correct which bank or cash account this payout left from"
                                      onClick={() => openPaymentRequestOutflowEdit(req)}
                                      className="text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal bg-teal-100 hover:bg-teal-200 px-2 py-1 rounded-md inline-flex items-center gap-1"
                                    >
                                      <Pencil size={10} aria-hidden />
                                      Pay-from
                                    </button>
                                  ) : null}
                                  {canReversePaymentRequestTreasury && ws?.canMutate && archPaid > 0 ? (
                                    <button
                                      type="button"
                                      title="Post compensating treasury credits and reset paid balance (finance.reverse)"
                                      disabled={reversingTreasuryPayoutId === req.requestID}
                                      onClick={() => void reversePaymentRequestTreasuryPayout(req.requestID)}
                                      className="text-ui-xs font-bold uppercase tracking-wide text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md disabled:opacity-50 inline-flex items-center gap-1"
                                    >
                                      <RotateCcw size={10} aria-hidden />
                                      {reversingTreasuryPayoutId === req.requestID ? '…' : 'Reverse'}
                                    </button>
                                  ) : null}
                                  {canDeleteRolloutExpenseOrRequest &&
                                  (Number(req.paidAmountNgn) || 0) <= 0 ? (
                                    <button
                                      type="button"
                                      title="Temporary rollout delete"
                                      disabled={deletingPayRequestId === req.requestID}
                                      onClick={() => void deleteRolloutPaymentRequest(req.requestID)}
                                      className="text-ui-xs font-bold uppercase tracking-wide text-rose-800 bg-rose-100 hover:bg-rose-200 px-2 py-1 rounded-md disabled:opacity-50 inline-flex items-center gap-0.5"
                                    >
                                      <Trash2 size={10} aria-hidden />
                                      {deletingPayRequestId === req.requestID ? '…' : 'Del'}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
                  </div>
                </details>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-5 animate-in slide-in-from-left-5">
                <FinanceTabContextBanner
                  testId="finance-audit-intro"
                  tone="slate"
                  title="Audit & period close — accountant surface"
                  body="Cashiers do not see this tab. Use it before month-end: reconcile receipts, match bank lines, clear exceptions, and post manual GL journals when needed. Daily payout work stays on Desk/Treasury."
                  action={
                    <button
                      type="button"
                      onClick={() => handleAccountTabChange('receipts')}
                      className="text-[10px] font-bold uppercase tracking-wide text-zarewa-teal underline-offset-2 hover:underline"
                    >
                      Receipts & recon
                    </button>
                  }
                />
                {reconciliationFlags > 0 ? (
                  <div className="flex items-start gap-3 rounded-lg border border-red-200/80 bg-red-50/80 px-3 py-2.5 text-sm text-red-900">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="font-bold">Bank reconciliation exceptions</p>
                      <p className="text-xs text-red-800/90 mt-0.5">
                        {reconciliationFlags} statement line(s) are not matched to ledger entries. Resolve
                        or post adjusting entries.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-3">
                    Audit checklist (period close)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        title: 'Customer receipts',
                        detail: 'Receipts issued for each inflow; tie to quotations & AR.',
                      },
                      {
                        title: 'Supplier payments',
                        detail: 'PO → GRN → invoice → payment; AP balances updated.',
                      },
                      {
                        title: 'Inventory vs COGS',
                        detail: 'Stock movements align with sales and purchase postings.',
                      },
                      {
                        title: 'Cash & bank',
                        detail: 'Till, bank, and POS floats agree with counted / statement balances.',
                      },
                    ].map((row) => (
                      <div
                        key={row.title}
                        className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md p-3 flex gap-3 shadow-sm"
                      >
                        <CheckCircle2 className="shrink-0 text-emerald-500" size={18} />
                        <div>
                          <p className="text-xs font-bold text-gray-800">{row.title}</p>
                          <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{row.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {ws.hasPermission('finance.post') ? (
                  <AccountGlManualJournalCard
                    canPost
                    showToast={showToast}
                    onPosted={() => void ws.refresh()}
                  />
                ) : null}

                <p className="text-[10px] text-slate-600 rounded-lg border border-slate-200/60 bg-slate-50/80 px-3 py-2">
                  Customer receipt settlement is on the{' '}
                  <button
                    type="button"
                    className="font-bold text-teal-800 underline-offset-2 hover:underline"
                    onClick={() => handleAccountTabChange('receipts')}
                  >
                    Receipts &amp; recon
                  </button>{' '}
                  tab.
                </p>

                <div>
                  <h3 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-2">
                    Exception queue (misc receipts)
                  </h3>
                  <p className="text-ui-xs text-slate-500 mb-2 leading-relaxed">
                    Review-only — open Receipts & recon to attach evidence and post clearance. Nothing is auto-cleared
                    from this list.
                  </p>
                  <ul className="space-y-1.5">
                    {auditQueue.map((item) => {
                      const meta2 = [`via ${item.bank}`, item.date, item.desc].filter(Boolean).join(' · ');
                      return (
                      <li
                        key={item.id}
                        className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md py-1.5 px-2.5 shadow-sm hover:bg-white/70 transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0 leading-tight flex-1">
                            <p className="text-[11px] font-bold text-zarewa-teal truncate">{item.customer}</p>
                            <p className="text-ui-xs text-slate-500 mt-0.5 leading-snug line-clamp-2" title={meta2}>
                              {meta2}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-black text-zarewa-teal tabular-nums">
                              ₦{item.amount.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleAccountTabChange('receipts');
                                showToast('Review on Receipts & recon — attach evidence there.', {
                                  variant: 'info',
                                });
                              }}
                              className="text-ui-xs font-bold uppercase px-2 py-1 rounded-md bg-zarewa-teal text-white hover:bg-[#0f3d3a]"
                              title="Open Receipts tab to review"
                            >
                              Review
                            </button>
                          </div>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200/60 bg-white/40 backdrop-blur-md p-4 text-xs text-gray-600 leading-relaxed shadow-sm">
                  <p className="font-black text-zarewa-teal uppercase tracking-wider text-[10px] mb-2">
                    Accounting basis
                  </p>
                  Double-entry posting, accrual recognition, revenue on delivery or billing, and expense
                  matching to the period are the target once the general ledger service is connected.
                  Customer installments (Net 30 / 60) remain tracked on quotations and receipts until
                  fully paid.
                </div>
              </div>
            )}
            </>
  );
}
