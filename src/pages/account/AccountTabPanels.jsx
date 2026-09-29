import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  AlertCircle,
  RefreshCw,
  Printer,
  CheckCircle2,
  Undo2,
} from 'lucide-react';

import { formatNgn } from '../../Data/mockData';
import { FinanceCashierPayoutsPanel } from '../../components/finance/FinanceCashierPayoutsPanel.jsx';
import { FinancePostedOutflowsPanel } from '../../components/finance/FinancePostedOutflowsPanel.jsx';
import { FinanceDeskWorkQueues } from '../../components/finance/FinanceDeskWorkQueues.jsx';
import { FinancePartialQuotesPanel } from '../../components/finance/FinancePartialQuotesPanel.jsx';
import { FinanceDepositQuoteMatchPanel } from '../../components/finance/FinanceDepositQuoteMatchPanel.jsx';
import { FinanceReceiptsClearanceTable } from '../../components/finance/FinanceReceiptsClearanceTable.jsx';
import { FinanceTabContextBanner } from '../../components/finance/FinanceTabContextBanner.jsx';
import { FinanceReceiptsWorkflowStrip } from '../../components/finance/FinanceReceiptsWorkflowStrip.jsx';
import { FinanceTransfersPanel } from '../../components/finance/FinanceTransfersPanel.jsx';
import { CashierEndOfDayPanel } from '../../components/finance/CashierEndOfDayPanel.jsx';
import { AccountingRegisterHeader } from '../../components/finance/accounting/AccountingRegisterLayout.jsx';
import { FinanceTreasuryManageAccountsPanel } from '../../components/finance/FinanceTreasuryManageAccountsPanel.jsx';
import { AccountBankReconciliationPanel } from '../../components/account/AccountBankReconciliationPanel.jsx';
import { RegisterBankDepositPanel } from '../../components/finance/RegisterBankDepositPanel.jsx';
import { BankDepositExceptionPanel } from '../../components/finance/BankDepositExceptionPanel.jsx';
import { AccountGlManualJournalCard } from '../../components/account/AccountGlManualJournalCard.jsx';
import { hangingRefundIndicatorsByCustomerId } from '../../lib/refundsStore.js';
import { refundFundAppliedByQuotationRef } from '../../lib/refundFundApply.js';
import {
  treasuryBookBalanceByAccountId,
  treasuryDeskBalanceSplit,
} from '../../lib/financeDeskTreasury.js';
import { useAccountPage } from './AccountPageContext.jsx';
import { isLocalGlEnabled } from '../../lib/accountingPolicyFlags.js';
import { paymentConfirmQueueRowAmountNgn } from '../../shared/lib/receiptPaymentConfirmQueue.js';

function receiptClearanceRowKey(r) {
  return r?._confirmKind === 'payment_split'
    ? `${r._parentReceiptId}:${r._movementId}`
    : r?.id;
}

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
    canEditTreasuryTransfer,
    canExecTreasuryDelete,
    canFinanceReceiptSettlement,
    canManageTreasury,
    deleteTreasuryTransfer,
    deletingTransferBatchId,
    filteredBankAccounts,
    filteredSalesReceipts,
    handleAccountTabChange,
    handleDeskCancelRefund,
    handleDeskCancelPaymentRequest,
    handleDeskConfirmReceipt,
    handleDeskAcknowledgePurchasePayment,
    handleDeskPayPoTransport,
    handleDeskPayRefund,
    handleDeskViewRefund,
    handleDeskReverseRefundCredit,
    handleDeskPayRegisterSettlement,
    handleDeskPayRequest,
    handleDeskReceiveStaffObligation,
    handleDeskReceiveStaffRecovery,
    handleDeskViewPaymentRequest,
    handleDeskViewPoTransport,
    handleDeskViewReceipt,
    isAdminRole,
    isCashierRole,
    liveQuotations,
    liveLedgerEntries,
    liveReceipts,
    liveTreasuryMovements,
    movementRows,
    openBankDepositsCount,
    openEditTreasuryAccount,
    openEditTreasuryTransfer,
    openReceiptFinance,
    openUnreconciledReceiptsPrint,
    receiptsListWindow,
    receiptsPendingClearanceNgn,
    receiptsNoCuttingListOnly,
    receiptsWithoutCuttingListCount,
    receiptsSortDir,
    receiptsSortKey,
    receiptsTableSearch,
    reconciliationFlags,
    refundById,
    removeTreasuryAccount,
    runAdminReapplyFinanceReconciledReceipts,
    searchQuery,
    setBulkUnconfirmReceiptsOpen,
    setConfirmedReceiptsPage,
    setEditingTransferBatchId,
    setReceiptsNoCuttingListOnly,
    setReceiptsSortDir,
    setReceiptsSortKey,
    setReceiptsTableSearch,
    setShowTransferModal,
    setStatementAccount,
    setTransferForm,
    setWaitingReceiptsPage,
    showAllTreasuryInTab,
    showToast,
    sortedFilteredSalesReceipts,
    treasuryBookDisplayNgn,
    waitingReceiptsListWindow,
    workspaceBranchId,
    workspaceBranchLabel,
    ws,
  } = useAccountPage();

  const hangingRefundByCustomerId = useMemo(
    () => hangingRefundIndicatorsByCustomerId(Object.values(refundById || {}), liveLedgerEntries),
    [refundById, liveLedgerEntries]
  );

  const refundFundByQuote = useMemo(
    () =>
      refundFundAppliedByQuotationRef({
        ledgerEntries: liveLedgerEntries,
        refunds: Object.values(refundById || {}),
        applications: Array.isArray(ws?.snapshot?.refundCreditApplications)
          ? ws.snapshot.refundCreditApplications
          : [],
      }),
    [liveLedgerEntries, refundById, ws?.snapshot?.refundCreditApplications]
  );

  const deskAccountBalanceSplit = useMemo(() => {
    const bookById = treasuryBookBalanceByAccountId(filteredBankAccounts, liveTreasuryMovements);
    return treasuryDeskBalanceSplit({
      accounts: filteredBankAccounts,
      movements: liveTreasuryMovements,
      receipts: liveReceipts,
      bankDeposits: Array.isArray(ws?.snapshot?.bankDeposits) ? ws.snapshot.bankDeposits : [],
      bookById,
    });
  }, [filteredBankAccounts, liveTreasuryMovements, liveReceipts, ws?.snapshot?.bankDeposits]);

  const [receiptsViewMode, setReceiptsViewMode] = useState('pending');
  const [selectedReceiptsByKey, setSelectedReceiptsByKey] = useState({});

  const selectedReceiptEntries = useMemo(
    () => Object.entries(selectedReceiptsByKey).filter(([, row]) => row),
    [selectedReceiptsByKey]
  );
  const selectedReceiptIds = useMemo(
    () => selectedReceiptEntries.map(([key]) => key),
    [selectedReceiptEntries]
  );
  const selectedReceiptsNgn = useMemo(
    () =>
      selectedReceiptEntries.reduce(
        (sum, [, row]) => sum + paymentConfirmQueueRowAmountNgn(row),
        0
      ),
    [selectedReceiptEntries]
  );

  const handleToggleSelectReceipt = (rowKey, receipt) => {
    setSelectedReceiptsByKey((prev) => {
      if (prev[rowKey]) {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      }
      return { ...prev, [rowKey]: receipt };
    });
  };

  const handleSelectAllReceipts = (slice, select) => {
    setSelectedReceiptsByKey((prev) => {
      const next = { ...prev };
      for (const r of slice || []) {
        const key = receiptClearanceRowKey(r);
        if (!key) continue;
        if (select) next[key] = r;
        else delete next[key];
      }
      return next;
    });
  };

  const handleReceiptsViewMode = (mode) => {
    setReceiptsViewMode(mode);
    setSelectedReceiptsByKey({});
  };

  const handleConfirmSelectedReceipts = () => {
    const first = selectedReceiptEntries[0]?.[1];
    if (!first || !openReceiptFinance) return;
    openReceiptFinance(first, first._movementId || null);
    const key = selectedReceiptEntries[0][0];
    setSelectedReceiptsByKey((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
            <>
            {activeTab === 'desk' && (
              <>
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
                    balanceByAccountId={deskAccountBalanceSplit.byAccountId}
                  />
                ) : null}
                <FinanceDeskWorkQueues
                  onConfirmReceipt={handleDeskConfirmReceipt}
                  onAcknowledgePurchasePayment={handleDeskAcknowledgePurchasePayment}
                  onViewReceipt={handleDeskViewReceipt}
                  onPayRequest={handleDeskPayRequest}
                  onViewPaymentRequest={handleDeskViewPaymentRequest}
                  onPayRefund={handleDeskPayRefund}
                  onViewRefund={handleDeskViewRefund}
                  onCancelRefund={handleDeskCancelRefund}
                  onCancelPaymentRequest={handleDeskCancelPaymentRequest}
                  onPayRegisterSettlement={handleDeskPayRegisterSettlement}
                  onPayPoTransport={handleDeskPayPoTransport}
                  onViewPoTransport={handleDeskViewPoTransport}
                  onReceiveStaffRecovery={handleDeskReceiveStaffRecovery}
                  onReceiveStaffObligation={handleDeskReceiveStaffObligation}
                  onReverseRefundCredit={handleDeskReverseRefundCredit}
                  onGoToTab={handleAccountTabChange}
                  onAccountClick={canManageTreasury ? undefined : setStatementAccount}
                  hideAccountGrid={canManageTreasury}
                  searchQuery={searchQuery}
                />
                {isCashierRole ? (
                  <div className="pt-2">
                    <CashierEndOfDayPanel onGoToTab={handleAccountTabChange} />
                  </div>
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
                        className="text-ui-xs font-bold uppercase tracking-wide text-white bg-zarewa-teal hover:brightness-110 px-3 py-1.5 rounded-lg"
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
                <FinancePartialQuotesPanel />
                <FinanceDepositQuoteMatchPanel />
                <section className="space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zarewa-teal">
                        Receipts confirmation & reconciliation
                      </h3>
                      <p className="text-ui-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                        Confirm sales receipts, register unknown bank inflows, then match daily bank lines.
                      </p>
                    </div>
                  </div>
                  {filteredSalesReceipts.length === 0 ? (
                    <p className="text-ui-xs text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-lg">
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
                              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-ui-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15"
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
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-ui-xs font-semibold text-zarewa-teal outline-none focus:ring-2 focus:ring-zarewa-teal/15"
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
                            onClick={() => setReceiptsNoCuttingListOnly((v) => !v)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-ui-xs font-black uppercase tracking-wide transition-colors ${
                              receiptsNoCuttingListOnly
                                ? 'border-amber-400 bg-amber-100 text-amber-950'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-900'
                            }`}
                            title="Show only payments whose quotation has no cutting list yet"
                            aria-pressed={receiptsNoCuttingListOnly}
                          >
                            No cutting list
                            <span className="tabular-nums opacity-80">({receiptsWithoutCuttingListCount})</span>
                          </button>
                          <button
                            type="button"
                            onClick={openUnreconciledReceiptsPrint}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-ui-xs font-black uppercase tracking-wide text-amber-900 hover:bg-amber-100"
                            title="Print receipts pending confirmation and quotations that still have a balance"
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
                          {canApprovePaymentRequests ? (
                            <button
                              type="button"
                              disabled={!ws?.canMutate || Boolean(ws?.viewAllBranches)}
                              onClick={() => setBulkUnconfirmReceiptsOpen(true)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-ui-xs font-black uppercase tracking-wide text-rose-950 hover:bg-rose-100 disabled:opacity-50"
                              title={
                                ws?.viewAllBranches
                                  ? 'Switch to a single branch workspace before bulk-unconfirming receipts'
                                  : 'Unconfirm all confirmed receipts for a chosen month in this branch so Finance can reconfirm them'
                              }
                            >
                              <Undo2 size={12} />
                              Bulk unconfirm month
                            </button>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <div
                            className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5"
                            role="tablist"
                            aria-label="Receipts view"
                          >
                            {[
                              {
                                id: 'pending',
                                label: 'Pending',
                                count: waitingReceiptsListWindow.total,
                              },
                              {
                                id: 'confirmed',
                                label: 'Confirmed',
                                count: receiptsListWindow.total,
                              },
                              { id: 'both', label: 'Both', count: null },
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={receiptsViewMode === tab.id}
                                onClick={() => handleReceiptsViewMode(tab.id)}
                                className={`rounded-md px-2 py-1 text-ui-xs font-black uppercase tracking-wide transition ${
                                  receiptsViewMode === tab.id
                                    ? 'bg-zarewa-teal text-white'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {tab.label}
                                {tab.count != null ? (
                                  <span className="ml-1 tabular-nums opacity-80">({tab.count})</span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                          <div className="text-ui-xs text-slate-600 tabular-nums">
                            {sortedFilteredSalesReceipts.length} receipt
                            {sortedFilteredSalesReceipts.length !== 1 ? 's' : ''} in view
                          </div>
                        </div>
                      </div>
                      {selectedReceiptIds.length > 0 && canFinanceReceiptSettlement && ws?.canMutate ? (
                        <div className="sticky bottom-2 z-20 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50/95 px-3 py-2 shadow-sm">
                          <p className="text-ui-xs font-semibold text-teal-950">
                            {selectedReceiptIds.length} selected
                            <span className="ml-1.5 font-black tabular-nums">{formatNgn(selectedReceiptsNgn)}</span>
                            <span className="ml-1 font-medium text-teal-800/80">
                              — confirm one at a time so till and bank stay correct
                            </span>
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptsByKey({})}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-ui-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmSelectedReceipts}
                              className="rounded-lg bg-zarewa-teal px-2.5 py-1 text-ui-xs font-black uppercase tracking-wide text-white hover:brightness-110"
                            >
                              Confirm next
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <div className="grid min-w-0 grid-cols-1 gap-3">
                      {receiptsViewMode !== 'confirmed' ? (
                      <FinanceReceiptsClearanceTable
                        tone="amber"
                        title="Pending clearance"
                        description="Sales recorded these payments — Finance must confirm bank/cash before refunds and cleared balances."
                        listWindow={waitingReceiptsListWindow}
                        onPrev={() => setWaitingReceiptsPage((p) => Math.max(0, p - 1))}
                        onNext={() => setWaitingReceiptsPage((p) => p + 1)}
                        emptyMessage={
                          receiptsNoCuttingListOnly
                            ? 'No waiting receipts without a cutting list.'
                            : 'No waiting receipts.'
                        }
                        quotations={liveQuotations}
                        liveTreasuryMovements={liveTreasuryMovements}
                        liveLedgerEntries={liveLedgerEntries}
                        hangingRefundByCustomerId={hangingRefundByCustomerId}
                        refundFundByQuote={refundFundByQuote}
                        canConfirm={Boolean(canFinanceReceiptSettlement && ws?.canMutate)}
                        onConfirm={openReceiptFinance}
                        confirmLabel="Confirm"
                        selectedReceiptIds={selectedReceiptIds}
                        onToggleSelect={
                          canFinanceReceiptSettlement && ws?.canMutate
                            ? handleToggleSelectReceipt
                            : undefined
                        }
                        onSelectAll={handleSelectAllReceipts}
                      />
                      ) : null}
                      {receiptsViewMode !== 'pending' ? (
                      <FinanceReceiptsClearanceTable
                        tone="emerald"
                        title="Confirmed"
                        description="Receipts already confirmed and reconciled by finance. Open to revise amounts or unconfirm a mistaken confirmation."
                        listWindow={receiptsListWindow}
                        onPrev={() => setConfirmedReceiptsPage((p) => Math.max(0, p - 1))}
                        onNext={() => setConfirmedReceiptsPage((p) => p + 1)}
                        emptyMessage={
                          receiptsNoCuttingListOnly
                            ? 'No confirmed receipts without a cutting list.'
                            : 'No confirmed receipts yet.'
                        }
                        quotations={liveQuotations}
                        liveTreasuryMovements={liveTreasuryMovements}
                        liveLedgerEntries={liveLedgerEntries}
                        hangingRefundByCustomerId={hangingRefundByCustomerId}
                        refundFundByQuote={refundFundByQuote}
                        canConfirm={Boolean(canFinanceReceiptSettlement && ws?.canMutate)}
                        onConfirm={openReceiptFinance}
                        confirmLabel={(r) => (r.financeReconciliationSavedAtISO ? 'Revise' : 'Confirm')}
                      />
                      ) : null}
                      </div>
                    </>
                  )}

                      {ws?.hasPermission?.('finance.view') || isCashierRole ? (
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

                      {ws?.hasPermission?.('finance.view') || isCashierRole ? (
                        <section className="space-y-3 border-t border-slate-200/80 pt-6">
                          <div>
                            <h3 className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal">
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
                        className="text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal underline-offset-2 hover:underline"
                      >
                        Back to desk
                      </button>
                    ) : null
                  }
                />

                {ws?.hasPermission?.('finance.view') && !isCashierRole ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-ui-xs text-slate-600 leading-relaxed">
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

                <FinanceTransfersPanel
                  movementRows={movementRows}
                  canEdit={canEditTreasuryTransfer}
                  canDelete={canExecTreasuryDelete}
                  deletingBatchId={deletingTransferBatchId}
                  onEditTransfer={openEditTreasuryTransfer}
                  onDeleteTransfer={(id) => void deleteTreasuryTransfer(id)}
                  onNewTransfer={() => {
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
                />
              </div>
            )}

            {activeTab === 'disbursements' && (
              isCashierRole ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <AccountingRegisterHeader
                    title="Payment register"
                    subtitle="Ready cash, holds, and age sit above the queue. Search, filter by type, and sort before you pay. Paid confirms what already left the till or bank."
                    actions={
                      <button
                        type="button"
                        className="z-btn-secondary text-xs"
                        onClick={() => handleAccountTabChange('desk')}
                      >
                        Open desk
                      </button>
                    }
                  />
                  <FinanceCashierPayoutsPanel />
                </div>
              ) : (
                <FinancePostedOutflowsPanel />
              )
            )}

            {activeTab === 'audit' && (
              <div className="space-y-5 animate-in slide-in-from-left-5">
                <FinanceTabContextBanner
                  testId="finance-audit-intro"
                  tone="slate"
                  title="Audit & period close — accountant surface"
                  body={
                    isLocalGlEnabled(ws?.snapshot)
                      ? 'Cashiers do not see this tab. Use it before month-end: reconcile receipts, match bank lines, clear exceptions, and post manual GL journals when needed. Daily payout work stays on Desk/Treasury.'
                      : 'Cashiers do not see this tab. Use it to reconcile receipts, match bank lines, and clear exceptions. Daily payout work stays on Desk/Treasury.'
                  }
                  action={
                    <button
                      type="button"
                      onClick={() => handleAccountTabChange('receipts')}
                      className="text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal underline-offset-2 hover:underline"
                    >
                      Receipts & bank reconciliation
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
                          <p className="text-ui-xs text-gray-500 mt-1 leading-relaxed">{row.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {ws.hasPermission('finance.post') && isLocalGlEnabled(ws?.snapshot) ? (
                  <AccountGlManualJournalCard
                    canPost
                    showToast={showToast}
                    onPosted={() => void ws.refreshDomain?.('finance')}
                  />
                ) : null}

                <p className="text-ui-xs text-slate-600 rounded-lg border border-slate-200/60 bg-slate-50/80 px-3 py-2">
                  Customer receipt settlement is on the{' '}
                  <button
                    type="button"
                    className="font-bold text-teal-800 underline-offset-2 hover:underline"
                    onClick={() => handleAccountTabChange('receipts')}
                  >
                    Receipts &amp; bank reconciliation
                  </button>{' '}
                  tab.
                </p>

                <div>
                  <h3 className="text-xs font-bold text-zarewa-teal uppercase tracking-widest mb-2">
                    Exception queue (misc receipts)
                  </h3>
                  <p className="text-ui-xs text-slate-500 mb-2 leading-relaxed">
                    Review-only — open Receipts & bank reconciliation to attach evidence and post clearance. Nothing is auto-cleared
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
                                showToast('Review on Receipts & bank reconciliation — attach evidence there.', {
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
                  <p className="font-black text-zarewa-teal uppercase tracking-wider text-ui-xs mb-2">
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
