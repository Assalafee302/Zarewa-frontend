import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { ProcurementFormSection } from '../procurement/ProcurementFormSection';
import { AccountingDeskKpiCard, AccountingDeskNotice } from './accounting/AccountingDeskUi';

function CountCard({ label, count, tone = 'default', hint }) {
  return (
    <AccountingDeskKpiCard
      label={label}
      value={typeof count === 'number' && count > 999 ? formatNgn(count) : count ?? 0}
      hint={hint}
      tone={tone === 'amber' ? 'amber' : tone === 'teal' ? 'teal' : 'default'}
    />
  );
}

function RoleBars({ title, rows }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">{title}</p>
      <ul className="space-y-1 text-sm">
        {rows.slice(0, 6).map((r) => (
          <li key={`${title}-${r.roleKey}`} className="flex justify-between gap-2">
            <span className="font-semibold text-slate-700">{r.roleKey}</span>
            <span className="font-bold tabular-nums">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {{
 *   variant: 'cashier' | 'accounting' | 'oversight',
 *   data: object | null,
 *   loading?: boolean,
 *   error?: string,
 *   onReload?: () => void,
 * }} props
 */
export function FinanceTrialExceptionPanel({ variant, data, loading, error, onReload }) {
  const ex = data?.exceptions || {};
  const ap1 = data?.accountingPolicyV1 || null;
  const ap1c = data?.ap1cDryRun || null;
  const credit = data?.creditExceptions || null;
  const flags = data?.flags || {};
  const dual = data?.dualControlWarnings || {};
  const adoption = data?.roleAdoption || {};
  const confirmed = data?.confirmedReceipts || {};

  const trialBanner = (
    <AccountingDeskNotice tone="trial">
      <p className="font-bold mb-1">Trial / onboarding month</p>
      <p>{data?.trialPhaseNote || 'Exception counts may include training entries and finance-manager assist.'}</p>
      {flags.enforceDualControlPayments ? (
        <p className="mt-2 text-rose-800 font-bold">Strict dual-control enforcement is ON on this server.</p>
      ) : (
        <p className="mt-2 opacity-90">{dual.message}</p>
      )}
    </AccountingDeskNotice>
  );

  if (loading && !data) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-medium text-slate-600">
        Loading exception summary…
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <p className="text-sm font-medium text-amber-900">{error}</p>
        {onReload ? (
          <button
            type="button"
            onClick={() => onReload()}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-teal-800"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        ) : null}
      </section>
    );
  }

  if (!data?.ok) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal flex items-center gap-2">
          {variant === 'oversight' ? (
            <AlertTriangle size={14} className="text-rose-700" />
          ) : (
            <AlertCircle size={14} className="text-amber-700" />
          )}
          {variant === 'cashier'
            ? 'Cashier exception summary'
            : variant === 'accounting'
              ? 'Accounting exception summary'
              : 'MD / audit oversight'}
        </h2>
        {onReload ? (
          <button
            type="button"
            onClick={() => onReload()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-ui-xs font-semibold uppercase tracking-wider text-zarewa-teal hover:bg-slate-50"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        ) : null}
      </div>

      {trialBanner}

      {variant === 'cashier' ? (
        <>
          <AccountingDeskNotice tone="info">
            Training: Cashier confirms actual payment received (bank/cash) — not every accounting line.
          </AccountingDeskNotice>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <CountCard label="Pending receipt confirmations" count={ex.pendingReceiptClearance} tone="amber" />
            <CountCard
              label="Treasury in, not finance-settled"
              count={ex.treasuryMovementWithoutFinanceSettlement}
              tone="amber"
            />
            <CountCard label="Approved payments to execute" count={ex.approvedUnpaidPaymentRequests} />
            <CountCard label="Approved refunds to pay" count={ex.approvedUnpaidRefunds} />
            <CountCard label="Confirmed today" count={confirmed.today} tone="slate" />
            <CountCard label="Confirmed this week" count={confirmed.thisWeek} tone="slate" />
          </div>
        </>
      ) : null}

      {variant === 'accounting' ? (
        <>
          <AccountingDeskNotice tone="info">
            Training: Head of Accounts reviews exceptions and reconciliation — not routine cashier confirmation.
          </AccountingDeskNotice>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <CountCard label="Pending receipt clearance (all)" count={ex.pendingReceiptClearance} tone="amber" />
            <CountCard label="Bank amount ≠ receipt" count={ex.receiptBankAmountMismatch} tone="amber" />
            <CountCard label="Receipt without treasury movement" count={ex.receiptWithoutTreasuryMovement} tone="rose" />
            <CountCard
              label="Treasury without finance settlement"
              count={ex.treasuryMovementWithoutFinanceSettlement}
              tone="amber"
            />
            <CountCard label="Treasury balance drift (accounts)" count={ex.treasuryBalanceDriftCount} tone="rose" />
            <CountCard
              label="Reconciliation material mismatch"
              count={ex.reconciliationMaterialMismatch ? 1 : 0}
              tone={ex.reconciliationMaterialMismatch ? 'rose' : 'slate'}
              hint={
                ex.reconciliationMaterialMismatch
                  ? `Period ${ex.reconciliationMaterialMismatchPeriod || 'recent'}`
                  : 'No material pack mismatch in last 6 months'
              }
            />
          </div>
          <ProcurementFormSection letter="D" title="Dual-control warnings (not blocked)" compact>
            <ul className="text-xs font-medium text-amber-950 space-y-1">
              <li>Payment approve + pay same display name: {dual.paymentSameDisplayName ?? 0}</li>
              <li>Refund approve + pay same display name: {dual.refundSameDisplayName ?? 0}</li>
              <li>Refund same user requested + approved: {dual.refundSameUserRequestAndApprove ?? 0}</li>
            </ul>
          </ProcurementFormSection>
        </>
      ) : null}

      {variant === 'oversight' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <CountCard label="Unresolved high-risk (score)" count={ex.unresolvedHighRiskCount} tone="rose" />
          <CountCard label="Same-name payment approve+pay" count={dual.paymentSameDisplayName} tone="amber" />
          <CountCard label="Same-name refund approve+pay" count={dual.refundSameDisplayName} tone="amber" />
          <CountCard label="Treasury drift accounts" count={ex.treasuryBalanceDriftCount} tone="rose" />
          <CountCard label="Receipt bank mismatch" count={ex.receiptBankAmountMismatch} tone="amber" />
          <CountCard
            label="Material recon mismatch"
            count={ex.reconciliationMaterialMismatch ? 1 : 0}
            tone="rose"
            hint={ex.reconciliationMaterialMismatchPeriod || undefined}
          />
        </div>
      ) : null}

      {credit ? (
        <ProcurementFormSection letter="C" title="Delivery credit (AP1d)" compact>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <CountCard label="Pending credit requests" count={credit.pendingCreditExceptionsCount} tone="amber" />
            <CountCard
              label="Approved credit exposure"
              count={credit.approvedCreditExposureNgn}
              hint="Receivable still outstanding"
            />
            <CountCard label="Overdue approved credit" count={credit.overdueApprovedCreditCount} tone="amber" />
            <CountCard label="Deliveries allowed by credit" count={credit.deliveriesAllowedByCreditCount} />
            <CountCard label="Unpaid deliveries, no credit" count={credit.deliveriesWarningNoCreditCount} tone="amber" />
          </div>
          {variant !== 'cashier' ? (
            <Link to="/accounting" className="mt-2 inline-block text-ui-xs font-bold text-zarewa-teal hover:underline">
              Review on Accounting Desk → Credit
            </Link>
          ) : null}
        </ProcurementFormSection>
      ) : null}

      {flags.deliveryPaymentGateMode && flags.deliveryPaymentGateMode !== 'off' ? (
        <AccountingDeskNotice tone="warn">
          <p className="font-bold uppercase tracking-wide text-ui-xs mb-1">
            Delivery payment gate (AP1b — {flags.deliveryPaymentGateMode})
          </p>
          <p>
            {flags.deliveryPaymentGateMode === 'enforce'
              ? 'Unpaid deliveries are blocked on POST /api/deliveries/:id/confirm.'
              : 'Unpaid deliveries still confirm but are audited. Use payment-release-check before dispatch.'}
          </p>
        </AccountingDeskNotice>
      ) : null}

      {variant === 'cashier' && flags.accountingPolicyV1Diagnostics && ap1c?.available ? (
        <AccountingDeskNotice tone="warn">
          AP1c dry-run: {ap1c.receiptsBeforeProductionCredited1200Count ?? 0} receipt(s) pre-production posted to GL
          1200 (should be 2500). Accounting Desk has full detail. No GL changed.
        </AccountingDeskNotice>
      ) : null}

      {flags.accountingPolicyV1Diagnostics && ap1c?.available ? (
        <AccountingDeskNotice tone="info">
          <p>
            <span className="font-bold uppercase tracking-wide">AP1c dry-run: </span>
            Pre-prod GL 1200 {ap1c.receiptsBeforeProductionCredited1200Count ?? 0} · Release gap ₦
            {Number(ap1c.releaseGapNgn || 0).toLocaleString()} · AR risk ₦
            {Number(ap1c.potentialArOverstatementNgn || 0).toLocaleString()}
          </p>
          {(ap1c.receiptReversalsMissingResolvableMetaCount > 0 || ap1c.refundPayoutsRevenueReviewCount > 0) && (
            <p className="mt-1 text-amber-900">
              AP1c-4: reversals unresolved {ap1c.receiptReversalsMissingResolvableMetaCount ?? 0} · refunds needing
              revenue review {ap1c.refundPayoutsRevenueReviewCount ?? 0}
            </p>
          )}
        </AccountingDeskNotice>
      ) : null}

      {flags.accountingPolicyV1Diagnostics && ap1 ? (
        <ProcurementFormSection letter="A" title="Accounting Policy v1 diagnostics (AP1a)" compact>
          <p className="text-xs font-medium text-violet-950 leading-relaxed mb-3">
            {data?.accountingPolicyV1Note || 'Read-only indicators; GL timing unchanged until AP1c.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <CountCard
              label="Receipt GL 1200, quote not produced"
              count={ap1.receiptsOnQuoteNoProductionWithGl1200}
              tone="amber"
            />
            <CountCard
              label="Fully paid, no production yet"
              count={ap1.quotationsFullyPaidNoProduction}
              tone="amber"
            />
            <CountCard
              label="Pre-production balance (deposit pending)"
              count={ap1.quotationsPreProductionWithBalanceDue}
              tone="slate"
            />
            <CountCard
              label="Open deliveries unpaid (would block)"
              count={ap1.openDeliveriesWouldBlockOnPayment}
              tone="rose"
              hint={
                flags.deliveryPaymentGateMode === 'enforce'
                  ? 'Blocked on confirm API'
                  : flags.deliveryPaymentGateMode === 'warn'
                    ? 'Warn + audit on confirm'
                    : 'Dry-run only — set DELIVERY_PAYMENT_GATE=1'
              }
            />
          </div>
        </ProcurementFormSection>
      ) : null}

      <ProcurementFormSection letter="R" title="Role adoption (trial monitoring)" compact>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <RoleBars title="Receipt confirmations by role" rows={adoption.receiptConfirmationsByRole} />
          <RoleBars title="Payment approvals by role" rows={adoption.paymentApprovalsByRole} />
          <RoleBars title="Payment payouts by role" rows={adoption.paymentPayoutsByRole} />
        </div>
        <p className="text-ui-xs font-medium text-slate-600 mt-3">
          Active cashier users: {adoption.cashierActiveUserCount ?? 0} · Finance manager receipt confirmations:{' '}
          {adoption.financeManagerReceiptConfirmationCount ?? 0}
          {adoption.financeManagerOverrideNote ? (
            <span className="block mt-1 text-slate-500">{adoption.financeManagerOverrideNote}</span>
          ) : null}
        </p>
      </ProcurementFormSection>

      <div className="flex flex-wrap gap-3 text-ui-xs font-bold">
        {variant !== 'cashier' ? (
          <Link to="/accounts?tab=desk" className="text-zarewa-teal hover:underline">
            Cashier Desk →
          </Link>
        ) : null}
        {variant !== 'accounting' ? (
          <Link to="/accounting" className="text-zarewa-teal hover:underline">
            Accounting Desk →
          </Link>
        ) : null}
        <Link to="/accounts?tab=receipts" className="text-zarewa-teal hover:underline">
          Finance receipts queue →
        </Link>
        <Link to="/exec" className="text-zarewa-teal hover:underline">
          Command Centre →
        </Link>
      </div>
    </section>
  );
}
