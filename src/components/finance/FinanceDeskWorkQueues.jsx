import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Landmark, ArrowRightLeft, ClipboardList, RotateCcw, Truck, UserRound, Wallet } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  isReceiptCleared,
  isReceiptPendingClearance,
  liquidityClearanceSplit,
  pendingClearanceTotalNgn,
  receiptClearanceBadgeLabel,
} from '../../lib/receiptClearance';
import { approvedRefundsAwaitingPayment } from '../../lib/refundsStore';
import { registerSettlementsAwaitingPayment, registerSettlementOutstandingNgn } from '../../lib/registerSettlementPay';
import { effectiveOutstandingNgn } from '../../lib/paymentOutstandingTolerance.js';
import { treasuryAccountsForWorkspace } from '../../lib/treasuryAccountsStore';
import { useFinanceTrialExceptions } from '../../hooks/useFinanceTrialExceptions';
import { FinanceTrialExceptionPanel } from './FinanceTrialExceptionPanel';
import { userMayViewFinanceTrialExceptionsClient } from '../../lib/financeTrialExceptionsAccess';
import { FinanceKpiCard } from './FinanceKpiCard';
import { FinanceTrialBanner } from './FinanceTrialBanner';
import { FinanceSectionCard } from './FinanceSectionCard';
import { FinanceStatusChip } from './FinanceStatusChip';
import { FinanceEmptyState } from './FinanceEmptyState';
import { FinanceTabs } from './FinanceTabs';
import { FinanceActionButton } from './FinanceActionButton';
import { FinanceQueueRow } from './FinanceQueueRow';
import { FinanceMobileAlertStrip } from './FinanceMobileAlertStrip';
import { StaffRecoveryCashierPanel } from './StaffRecoveryCashierPanel';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(iso) {
  return String(iso || '').slice(0, 10) === todayIso();
}

const DESK_SUB_TABS = [
  { id: 'work', label: 'Work queues' },
  { id: 'reports', label: 'Reports' },
];

/**
 * Branch cashier daily work queues — embedded in Finance → Desk tab.
 * @param {{
 *   onConfirmReceipt: (receipt: object) => void;
 *   onViewReceipt?: (receipt: object) => void;
 *   onPayRequest: (requestId: string) => void;
 *   onViewPaymentRequest?: (requestId: string) => void;
 *   onPayRefund: (refundId: string) => void;
 *   onPayRegisterSettlement?: (settlementId: string) => void;
 *   onPayPoTransport: (row: object) => void;
 *   onViewPoTransport?: (row: object) => void;
 *   onReceiveStaffRecovery?: (row: object) => void;
 *   onGoToTab: (tabId: string) => void;
 * }} props
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
  onGoToTab,
}) {
  const ws = useWorkspace();
  const wsSnapshotTreasuryAccounts = ws?.snapshot?.treasuryAccounts;
  const wsSession = ws?.session;
  const wsBranchScope = ws?.branchScope;
  const wsViewAllBranches = ws?.viewAllBranches;
  const [deskSubTab, setDeskSubTab] = useState('work');
  const [showDetails, setShowDetails] = useState(false);

  const receipts = useMemo(
    () => (Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : []),
    [ws?.snapshot?.receipts]
  );
  const treasuryAccounts = useMemo(
    () =>
      treasuryAccountsForWorkspace(
        {
          treasuryAccounts: Array.isArray(wsSnapshotTreasuryAccounts) ? wsSnapshotTreasuryAccounts : [],
          branchScope: wsBranchScope,
        },
        wsSession,
        { branchScope: wsBranchScope, viewAllBranches: wsViewAllBranches }
      ),
    [wsSnapshotTreasuryAccounts, wsSession, wsBranchScope, wsViewAllBranches]
  );
  const paymentRequests = useMemo(
    () => (Array.isArray(ws?.snapshot?.paymentRequests) ? ws.snapshot.paymentRequests : []),
    [ws?.snapshot?.paymentRequests]
  );
  const refunds = useMemo(
    () => (Array.isArray(ws?.snapshot?.refunds) ? ws.snapshot.refunds : []),
    [ws?.snapshot?.refunds]
  );
  const registerSettlements = useMemo(
    () =>
      Array.isArray(ws?.snapshot?.registerSettlementsAwaitingPayment)
        ? ws.snapshot.registerSettlementsAwaitingPayment
        : [],
    [ws?.snapshot?.registerSettlementsAwaitingPayment]
  );

  const pendingReceipts = useMemo(
    () => receipts.filter((r) => isReceiptPendingClearance(r)).slice(0, 25),
    [receipts]
  );
  const confirmedToday = useMemo(
    () => receipts.filter((r) => isReceiptCleared(r) && isToday(r.dateISO)).slice(0, 15),
    [receipts]
  );
  const approvedPayments = useMemo(
    () =>
      paymentRequests
        .filter((pr) => {
          const st = String(pr.approvalStatus || '').trim();
          if (st !== 'Approved') return false;
          const req = Math.round(Number(pr.amountRequestedNgn) || 0);
          const paid = Math.round(Number(pr.paidAmountNgn) || 0);
          return effectiveOutstandingNgn(req, paid) > 0;
        })
        .slice(0, 20),
    [paymentRequests]
  );
  const approvedRefunds = useMemo(() => approvedRefundsAwaitingPayment(refunds).slice(0, 15), [refunds]);
  const approvedRegisterSettlements = useMemo(
    () => registerSettlementsAwaitingPayment(registerSettlements).slice(0, 15),
    [registerSettlements]
  );
  const poTransportAwaiting = useMemo(
    () =>
      (Array.isArray(ws?.snapshot?.poTransportAwaitingTreasury) ? ws.snapshot.poTransportAwaitingTreasury : [])
        .filter((row) => Math.max(0, Number(row.outstandingNgn) || 0) > 0)
        .slice(0, 15),
    [ws?.snapshot?.poTransportAwaitingTreasury]
  );
  const staffRecoveriesDue = useMemo(
    () =>
      (Array.isArray(ws?.snapshot?.staffRecoveriesDue) ? ws.snapshot.staffRecoveriesDue : [])
        .filter((row) => Math.max(0, Number(row.principalOutstandingNgn) || 0) > 0),
    [ws?.snapshot?.staffRecoveriesDue]
  );
  const staffRecoveriesTotalNgn = useMemo(
    () => staffRecoveriesDue.reduce((s, r) => s + Math.max(0, Number(r.principalOutstandingNgn) || 0), 0),
    [staffRecoveriesDue]
  );
  const liquidity = useMemo(
    () => liquidityClearanceSplit(treasuryAccounts, receipts),
    [treasuryAccounts, receipts]
  );

  const roleKey = ws?.session?.user?.roleKey;
  const permissions = ws?.permissions;
  const mayTrialApi = userMayViewFinanceTrialExceptionsClient(roleKey, permissions);
  const trialBranch = ws.viewAllBranches ? null : ws.branchScope || ws.session?.currentBranchId;
  const { data: trialData, loading: trialLoading, error: trialError, reload: reloadTrial } =
    useFinanceTrialExceptions({ branchId: trialBranch, enabled: mayTrialApi });
  const trialEx = trialData?.exceptions;
  const creditTrial = trialData?.creditExceptions;

  const branchLabel = ws.viewAllBranches
    ? 'All branches'
    : ws.branchLabel || ws.branchScope || '';

  const warnings = useMemo(() => {
    const w = [];
    if ((trialEx?.pendingReceiptClearance ?? pendingReceipts.length) > 0) {
      w.push({ label: 'Payments received — confirm on Receipts tab', tone: 'warn' });
    }
    if ((trialEx?.receiptBankAmountMismatch ?? 0) > 0) {
      w.push({ label: 'Receipt amount needs attention', tone: 'warn' });
    }
    if ((trialEx?.treasuryMovementWithoutFinanceSettlement ?? 0) > 0) {
      w.push({ label: 'Treasury movement not settled', tone: 'warn' });
    }
    if ((creditTrial?.deliveriesWarningNoCreditCount ?? 0) > 0) {
      w.push({ label: 'Deliveries waiting on payment or credit', tone: 'warn' });
    }
    if (staffRecoveriesDue.length > 0) {
      w.push({ label: `${staffRecoveriesDue.length} staff recoveries to collect`, tone: 'warn' });
    }
    return w;
  }, [trialEx, pendingReceipts.length, creditTrial, staffRecoveriesDue.length]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {branchLabel ? (
        <p className="text-[11px] text-slate-600 leading-relaxed rounded-xl border border-teal-200/70 bg-teal-50/50 px-4 py-3">
          <strong className="text-[#134e4a]">{branchLabel}</strong> cashier desk — your payout home. Confirm
          receipts, receive staff discipline recoveries, pay approved expense requests, refunds, register
          withdrawals, and PO haulage here without switching tabs. Supplier payments stay on Procurement.
        </p>
      ) : null}

      <FinanceTrialBanner>
        Exception counts are visible to supervisors — use the work queues below for daily tasks.
      </FinanceTrialBanner>

      <FinanceMobileAlertStrip
        pendingReceipts={pendingReceipts.length}
        approvedPayments={approvedPayments.length}
        approvedRefunds={approvedRefunds.length}
        registerWithdrawals={approvedRegisterSettlements.length}
        poHaulage={poTransportAwaiting.length}
        staffRecoveries={staffRecoveriesDue.length}
      />

      <FinanceTabs tabs={DESK_SUB_TABS} active={deskSubTab} onChange={setDeskSubTab} />

      {deskSubTab === 'reports' ? (
        <CashierDeskReports
          receipts={receipts}
          paymentRequests={paymentRequests}
          refunds={refunds}
          trialData={trialData}
        />
      ) : null}

      {deskSubTab === 'work' ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <FinanceKpiCard
              label="Pending receipt confirmations"
              value={trialEx?.pendingReceiptClearance ?? pendingReceipts.length}
              hint={`${formatNgn(pendingClearanceTotalNgn(receipts))} in workspace`}
              tone="amber"
              icon={<Banknote size={14} />}
            />
            <FinanceKpiCard
              label="Confirmed today"
              value={trialData?.confirmedReceipts?.today ?? confirmedToday.length}
            />
            <FinanceKpiCard
              label="Approved payments to pay"
              value={trialEx?.approvedUnpaidPaymentRequests ?? approvedPayments.length}
            />
            <FinanceKpiCard
              label="Approved payouts"
              value={trialEx?.approvedUnpaidRefunds ?? approvedRefunds.length}
            />
            <FinanceKpiCard
              label="Register withdrawals to pay"
              value={approvedRegisterSettlements.length}
              tone={approvedRegisterSettlements.length > 0 ? 'amber' : 'default'}
              icon={<Wallet size={14} />}
            />
            <FinanceKpiCard
              label="PO haulage to pay"
              value={poTransportAwaiting.length}
              tone={poTransportAwaiting.length > 0 ? 'amber' : 'default'}
              icon={<Truck size={14} />}
            />
            <FinanceKpiCard
              label="Staff recoveries to collect"
              value={staffRecoveriesDue.length}
              hint={staffRecoveriesDue.length ? formatNgn(staffRecoveriesTotalNgn) : 'None due'}
              tone={staffRecoveriesDue.length > 0 ? 'amber' : 'default'}
              icon={<UserRound size={14} />}
            />
            <FinanceKpiCard
              label="Treasury needs attention"
              value={trialEx?.treasuryMovementWithoutFinanceSettlement ?? '—'}
              tone="amber"
              icon={<Landmark size={14} />}
            />
          </section>

          {warnings.length ? (
            <section className="flex flex-wrap gap-2">
              {warnings.map((w) => (
                <FinanceStatusChip key={w.label} label={w.label} tone={w.tone} />
              ))}
            </section>
          ) : null}

          <FinanceSectionCard title="Branch treasury balances" icon={<Landmark size={16} className="text-teal-700" />}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {treasuryAccounts.map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                  <p className="text-sm font-bold text-slate-800">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.bankName || a.type}</p>
                  <p className="mt-1 text-lg font-black tabular-nums text-teal-900">{formatNgn(a.balance)}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">
              Book {formatNgn(liquidity.bookTotalNgn)} · Pending clearance {formatNgn(liquidity.pendingClearanceNgn)}
            </p>
            <div className="mt-2">
              <FinanceActionButton variant="link" onClick={() => onGoToTab('treasury')}>
                Open full treasury
              </FinanceActionButton>
            </div>
          </FinanceSectionCard>

          <FinanceSectionCard
            title="Confirm payment received"
            icon={<Banknote size={16} className="text-amber-700" />}
            action={
              <FinanceActionButton variant="link" onClick={() => onGoToTab('receipts')}>
                View all receipts
              </FinanceActionButton>
            }
          >
            {pendingReceipts.length === 0 ? (
              <FinanceEmptyState title="All clear" description="No receipts waiting for confirmation in this branch." />
            ) : (
              <ul className="space-y-2">
                {pendingReceipts.map((r) => (
                  <FinanceQueueRow
                    key={r.id}
                    title={`${r.id} · ${r.customer || r.customerID}`}
                    subtitle={receiptClearanceBadgeLabel(r)}
                    amount={formatNgn(r.amountNgn)}
                    primaryAction={
                      <FinanceActionButton variant="primary" onClick={() => onConfirmReceipt(r)}>
                        Confirm payment
                      </FinanceActionButton>
                    }
                    secondaryLink={
                      onViewReceipt ? (
                        <FinanceActionButton variant="secondary" onClick={() => onViewReceipt(r)}>
                          View in receipts
                        </FinanceActionButton>
                      ) : null
                    }
                  />
                ))}
              </ul>
            )}
          </FinanceSectionCard>

          <StaffRecoveryCashierPanel
            recoveries={staffRecoveriesDue}
            onReceive={onReceiveStaffRecovery}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FinanceSectionCard title="Approved payments to pay" icon={<ClipboardList size={16} />}>
              {approvedPayments.length === 0 ? (
                <FinanceEmptyState title="No payouts queued" />
              ) : (
                <ul className="space-y-2">
                  {approvedPayments.map((pr) => (
                    <FinanceQueueRow
                      key={pr.requestID || pr.id}
                      title={pr.requestID}
                      subtitle="Approved payment request"
                      amount={formatNgn(pr.amountRequestedNgn)}
                      primaryAction={
                        <FinanceActionButton
                          variant="primary"
                          onClick={() => onPayRequest(String(pr.requestID || pr.id || ''))}
                        >
                          Pay approved request
                        </FinanceActionButton>
                      }
                      secondaryLink={
                        onViewPaymentRequest ? (
                          <FinanceActionButton
                            variant="secondary"
                            onClick={() => onViewPaymentRequest(String(pr.requestID || pr.id || ''))}
                          >
                            View in register
                          </FinanceActionButton>
                        ) : null
                      }
                    />
                  ))}
                </ul>
              )}
            </FinanceSectionCard>

            <FinanceSectionCard title="Approved refund payouts" icon={<RotateCcw size={16} />}>
              {approvedRefunds.length === 0 ? (
                <FinanceEmptyState title="No refund payouts queued" />
              ) : (
                <ul className="space-y-2">
                  {approvedRefunds.map((r) => (
                    <FinanceQueueRow
                      key={r.refundID}
                      title={r.refundID}
                      subtitle={r.quotationRef ? `Quote ${r.quotationRef}` : 'Refund payout'}
                      amount={formatNgn(r.approvedAmountNgn ?? r.amountNgn)}
                      primaryAction={
                        <FinanceActionButton
                          variant="primary"
                          onClick={() => onPayRefund(String(r.refundID || ''))}
                        >
                          Pay approved refund
                        </FinanceActionButton>
                      }
                      secondaryLink={
                        <FinanceActionButton variant="secondary" to="/sales?tab=refunds">
                          Review refund
                        </FinanceActionButton>
                      }
                    />
                  ))}
                </ul>
              )}
            </FinanceSectionCard>
          </div>

          <FinanceSectionCard title="Register withdrawals to pay" icon={<Wallet size={16} className="text-teal-800" />}>
            {approvedRegisterSettlements.length === 0 ? (
              <FinanceEmptyState title="No register withdrawals queued" />
            ) : (
              <ul className="space-y-2">
                {approvedRegisterSettlements.map((s) => (
                  <FinanceQueueRow
                    key={s.settlementId}
                    title={s.settlementId}
                    subtitle={`${s.partyName || 'Register line'} · ${s.reason || 'Withdrawal'}`}
                    amount={formatNgn(registerSettlementOutstandingNgn(s))}
                    primaryAction={
                      onPayRegisterSettlement ? (
                        <FinanceActionButton
                          variant="primary"
                          onClick={() => onPayRegisterSettlement(String(s.settlementId || ''))}
                        >
                          Pay withdrawal
                        </FinanceActionButton>
                      ) : null
                    }
                    secondaryLink={
                      <FinanceActionButton variant="secondary" to="/accounting?tab=debtors">
                        Accounting desk
                      </FinanceActionButton>
                    }
                  />
                ))}
              </ul>
            )}
          </FinanceSectionCard>

          <FinanceSectionCard
            title="PO transport / haulage to pay"
            icon={<Truck size={16} className="text-sky-700" />}
            action={
              onViewPoTransport ? (
                <FinanceActionButton variant="link" onClick={() => onGoToTab('treasury')}>
                  Open treasury list
                </FinanceActionButton>
              ) : null
            }
          >
            {poTransportAwaiting.length === 0 ? (
              <FinanceEmptyState title="No haulage payouts queued" />
            ) : (
              <ul className="space-y-2">
                {poTransportAwaiting.map((row) => (
                  <FinanceQueueRow
                    key={row.poID}
                    title={`${row.poID} · ${row.transportAgentName || 'Transporter'}`}
                    subtitle={row.supplierName ? `Supplier ${row.supplierName}` : 'PO transport / haulage'}
                    amount={formatNgn(row.outstandingNgn)}
                    primaryAction={
                      <FinanceActionButton variant="primary" onClick={() => onPayPoTransport(row)}>
                        Record haulage pay
                      </FinanceActionButton>
                    }
                    secondaryLink={
                      onViewPoTransport ? (
                        <FinanceActionButton variant="secondary" onClick={() => onViewPoTransport(row)}>
                          View on treasury
                        </FinanceActionButton>
                      ) : null
                    }
                  />
                ))}
              </ul>
            )}
          </FinanceSectionCard>

          <FinanceSectionCard title="Treasury movements" icon={<ArrowRightLeft size={16} />}>
            <p className="text-sm font-medium text-slate-600 mb-3">
              Lodgements and internal transfers are recorded on the Movements tab.
            </p>
            <FinanceActionButton variant="primary" onClick={() => onGoToTab('movements')}>
              Record treasury movement
            </FinanceActionButton>
          </FinanceSectionCard>

          {mayTrialApi ? (
            <>
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="text-xs font-bold text-slate-500 hover:text-teal-800"
              >
                {showDetails ? 'Hide' : 'Show'} supervisor exception details
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
        Company accounting controls live on{' '}
        <Link to="/accounting" className="font-bold text-teal-800 hover:underline">
          Accounting Desk
        </Link>{' '}
        — branch cashiers do not use that desk.
      </p>
    </div>
  );
}
