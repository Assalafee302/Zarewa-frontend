import React, { useMemo, useState } from "react";

import { Link } from "react-router-dom";

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
} from "../../lib/receiptClearance";

import { approvedRefundsAwaitingPayment } from "../../lib/refundsStore";

import {
  registerSettlementsAwaitingPayment,
} from "../../lib/registerSettlementPay";

import { effectiveOutstandingNgn } from "../../lib/paymentOutstandingTolerance.js";

import { treasuryAccountsForWorkspace } from "../../lib/treasuryAccountsStore";

import {
  treasuryBookBalanceByAccountId,
  treasuryBookTotalNgn,
} from "../../lib/financeDeskTreasury";

import { useFinanceTrialExceptions } from "../../hooks/useFinanceTrialExceptions";

import { FinanceTrialExceptionPanel } from "./FinanceTrialExceptionPanel";

import { userMayViewFinanceTrialExceptionsClient } from "../../lib/financeTrialExceptionsAccess";

import { FinanceKpiCard } from "./FinanceKpiCard";

import { FinanceTrialBanner } from "./FinanceTrialBanner";

import { FinanceDeskCashierGuide } from "./FinanceDeskCashierGuide";

import { isCashierRole as userIsCashierRole } from "../../lib/legacyAccountsAccess";

import { FinanceStatusChip } from "./FinanceStatusChip";

import { FinanceTabs } from "./FinanceTabs";

import { FinanceActionButton } from "./FinanceActionButton";

import { FinanceMobileAlertStrip } from "./FinanceMobileAlertStrip";

import { CashierDeskReports } from "./CashierDeskReports";

import { StaffRecoveryCashierPanel } from "./StaffRecoveryCashierPanel";

import { StaffObligationRepaymentCashierPanel } from "./StaffObligationRepaymentCashierPanel";

import { FinanceDeskLiquidityHeader } from "./FinanceDeskLiquidityHeader";

import { FinanceDeskTreasuryAccountGrid } from "./FinanceDeskTreasuryAccountGrid";

import {
  FinanceDeskColoredQueuePanel,
  FinanceDeskColoredQueueRow,
  FinanceDeskQueueActionButton,
} from "./FinanceDeskColoredQueuePanel";

import { FinanceTreasuryAwaitingPayoutQueues } from "./FinanceTreasuryAwaitingPayoutQueues";

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

  onPayRegisterSettlement,

  onPayPoTransport,

  onViewPoTransport,

  onReceiveStaffRecovery,

  onReceiveStaffObligation,

  onGoToTab,
}) {
  const ws = useWorkspace();

  const wsSnapshotTreasuryAccounts = ws?.snapshot?.treasuryAccounts;

  const wsSession = ws?.session;

  const wsBranchScope = ws?.branchScope;

  const wsViewAllBranches = ws?.viewAllBranches;

  const [deskSubTab, setDeskSubTab] = useState("work");

  const [showDetails, setShowDetails] = useState(false);

  const [showAllKpis, setShowAllKpis] = useState(false);

  const receipts = useMemo(
    () => (Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : []),

    [ws?.snapshot?.receipts],
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

  const registerSettlements = useMemo(
    () =>
      Array.isArray(ws?.snapshot?.registerSettlementsAwaitingPayment)
        ? ws.snapshot.registerSettlementsAwaitingPayment
        : [],

    [ws?.snapshot?.registerSettlementsAwaitingPayment],
  );

  const pendingReceipts = useMemo(
    () => receipts.filter((r) => isReceiptPendingClearance(r)).slice(0, 25),

    [receipts],
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

  const creditTrial = trialData?.creditExceptions;

  const branchLabel = ws.viewAllBranches
    ? "All branches"
    : ws.branchLabel || ws.branchScope || "";

  const nextActionSummary = buildNextActionSummary([
    pendingReceipts.length > 0
      ? `${pendingReceipts.length} receipt${pendingReceipts.length !== 1 ? "s" : ""} to confirm`
      : null,

    payoutQueueCount > 0
      ? `${payoutQueueCount} payout${payoutQueueCount !== 1 ? "s" : ""} to post`
      : null,

    staffRecoveriesDue.length + staffObligationsDue.length > 0
      ? `${staffRecoveriesDue.length + staffObligationsDue.length} staff payment${staffRecoveriesDue.length + staffObligationsDue.length !== 1 ? "s" : ""} to collect`
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

    if ((creditTrial?.deliveriesWarningNoCreditCount ?? 0) > 0) {
      w.push({
        label: "Deliveries waiting on payment or credit",
        tone: "warn",
      });
    }

    return w;
  }, [trialEx, creditTrial]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {branchLabel ? (
        <p className="text-[11px] text-slate-600 leading-relaxed rounded-xl border border-teal-200/70 bg-teal-50/50 px-4 py-3">
          <strong className="text-[#134e4a]">{branchLabel}</strong> cashier desk
          — your payout home. Confirm receipts, receive staff payments, and post
          approved expense, refund, and haulage payouts here. Supplier payments
          stay on Procurement.
        </p>
      ) : null}

      {isCashier && deskSubTab === "work" ? (
        <FinanceDeskCashierGuide onGoToTab={onGoToTab} />
      ) : null}

      <FinanceTrialBanner>
        Exception counts are visible to supervisors — use the work queues below
        for daily tasks.
      </FinanceTrialBanner>

      <FinanceMobileAlertStrip
        pendingReceipts={pendingReceipts.length}
        approvedPayments={approvedPayments.length}
        approvedRefunds={approvedRefunds.length}
        registerWithdrawals={approvedRegisterSettlements.length}
        poHaulage={poTransportAwaiting.length}
        staffRecoveries={staffRecoveriesDue.length}
        staffObligations={staffObligationsDue.length}
        bookTotalNgn={liquidity.bookTotalNgn}
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
          <FinanceDeskLiquidityHeader
            bookTotalNgn={liquidity.bookTotalNgn}
            pendingClearanceNgn={liquidity.pendingClearanceNgn}
            clearedBookNgn={liquidity.clearedBookNgn}
            nextActionSummary={nextActionSummary}
          />

          <FinanceDeskTreasuryAccountGrid
            accounts={treasuryAccounts}
            bookById={bookById}
            onGoToTab={onGoToTab}
          />

          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <FinanceKpiCard
                label="Pending receipts"
                value={
                  trialEx?.pendingReceiptClearance ?? pendingReceipts.length
                }
                hint={formatNgn(pendingClearanceTotalNgn(receipts))}
                tone="amber"
                icon={<Banknote size={14} />}
              />

              <FinanceKpiCard
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
                label="Staff payments to collect"
                value={staffRecoveriesDue.length + staffObligationsDue.length}
                hint={
                  staffRecoveriesDue.length + staffObligationsDue.length
                    ? formatNgn(
                        staffRecoveriesTotalNgn + staffObligationsTotalNgn,
                      )
                    : "None due"
                }
                tone={
                  staffRecoveriesDue.length + staffObligationsDue.length > 0
                    ? "teal"
                    : "default"
                }
                icon={<UserRound size={14} />}
              />

              <FinanceKpiCard
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
                  label="Expense requests"
                  value={
                    trialEx?.approvedUnpaidPaymentRequests ??
                    approvedPayments.length
                  }
                />

                <FinanceKpiCard
                  label="Refund payouts"
                  value={
                    trialEx?.approvedUnpaidRefunds ?? approvedRefunds.length
                  }
                  tone={approvedRefunds.length > 0 ? "rose" : "default"}
                  icon={<RotateCcw size={14} />}
                />

                <FinanceKpiCard
                  label="Register withdrawals"
                  value={approvedRegisterSettlements.length}
                  icon={<Wallet size={14} />}
                />

                <FinanceKpiCard
                  label="PO haulage"
                  value={poTransportAwaiting.length}
                  icon={<Truck size={14} />}
                />

                <FinanceKpiCard
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

          {allQueuesClear ? (
            <div
              data-testid="desk-all-clear"
              className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-5 py-6 text-center"
            >
              <CheckCircle2
                size={28}
                className="mx-auto text-emerald-700 mb-2"
                aria-hidden
              />

              <p className="text-sm font-black text-emerald-950">
                All daily queues clear
              </p>

              <p className="text-xs text-emerald-900/80 mt-1 max-w-md mx-auto leading-relaxed">
                No receipts, payouts, or staff collections waiting. Review
                treasury balances above or record a movement below.
              </p>
            </div>
          ) : null}

          {pendingReceipts.length > 0 ? (
            <FinanceDeskColoredQueuePanel
              sectionId="desk-queue-receipts"
              theme="amber"
              title="Confirm payment received"
              icon={<Banknote size={16} strokeWidth={2} />}
              count={pendingReceipts.length}
              description="Sales recorded these payments — confirm bank or cash landed before cleared balances and refunds."
              action={
                <FinanceActionButton
                  variant="link"
                  onClick={() => onGoToTab("receipts")}
                >
                  View all
                </FinanceActionButton>
              }
            >
              <ul className="space-y-1.5">
                {pendingReceipts.map((r) => (
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
                    meta={receiptClearanceBadgeLabel(r)}
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
                ))}
              </ul>
            </FinanceDeskColoredQueuePanel>
          ) : null}

          {staffRecoveriesDue.length > 0 ? (
            <div id="desk-queue-staff-recovery" className="scroll-mt-20">
              <StaffRecoveryCashierPanel
                recoveries={staffRecoveriesDue}
                onReceive={onReceiveStaffRecovery}
              />
            </div>
          ) : null}

          {staffObligationsDue.length > 0 ? (
            <div id="desk-queue-staff-obligations" className="scroll-mt-20">
              <StaffObligationRepaymentCashierPanel
                obligations={staffObligationsDue}
                onReceive={onReceiveStaffObligation}
              />
            </div>
          ) : null}

          <FinanceTreasuryAwaitingPayoutQueues
            sectionIdPrefix="desk-queue"
            refunds={approvedRefunds}
            paymentRequests={approvedPayments}
            registerSettlements={approvedRegisterSettlements}
            poTransport={poTransportAwaiting}
            expensePanelDescription="Managers approved these expense requests — record bank or cash payout from the correct treasury account."
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
                  Record pay
                </FinanceDeskQueueActionButton>
                {onViewPoTransport ? (
                  <FinanceDeskQueueActionButton tone="slate" onClick={() => onViewPoTransport(row)}>
                    Treasury
                  </FinanceDeskQueueActionButton>
                ) : null}
              </>
            )}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 mb-2">
              <ArrowRightLeft size={16} />
              Treasury movements
            </h2>

            <p className="text-sm font-medium text-slate-600 mb-3">
              Lodgements and internal transfers are recorded on the Movements
              tab.
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

      <p className="border-t border-slate-200 pt-4 text-xs font-medium text-slate-500">
        Company accounting controls live on{" "}
        <Link
          to="/accounting"
          className="font-bold text-teal-800 hover:underline"
        >
          Accounting Desk
        </Link>{" "}
        — branch cashiers do not use that desk.
      </p>
    </div>
  );
}
