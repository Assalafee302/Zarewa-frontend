import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Landmark, ArrowRightLeft, ClipboardList, RotateCcw } from 'lucide-react';
import { PageShell, MainPanel } from '../components/layout';
import { formatNgn } from '../Data/mockData';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  isReceiptCleared,
  isReceiptPendingClearance,
  liquidityClearanceSplit,
  pendingClearanceTotalNgn,
  receiptClearanceBadgeLabel,
} from '../lib/receiptClearance';
import { approvedRefundsAwaitingPayment } from '../lib/refundsStore';
import { effectiveOutstandingNgn } from '../lib/paymentOutstandingTolerance.js';
import { treasuryAccountsForWorkspace } from '../lib/treasuryAccountsStore';
import { userHasLegacyFullFinanceDeskClient } from '../lib/financeDeskAccess';
import { useFinanceTrialExceptions } from '../hooks/useFinanceTrialExceptions';
import { FinanceTrialExceptionPanel } from '../components/finance/FinanceTrialExceptionPanel';
import { userMayViewFinanceTrialExceptionsClient } from '../lib/financeTrialExceptionsAccess';
import { FinancePageHeader } from '../components/finance/FinancePageHeader';
import { FinanceKpiCard } from '../components/finance/FinanceKpiCard';
import { FinanceTrialBanner } from '../components/finance/FinanceTrialBanner';
import { FinanceSectionCard } from '../components/finance/FinanceSectionCard';
import { FinanceStatusChip } from '../components/finance/FinanceStatusChip';
import { FinanceEmptyState } from '../components/finance/FinanceEmptyState';
import { FinanceTabs } from '../components/finance/FinanceTabs';
import { FinanceActionButton } from '../components/finance/FinanceActionButton';
import { FinanceQueueRow } from '../components/finance/FinanceQueueRow';
import { CashierDeskReports } from '../components/finance/CashierDeskReports';
import { FinanceNoteRedirectModal } from '../components/finance/FinanceNoteRedirectModal';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(iso) {
  return String(iso || '').slice(0, 10) === todayIso();
}

const DESK_TABS = [
  { id: 'work', label: 'Work queues' },
  { id: 'reports', label: 'Reports' },
];

export default function CashierDesk() {
  const ws = useWorkspace();
  const [deskTab, setDeskTab] = useState('work');
  const [showDetails, setShowDetails] = useState(false);
  const [confirmReceipt, setConfirmReceipt] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const receipts = useMemo(
    () => (Array.isArray(ws?.snapshot?.receipts) ? ws.snapshot.receipts : []),
    [ws?.snapshot?.receipts]
  );
  const treasuryAccounts = useMemo(
    () =>
      treasuryAccountsForWorkspace(
        Array.isArray(ws?.snapshot?.treasuryAccounts) ? ws.snapshot.treasuryAccounts : [],
        ws
      ),
    [ws?.snapshot?.treasuryAccounts, ws]
  );
  const paymentRequests = useMemo(
    () => (Array.isArray(ws?.snapshot?.paymentRequests) ? ws.snapshot.paymentRequests : []),
    [ws?.snapshot?.paymentRequests]
  );
  const refunds = useMemo(
    () => (Array.isArray(ws?.snapshot?.refunds) ? ws.snapshot.refunds : []),
    [ws?.snapshot?.refunds]
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
  const liquidity = useMemo(
    () => liquidityClearanceSplit(treasuryAccounts, receipts),
    [treasuryAccounts, receipts]
  );
  const legacyFinance = userHasLegacyFullFinanceDeskClient(
    ws?.session?.user?.roleKey,
    ws?.session?.user?.permissions
  );
  const roleKey = ws?.session?.user?.roleKey;
  const permissions = ws?.session?.user?.permissions;
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
      w.push({ label: 'Payments received — confirm in Finance', tone: 'warn' });
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
    return w;
  }, [trialEx, pendingReceipts.length, creditTrial]);

  return (
    <PageShell>
      <FinancePageHeader
        title="Cashier Desk"
        subtitle="Confirm receipts, execute approved payments, and manage branch cash movement."
        badges={
          <>
            {branchLabel ? <FinanceStatusChip label={branchLabel} tone="credit" /> : null}
            <FinanceStatusChip label="Trial mode" tone="trial" />
          </>
        }
      />

      <FinanceTrialBanner>Exception counts are visible to supervisors — use the work queues below for daily tasks.</FinanceTrialBanner>

      <MainPanel className="space-y-8">
        <FinanceTabs tabs={DESK_TABS} active={deskTab} onChange={setDeskTab} />

        {deskTab === 'reports' ? (
          <CashierDeskReports
            receipts={receipts}
            paymentRequests={paymentRequests}
            refunds={refunds}
            trialData={trialData}
          />
        ) : null}

        {deskTab === 'work' ? (
        <>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
        </FinanceSectionCard>

        <FinanceSectionCard
          title="Confirm payment received"
          icon={<Banknote size={16} className="text-amber-700" />}
          action={
            <FinanceActionButton variant="link" to="/accounts?tab=receipts">
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
                    <FinanceActionButton variant="primary" onClick={() => setConfirmReceipt(r)}>
                      Confirm payment
                    </FinanceActionButton>
                  }
                  secondaryLink={
                    <FinanceActionButton
                      variant="secondary"
                      to={`/accounts?tab=receipts&highlight=${encodeURIComponent(r.id)}`}
                    >
                      View receipt
                    </FinanceActionButton>
                  }
                />
              ))}
            </ul>
          )}
        </FinanceSectionCard>

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
                        onClick={() =>
                          setPayTarget({
                            type: 'payment',
                            id: pr.requestID,
                            label: pr.requestID,
                          })
                        }
                      >
                        Pay approved request
                      </FinanceActionButton>
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
                        onClick={() =>
                          setPayTarget({ type: 'refund', id: r.refundID, label: r.refundID })
                        }
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

        <FinanceSectionCard title="Treasury movements" icon={<ArrowRightLeft size={16} />}>
          <p className="text-sm font-medium text-slate-600 mb-3">
            Lodgements and internal transfers are recorded on Finance → Movements.
          </p>
          <FinanceActionButton variant="primary" to="/accounts?tab=movements">
            View treasury movements
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

        <FinanceNoteRedirectModal
          open={Boolean(confirmReceipt)}
          onClose={() => setConfirmReceipt(null)}
          title="Confirm payment received"
          description={`Open Finance to confirm receipt ${confirmReceipt?.id || ''} and match bank amount.`}
          redirectTo={`/accounts?tab=receipts${confirmReceipt?.id ? `&highlight=${encodeURIComponent(confirmReceipt.id)}` : ''}`}
          confirmLabel="Review payment"
        />
        <FinanceNoteRedirectModal
          open={Boolean(payTarget)}
          onClose={() => setPayTarget(null)}
          title={payTarget?.type === 'refund' ? 'Pay approved refund' : 'Pay approved request'}
          description={`Treasury payout for ${payTarget?.label || ''} — add a note then continue to Finance disbursements.`}
          redirectTo="/accounts?tab=disbursements"
          confirmLabel="Continue to payout"
        />

        {legacyFinance ? (
          <p className="border-t border-slate-200 pt-4 text-xs font-medium text-slate-500">
            Legacy{' '}
            <Link to="/accounts" className="font-bold text-teal-800 hover:underline">
              Finance
            </Link>{' '}
            and{' '}
            <Link to="/accounting" className="font-bold text-teal-800 hover:underline">
              Accounting Desk
            </Link>{' '}
            remain available during trial onboarding.
          </p>
        ) : null}
      </MainPanel>
    </PageShell>
  );
}
