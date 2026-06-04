import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Landmark, ArrowRightLeft, ClipboardList, RotateCcw } from 'lucide-react';
import { PageHeader, PageShell, MainPanel } from '../components/layout';
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(iso) {
  return String(iso || '').slice(0, 10) === todayIso();
}

export default function CashierDesk() {
  const ws = useWorkspace();
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

  const branchLabel = ws.viewAllBranches
    ? 'All branches (HQ roll-up)'
    : ws.branchLabel || ws.branchScope || '';

  return (
    <PageShell>
      <PageHeader
        title="Cashier Desk"
        subtitle="Branch cash control — receipt confirmation, approved payouts, and treasury movements. Not accounting reports or month-end close."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {['Branch cash control', 'Receipt confirmation', 'Approved payouts', 'Treasury movements'].map((label) => (
          <span
            key={label}
            className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-900"
          >
            {label}
          </span>
        ))}
      </div>

      {branchLabel ? (
        <p className="text-sm font-semibold text-slate-600 mb-6">Workspace: {branchLabel}</p>
      ) : null}

      <MainPanel className="space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Pending confirmation</p>
            <p className="text-2xl font-black text-amber-950 tabular-nums mt-1">
              {trialEx?.pendingReceiptClearance ?? pendingReceipts.length}
            </p>
            <p className="text-xs font-medium text-amber-900/90 mt-1">
              {formatNgn(pendingClearanceTotalNgn(receipts))} awaiting clearance (workspace)
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Confirmed today</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">
              {trialData?.confirmedReceipts?.today ?? confirmedToday.length}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Treasury, not settled</p>
            <p className="text-2xl font-black text-amber-950 tabular-nums mt-1">
              {trialEx?.treasuryMovementWithoutFinanceSettlement ?? '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Payments to execute</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">
              {trialEx?.approvedUnpaidPaymentRequests ?? approvedPayments.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Refund payouts</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">
              {trialEx?.approvedUnpaidRefunds ?? approvedRefunds.length}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
          <h2 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
            <Landmark size={16} className="text-teal-700" />
            Branch treasury balances
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {treasuryAccounts.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-bold text-slate-800 text-sm">{a.name}</p>
                <p className="text-xs text-slate-500">{a.bankName || a.type}</p>
                <p className="text-lg font-black text-teal-900 tabular-nums mt-1">{formatNgn(a.balance)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-3">
            Book total {formatNgn(liquidity.bookTotalNgn)} · Pending clearance {formatNgn(liquidity.pendingClearanceNgn)}
          </p>
        </section>

        <section className="rounded-2xl border border-amber-100 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Banknote size={16} className="text-amber-700" />
              Pending receipt confirmations
            </h2>
            <Link
              to="/accounts?tab=receipts"
              className="text-xs font-bold text-teal-800 underline-offset-2 hover:underline"
            >
              Open full receipt queue →
            </Link>
          </div>
          {pendingReceipts.length === 0 ? (
            <p className="text-sm font-medium text-slate-600">No receipts awaiting finance clearance in this branch.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {pendingReceipts.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <span className="font-semibold text-slate-800">
                    {r.id} · {r.customer || r.customerID}
                  </span>
                  <span className="font-bold tabular-nums">{formatNgn(r.amountNgn)}</span>
                  <span className="text-xs font-bold text-amber-800 w-full">{receiptClearanceBadgeLabel(r)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
              <ClipboardList size={16} />
              Approved payments to execute
            </h2>
            {approvedPayments.length === 0 ? (
              <p className="text-sm text-slate-600">None in queue.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {approvedPayments.map((pr) => (
                  <li key={pr.requestID || pr.id} className="border-b border-slate-100 pb-2">
                    <span className="font-semibold">{pr.requestID}</span> — {formatNgn(pr.amountRequestedNgn)}
                  </li>
                ))}
              </ul>
            )}
            <Link to="/accounts?tab=disbursements" className="text-xs font-bold text-teal-800 mt-3 inline-block hover:underline">
              Execute on Finance → Payments
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
              <RotateCcw size={16} />
              Approved refund payouts
            </h2>
            {approvedRefunds.length === 0 ? (
              <p className="text-sm text-slate-600">None awaiting payout.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {approvedRefunds.map((r) => (
                  <li key={r.refundID} className="border-b border-slate-100 pb-2">
                    {r.refundID} — {formatNgn(r.approvedAmountNgn ?? r.amountNgn)}
                  </li>
                ))}
              </ul>
            )}
            <Link to="/accounts?tab=disbursements" className="text-xs font-bold text-teal-800 mt-3 inline-block hover:underline">
              Pay from Finance → Payments
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <h2 className="text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
            <ArrowRightLeft size={16} />
            Transfers &amp; daily close
          </h2>
          <p className="text-sm font-medium text-slate-600 mb-3">
            Use <Link to="/accounts?tab=movements" className="font-bold text-teal-800 hover:underline">Finance → Movements</Link>{' '}
            for lodgements and internal transfers. Daily cashier sign-off checklist — planned Phase B3.
          </p>
        </section>

        {mayTrialApi ? (
          <FinanceTrialExceptionPanel
            variant="cashier"
            data={trialData}
            loading={trialLoading}
            error={trialError}
            onReload={reloadTrial}
          />
        ) : null}

        {legacyFinance ? (
          <p className="text-xs font-medium text-slate-500 border-t border-slate-200 pt-4">
            Compatibility mode: your role still has legacy Finance &amp; Reports access. Use{' '}
            <Link to="/accounts" className="text-teal-800 font-bold hover:underline">
              Finance (legacy)
            </Link>{' '}
            or{' '}
            <Link to="/reports" className="text-teal-800 font-bold hover:underline">
              Reports
            </Link>{' '}
            until Phase B3 tightens permissions. GL and month-end belong on{' '}
            <Link to="/accounting" className="text-teal-800 font-bold hover:underline">
              Accounting Desk
            </Link>
            .
          </p>
        ) : null}
      </MainPanel>
    </PageShell>
  );
}
