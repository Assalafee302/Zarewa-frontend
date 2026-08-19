import React, { useMemo, useState } from "react";

import {
  Banknote,
  Landmark,
  ArrowRightLeft,
  ClipboardList,
  RotateCcw,
  Truck,
  UserRound,
  Wallet,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";

import { formatNgn } from "../../Data/mockData";

import { useWorkspace } from "../../context/WorkspaceContext";

import {
  isReceiptCleared,
  isReceiptPendingClearance,
  liquidityClearanceSplit,
  pendingClearanceTotalNgn,
  receiptClearanceBadgeLabel,
  receiptRegisteredByLabel,
} from "../../lib/receiptClearance";

import {
  enrichReceiptsWithCuttingListMeta,
  receiptLacksCuttingList,
  receiptPaidToBankSummary,
} from "../../lib/salesReceiptsList";

import { SALES_STATUS_CHIP, receiptCuttingListChipClass } from "../../lib/salesStatusUi";

import { approvedRefundsAwaitingPayment, hangingRefundIndicatorsByCustomerId } from "../../lib/refundsStore";

import {
  registerSettlementsAwaitingPayment,
} from "../../lib/registerSettlementPay";

import { effectiveOutstandingNgn } from "../../lib/paymentOutstandingTolerance.js";

import { treasuryAccountsForWorkspace } from "../../lib/treasuryAccountsStore";

import {
  treasuryBookBalanceByAccountId,
  treasuryBookTotalNgn,
  treasuryDeskBalanceSplit,
} from "../../lib/financeDeskTreasury";

import { useFinanceTrialExceptions } from "../../hooks/useFinanceTrialExceptions";

import { FinanceTrialExceptionPanel } from "./FinanceTrialExceptionPanel";

import { userMayViewFinanceTrialExceptionsClient } from "../../lib/financeTrialExceptionsAccess";

import { FinanceKpiCard } from "./FinanceKpiCard";

import { FinanceDeskCashierGuide } from "./FinanceDeskCashierGuide";

import { isCashierRole as userIsCashierRole } from "../../lib/legacyAccountsAccess";

import { FinanceStatusChip } from "./FinanceStatusChip";

import { FinanceTabs } from "./FinanceTabs";

import { FinanceActionButton } from "./FinanceActionButton";

import { FinanceMobileAlertStrip } from "./FinanceMobileAlertStrip";

import { CashierDeskReports } from "./CashierDeskReports";

import { StaffPaymentsCashierPanel } from "./StaffPaymentsCashierPanel";
import { CashierOtPayPanel } from "./CashierOtPayPanel";

import { FinanceDeskTreasuryAccountGrid } from "./FinanceDeskTreasuryAccountGrid";

import { HangingCustomerRefundChip, RefundFundAppliedChip } from "./HangingCustomerRefundHint";
import { refundFundAppliedByQuotationRef } from "../../lib/refundFundApply.js";

import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
  FinanceDeskQueueActionButton,
} from "./FinanceDeskColoredQueuePanel";

import { FinanceTreasuryAwaitingPayoutQueues } from "./FinanceTreasuryAwaitingPayoutQueues";
import { OrphanHaulageDeskPanel } from "./OrphanHaulageDeskPanel";
import {
  findQuotationByRef,
  quotationColourGaugeLabel,
  receiptDateLabel,
} from "../../lib/quotationColourGauge.js";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(iso) {
  return String(iso || "").slice(0, 10) === todayIso();
}

const DESK_SUB_TABS = [
  { id: "work", label: "Work queues" },

  { id: "reports", label: "Reports" },
];

function buildNextActionSummary(parts) {
  const items = parts.filter(Boolean);

  if (!items.length) return null;

  return items.join(" · ");
}

/**

 * Branch cashier daily work queues — embedded in Finance → Desk tab.

 */

export function FinanceDeskWorkQueues({
  onConfirmReceipt,

  onViewReceipt,

  onPayRequest,

  onViewPaymentRequest,

  onPayRefund,

  onCancelRefund,

  onCancelPaymentRequest,

  onPayRegisterSettlement,

  onPayPoTransport,

  onViewPoTransport,

  onReceiveStaffRecovery,

  onReceiveStaffObligation,

  onGoToTab,

  onAccountClick,

  hideAccountGrid = false,
}) {
  const ws = useWorkspace();

  const wsSnapshotTreasuryAccounts = ws?.snapshot?.treasuryAccounts;

  const wsSession = ws?.session;

  const wsBranchScope = ws?.branchScope;

  const wsViewAllBranches = ws?.viewAllBranches;

  const [deskSubTab, setDeskSubTab] = useState("work");

  const [showDetails, setShowDetails] = useState(false);

  const [showAllKpis, setShowAllKpis] = useState(false);

  const [staffPaymentsExpanded, setStaffPaymentsExpanded] = useState(false);

  const receipts = useMemo(
    () => (Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : []),

    [ws?.snapshot?.receipts],
  );

  const cuttingLists = useMemo(
    () => (Array.isArray(ws?.snapshot?.cuttingLists) ? ws.snapshot.cuttingLists : []),
    [ws?.snapshot?.cuttingLists],
  );

  const receiptsWithCuttingMeta = useMemo(
    () => enrichReceiptsWithCuttingListMeta(receipts, cuttingLists),
    [receipts, cuttingLists],
  );

  const treasuryMovements = useMemo(
    () =>
      Array.isArray(ws?.snapshot?.treasuryMovements)
        ? ws.snapshot.treasuryMovements
        : [],

    [ws?.snapshot?.treasuryMovements],
  );

  const treasuryAccounts = useMemo(
    () =>
      treasuryAccountsForWorkspace(
        {
          treasuryAccounts: Array.isArray(wsSnapshotTreasuryAccounts)
            ? wsSnapshotTreasuryAccounts
            : [],

          branchScope: wsBranchScope,
        },

        wsSession,

        { branchScope: wsBranchScope, viewAllBranches: wsViewAllBranches },
      ),

    [wsSnapshotTreasuryAccounts, wsSession, wsBranchScope, wsViewAllBranches],
  );

  const bookById = useMemo(
    () => treasuryBookBalanceByAccountId(treasuryAccounts, treasuryMovements),

    [treasuryAccounts, treasuryMovements],
  );

  const bookTotalNgn = useMemo(
    () => treasuryBookTotalNgn(treasuryAccounts, bookById),

    [treasuryAccounts, bookById],
  );

  const bankDeposits = useMemo(
    () => (Array.isArray(ws?.snapshot?.bankDeposits) ? ws.snapshot.bankDeposits : []),
    [ws?.snapshot?.bankDeposits],
  );

  const deskBalanceSplit = useMemo(
    () =>
      treasuryDeskBalanceSplit({
        accounts: treasuryAccounts,
        movements: treasuryMovements,
        receipts,
        bankDeposits,
        bookById,
      }),
    [treasuryAccounts, treasuryMovements, receipts, bankDeposits, bookById],
  );

  const paymentRequests = useMemo(
    () =>
      Array.isArray(ws?.snapshot?.paymentRequests)
        ? ws.snapshot.paymentRequests
        : [],

    [ws?.snapshot?.paymentRequests],
  );

  const refunds = useMemo(
    () => (Array.isArray(ws?.snapshot?.refunds) ? ws.snapshot.refunds : []),

    [ws?.snapshot?.refunds],
  );

  const ledgerEntries = useMemo(
    () => (Array.isArray(ws?.snapshot?.ledgerEntries) ? ws.snapshot.ledgerEntries : []),

    [ws?.snapshot?.ledgerEntries],
  );

  const hangingRefundByCustomerId = useMemo(
    () => hangingRefundIndicatorsByCustomerId(refunds, ledgerEntries),
    [refunds, ledgerEntries],
  );

  const refundFundByQuote = useMemo(
    () =>
      refundFundAppliedByQuotationRef({
        ledgerEntries,
        refunds,
        applications: Array.isArray(ws?.snapshot?.refundCreditApplications)
          ? ws.snapshot.refundCreditApplications
          : [],
      }),
    [ledgerEntries, refunds, ws?.snapshot?.refundCreditApplications],
  );

  const registerSettlements = useMemo(
    () =>
      Array.isArray(ws?.snapshot?.registerSettlementsAwaitingPayment)
        ? ws.snapshot.registerSettlementsAwaitingPayment
        : [],

    [ws?.snapshot?.registerSettlementsAwaitingPayment],
  );

  const pendingReceipts = useMemo(
    () =>
      receiptsWithCuttingMeta
        .filter((r) => isReceiptPendingClearance(r))
        .slice()
        .sort((a, b) => {
          const aMiss = receiptLacksCuttingList(a) ? 0 : 1;
          const bMiss = receiptLacksCuttingList(b) ? 0 : 1;
          if (aMiss !== bMiss) return aMiss - bMiss;
          return String(b.dateISO || b.date || '').localeCompare(String(a.dateISO || a.date || ''));
        })
        .slice(0, 25),
    [receiptsWithCuttingMeta],
  );

  const pendingReceiptsWithoutCuttingList = useMemo(
    () => pendingReceipts.filter((r) => receiptLacksCuttingList(r)).length,
    [pendingReceipts],
  );

  const confirmedToday = useMemo(
    () =>
      receipts
        .filter((r) => isReceiptCleared(r) && isToday(r.dateISO))
        .slice(0, 15),

    [receipts],
  );

  const approvedPayments = useMemo(
    () =>
      paymentRequests

        .filter((pr) => {
          const st = String(pr.approvalStatus || "").trim();

          if (st !== "Approved") return false;

          const req = Math.round(Number(pr.amountRequestedNgn) || 0);

          const paid = Math.round(Number(pr.paidAmountNgn) || 0);

          return effectiveOutstandingNgn(req, paid) > 0;
        })

        .slice(0, 20),

    [paymentRequests],
  );

  const approvedRefunds = useMemo(
    () => approvedRefundsAwaitingPayment(refunds).slice(0, 15),
    [refunds],
  );

  const approvedRegisterSettlements = useMemo(
    () => registerSettlementsAwaitingPayment(registerSettlements).slice(0, 15),

    [registerSettlements],
  );

  const poTransportAwaiting = useMemo(
    () =>
      (Array.isArray(ws?.snapshot?.poTransportAwaitingTreasury)
        ? ws.snapshot.poTransportAwaitingTreasury
        : []
      )

        .filter((row) => Math.max(0, Number(row.outstandingNgn) || 0) > 0)

        .slice(0, 15),

    [ws?.snapshot?.poTransportAwaitingTreasury],
  );

  const orphanHaulageRows = useMemo(
    () =>
      (Array.isArray(ws?.snapshot?.orphanHaulageTreasuryMovements)
        ? ws.snapshot.orphanHaulageTreasuryMovements
        : []
      ).slice(0, 15),
    [ws?.snapshot?.orphanHaulageTreasuryMovements],
  );

  const staffRecoveriesDue = useMemo(
    () =>
      (Array.isArray(ws?.snapshot?.staffRecoveriesDue)
        ? ws.snapshot.staffRecoveriesDue
        : []
      ).filter(
        (row) => Math.max(0, Number(row.principalOutstandingNgn) || 0) > 0,
      ),

    [ws?.snapshot?.staffRecoveriesDue],
  );

  const staffRecoveriesTotalNgn = useMemo(
    () =>
      staffRecoveriesDue.reduce(
        (s, r) => s + Math.max(0, Number(r.principalOutstandingNgn) || 0),
        0,
      ),

    [staffRecoveriesDue],
  );

  const staffObligationsDue = useMemo(
    () =>
      (Array.isArray(ws?.snapshot?.staffObligationsDue)
        ? ws.snapshot.staffObligationsDue
        : []
      ).filter(
        (row) => Math.max(0, Number(row.principalOutstandingNgn) || 0) > 0,
      ),

    [ws?.snapshot?.staffObligationsDue],
  );

  const staffObligationsTotalNgn = useMemo(
    () =>
      staffObligationsDue.reduce(
        (s, o) => s + Math.max(0, Number(o.principalOutstandingNgn) || 0),
        0,
      ),

    [staffObligationsDue],
  );

  const liquidity = useMemo(
    () => ({
      ...liquidityClearanceSplit(treasuryAccounts, receipts),

      bookTotalNgn,
    }),

    [treasuryAccounts, receipts, bookTotalNgn],
  );

  const payoutQueueCount =
    approvedPayments.length +
    approvedRefunds.length +
    approvedRegisterSettlements.length +
    poTransportAwaiting.length;

  const moneyInQueueCount =
    pendingReceipts.length +
    staffRecoveriesDue.length +
    staffObligationsDue.length;

  const allQueuesClear = payoutQueueCount === 0 && moneyInQueueCount === 0;

  const roleKey = ws?.session?.user?.roleKey;

  const isCashier = userIsCashierRole(roleKey);

  const permissions = ws?.permissions;

  const mayTrialApi = userMayViewFinanceTrialExceptionsClient(
    roleKey,
    permissions,
  );

  const trialBranch = ws.viewAllBranches
    ? null
    : ws.branchScope || ws.session?.currentBranchId;

  const {
    data: trialData,
    loading: trialLoading,
    error: trialError,
    reload: reloadTrial,
  } = useFinanceTrialExceptions({
    branchId: trialBranch,
    enabled: mayTrialApi,
  });

  const trialEx = trialData?.exceptions;

  const nextActionSummary = buildNextActionSummary([
    pendingReceipts.length > 0
      ? `${pendingReceipts.length} receipt${pendingReceipts.length !== 1 ? "s" : ""} to confirm`
      : null,

    payoutQueueCount > 0
      ? `${payoutQueueCount} payout${payoutQueueCount !== 1 ? "s" : ""} to post`
      : null,
  ]);

  const warnings = useMemo(() => {
    const w = [];

    if ((trialEx?.receiptBankAmountMismatch ?? 0) > 0) {
      w.push({ label: "Receipt amount needs attention", tone: "warn" });
    }

    if ((trialEx?.treasuryMovementWithoutFinanceSettlement ?? 0) > 0) {
      w.push({ label: "Treasury movement not settled", tone: "warn" });
    }

    return w;
  }, [trialEx]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {!hideAccountGrid ? (
        <FinanceDeskTreasuryAccountGrid
          accounts={treasuryAccounts}
          bookById={bookById}
          balanceByAccountId={deskBalanceSplit.byAccountId}
          onGoToTab={onAccountClick ? undefined : onGoToTab}
          onAccountClick={onAccountClick}
          cardActionLabel={onAccountClick ? 'View statement' : undefined}
          nextActionSummary={nextActionSummary}
        />
      ) : null}

      {isCashier && deskSubTab === "work" ? (
        <FinanceDeskCashierGuide />
      ) : null}

      <FinanceMobileAlertStrip
        pendingReceipts={pendingReceipts.length}
        approvedPayments={approvedPayments.length}
        approvedRefunds={approvedRefunds.length}
        registerWithdrawals={approvedRegisterSettlements.length}
        poHaulage={poTransportAwaiting.length}
        staffPayments={staffRecoveriesDue.length + staffObligationsDue.length}
        bookTotalNgn={liquidity.bookTotalNgn}
        onOpenStaffPayments={() => setStaffPaymentsExpanded(true)}
      />

      <FinanceTabs
        tabs={DESK_SUB_TABS}
        active={deskSubTab}
        onChange={setDeskSubTab}
      />

      {deskSubTab === "reports" ? (
        <CashierDeskReports
          receipts={receipts}
          paymentRequests={paymentRequests}
          refunds={refunds}
          trialData={trialData}
        />
      ) : null}

      {deskSubTab === "work" ? (
        <>
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              <FinanceKpiCard
                compact
                label="Pending receipts"
                value={
                  trialEx?.pendingReceiptClearance ?? pendingReceipts.length
                }
                hint={formatNgn(pendingClearanceTotalNgn(receipts))}
                tone="amber"
                icon={<Banknote size={14} />}
              />

              <FinanceKpiCard
                compact
                label="Payouts to post"
                value={payoutQueueCount}
                hint={
                  payoutQueueCount
                    ? "Expenses, refunds, withdrawals, haulage"
                    : "None queued"
                }
                tone={payoutQueueCount > 0 ? "amber" : "default"}
                icon={<ClipboardList size={14} />}
              />

              <FinanceKpiCard
                compact
                label="Confirmed today"
                value={
                  trialData?.confirmedReceipts?.today ?? confirmedToday.length
                }
                icon={<CheckCircle2 size={14} />}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAllKpis((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-teal-800"
            >
              {showAllKpis ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
              {showAllKpis ? "Hide" : "Show"} additional metrics
            </button>

            {showAllKpis ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <FinanceKpiCard
                  compact
                  label="Staff payments due"
                  value={staffRecoveriesDue.length + staffObligationsDue.length}
                  hint={
                    staffRecoveriesDue.length + staffObligationsDue.length
                      ? formatNgn(
                          staffRecoveriesTotalNgn + staffObligationsTotalNgn,
                        )
                      : "None due — expand private section when needed"
                  }
                  tone={
                    staffRecoveriesDue.length + staffObligationsDue.length > 0
                      ? "teal"
                      : "default"
                  }
                  icon={<UserRound size={14} />}
                />

                <FinanceKpiCard
                  compact
                  label="Expense requests"
                  value={
                    trialEx?.approvedUnpaidPaymentRequests ??
                    approvedPayments.length
                  }
                />

                <FinanceKpiCard
                  compact
                  label="Refund payouts"
                  value={
                    trialEx?.approvedUnpaidRefunds ?? approvedRefunds.length
                  }
                  tone={approvedRefunds.length > 0 ? "rose" : "default"}
                  icon={<RotateCcw size={14} />}
                />

                <FinanceKpiCard
                  compact
                  label="Register withdrawals"
                  value={approvedRegisterSettlements.length}
                  icon={<Wallet size={14} />}
                />

                <FinanceKpiCard
                  compact
                  label="PO haulage"
                  value={poTransportAwaiting.length}
                  icon={<Truck size={14} />}
                />

                <FinanceKpiCard
                  compact
                  label="Treasury flags"
                  value={
                    trialEx?.treasuryMovementWithoutFinanceSettlement ?? "—"
                  }
                  tone="amber"
                  icon={<Landmark size={14} />}
                />
              </div>
            ) : null}
          </section>

          {warnings.length ? (
            <section className="flex flex-wrap gap-2">
              {warnings.map((w) => (
                <FinanceStatusChip
                  key={w.label}
                  label={w.label}
                  tone={w.tone}
                />
              ))}
            </section>
          ) : null}

          <div
            className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start"
            data-testid={allQueuesClear ? "desk-all-clear" : "desk-confirm-pay-split"}
          >
            <section
              className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-3 scroll-mt-20 sm:p-4"
              data-testid="desk-confirm-column"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">
                  Confirm payment
                </h2>
                <FinanceActionButton variant="link" onClick={() => onGoToTab("receipts")}>
                  View all
                </FinanceActionButton>
              </div>
              {pendingReceipts.length > 0 ? (
                <FinanceDeskColoredQueuePanel
                  sectionId="desk-queue-receipts"
                  theme="amber"
                  title="Confirm payment received"
                  icon={<Banknote size={16} strokeWidth={2} />}
                  count={pendingReceipts.length}
                  description={
                    pendingReceiptsWithoutCuttingList > 0
                      ? `${pendingReceiptsWithoutCuttingList} without a cutting list (listed first).`
                      : undefined
                  }
                >
                  <ul className="space-y-1.5">
                    {pendingReceipts.map((r) => {
                      const hanging = hangingRefundByCustomerId.get(String(r.customerID || "").trim());
                      const refundFund = refundFundByQuote.get(String(r.quotationRef || "").trim());
                      const registeredBy = receiptRegisteredByLabel(r, ledgerEntries);
                      const clearanceMeta = receiptClearanceBadgeLabel(r);
                      const cuttingChipLabel =
                        r._cuttingListLinkKind === "linked" && r._cuttingListId
                          ? `CL ${r._cuttingListId}`
                          : r._cuttingListLabel || "No cutting list";
                      const quoteSpec = quotationColourGaugeLabel(
                        findQuotationByRef(ws?.snapshot?.quotations, r.quotationRef)
                      );
                      const dateLabel = receiptDateLabel(r);
                      const paidToBank = receiptPaidToBankSummary(
                        r,
                        treasuryMovements,
                        treasuryAccounts
                      );
                      return (
                      <FinanceDeskColoredQueueRow
                        key={r.id}
                        theme="amber"
                        title={
                          <>
                            <span className="font-mono">{r.id}</span>

                            <span className="font-medium text-slate-600">
                              {" "}
                              · {r.customer || r.customerID}
                            </span>
                          </>
                        }
                        meta={
                          registeredBy
                            ? `${clearanceMeta} · Registered by ${registeredBy}`
                            : clearanceMeta
                        }
                        extra={
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {dateLabel ? (
                              <span className="text-ui-xs font-semibold tabular-nums text-slate-600">
                                {dateLabel}
                              </span>
                            ) : null}
                            {paidToBank ? (
                              <span
                                className="rounded-md border border-sky-200 bg-sky-50/90 px-1.5 py-0.5 text-[10px] font-semibold text-sky-950"
                                title={`Paid to ${paidToBank}`}
                              >
                                Paid to {paidToBank}
                              </span>
                            ) : null}
                            {quoteSpec ? (
                              <span className="rounded-md border border-slate-200 bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                {quoteSpec}
                              </span>
                            ) : null}
                            <span
                              className={`${SALES_STATUS_CHIP} ${receiptCuttingListChipClass(r._cuttingListLinkKind)} whitespace-nowrap`}
                              title={r._cuttingListTitle || cuttingChipLabel}
                            >
                              {cuttingChipLabel}
                            </span>
                            {hanging ? <HangingCustomerRefundChip indicator={hanging} /> : null}
                            {refundFund ? <RefundFundAppliedChip appliedNgn={refundFund.appliedNgn} /> : null}
                          </div>
                        }
                        amount={formatNgn(r.amountNgn)}
                        actions={
                          <>
                            <FinanceDeskQueueActionButton
                              tone="primary"
                              onClick={() => onConfirmReceipt(r)}
                            >
                              Confirm
                            </FinanceDeskQueueActionButton>

                            {onViewReceipt ? (
                              <FinanceDeskQueueActionButton
                                tone="slate"
                                onClick={() => onViewReceipt(r)}
                              >
                                Receipts tab
                              </FinanceDeskQueueActionButton>
                            ) : null}
                          </>
                        }
                      />
                      );
                    })}
                  </ul>
                </FinanceDeskColoredQueuePanel>
              ) : (
                <p className="py-8 text-center text-xs text-slate-500">No receipts waiting to confirm.</p>
              )}
            </section>

            <FinanceTreasuryAwaitingPayoutQueues
              alwaysShow
              sectionIdPrefix="desk-queue"
              refunds={approvedRefunds}
              paymentRequests={approvedPayments}
              registerSettlements={approvedRegisterSettlements}
              poTransport={poTransportAwaiting}
              poTransportPanelAction={
                onViewPoTransport ? (
                  <FinanceActionButton variant="link" onClick={() => onGoToTab("treasury")}>
                    Treasury list
                  </FinanceActionButton>
                ) : null
              }
              renderRefundActions={(r) => (
                <>
                  <FinanceDeskQueueActionButton tone="sky" onClick={() => onPayRefund(String(r.refundID || ""))}>
                    Payout
                  </FinanceDeskQueueActionButton>
                  {onCancelRefund ? (
                    <FinanceDeskQueueActionButton tone="rose" onClick={() => onCancelRefund(r)}>
                      Cancel
                    </FinanceDeskQueueActionButton>
                  ) : null}
                  <FinanceDeskQueueActionButton tone="slate" to="/sales?tab=refunds">
                    Review
                  </FinanceDeskQueueActionButton>
                </>
              )}
              renderPaymentRequestActions={(req) => (
                <>
                  <FinanceDeskQueueActionButton
                    tone="teal"
                    onClick={() => onPayRequest(String(req.requestID || req.id || ""))}
                  >
                    Payout
                  </FinanceDeskQueueActionButton>
                  {onCancelPaymentRequest ? (
                    <FinanceDeskQueueActionButton tone="rose" onClick={() => onCancelPaymentRequest(req)}>
                      Refuse
                    </FinanceDeskQueueActionButton>
                  ) : null}
                  {onViewPaymentRequest ? (
                    <FinanceDeskQueueActionButton
                      tone="slate"
                      onClick={() => onViewPaymentRequest(String(req.requestID || req.id || ""))}
                    >
                      Register
                    </FinanceDeskQueueActionButton>
                  ) : null}
                </>
              )}
              renderRegisterSettlementActions={(s) =>
                onPayRegisterSettlement ? (
                  <FinanceDeskQueueActionButton
                    tone="teal"
                    onClick={() => onPayRegisterSettlement(String(s.settlementId || ""))}
                  >
                    Payout
                  </FinanceDeskQueueActionButton>
                ) : null
              }
              renderPoTransportActions={(row) => (
                <>
                  <FinanceDeskQueueActionButton tone="sky" onClick={() => onPayPoTransport(row)}>
                    Payout
                  </FinanceDeskQueueActionButton>
                  {onViewPoTransport ? (
                    <FinanceDeskQueueActionButton tone="slate" onClick={() => onViewPoTransport(row)}>
                      Treasury
                    </FinanceDeskQueueActionButton>
                  ) : null}
                </>
              )}
            >
              <OrphanHaulageDeskPanel
                orphanRows={orphanHaulageRows}
                canAccessProcurement={Boolean(ws?.canAccessModule?.("procurement"))}
              />
              <CashierOtPayPanel embedded />
            </FinanceTreasuryAwaitingPayoutQueues>
          </div>

          {(staffRecoveriesDue.length > 0 || staffObligationsDue.length > 0) ? (
            <StaffPaymentsCashierPanel
              recoveries={staffRecoveriesDue}
              obligations={staffObligationsDue}
              onReceiveRecovery={onReceiveStaffRecovery}
              onReceiveObligation={onReceiveStaffObligation}
              expanded={staffPaymentsExpanded}
              onExpandedChange={setStaffPaymentsExpanded}
            />
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-800 mb-1">
              <ArrowRightLeft size={14} />
              Treasury movements
            </h2>
            <p className="text-ui-xs text-slate-600 mb-2 leading-relaxed">
              Lodgements and internal transfers — use the Movements tab.
            </p>

            <FinanceActionButton
              variant="primary"
              onClick={() => onGoToTab("movements")}
            >
              Record treasury movement
            </FinanceActionButton>
          </div>

          {mayTrialApi ? (
            <>
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="text-xs font-bold text-slate-500 hover:text-teal-800"
              >
                {showDetails ? "Hide" : "Show"} supervisor exception details
              </button>

              {showDetails ? (
                <FinanceTrialExceptionPanel
                  variant="cashier"
                  data={trialData}
                  loading={trialLoading}
                  error={trialError}
                  onReload={reloadTrial}
                />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
