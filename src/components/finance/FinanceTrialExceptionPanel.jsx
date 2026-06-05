import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, RefreshCw, Users } from 'lucide-react';

function CountCard({ label, count, tone = 'slate', hint }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50/80 text-amber-950',
    rose: 'border-rose-200 bg-rose-50/80 text-rose-950',
    slate: 'border-slate-200 bg-white text-slate-900',
    indigo: 'border-indigo-200 bg-indigo-50/80 text-indigo-950',
  };
  const cls = tones[tone] || tones.slate;
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-2xl font-black tabular-nums mt-1">{Number(count) || 0}</p>
      {hint ? <p className="text-xs font-medium mt-1 opacity-90">{hint}</p> : null}
    </div>
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
    <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 flex gap-3">
      <Info size={18} className="text-sky-800 shrink-0 mt-0.5" />
      <div className="text-sm font-medium text-sky-950 leading-relaxed">
        <p className="font-black text-sky-900 mb-1">Trial / onboarding month</p>
        <p>{data?.trialPhaseNote || 'Exception counts may include training entries and finance-manager assist.'}</p>
        {flags.enforceDualControlPayments ? (
          <p className="mt-2 text-rose-800 font-bold">Strict dual-control enforcement is ON on this server.</p>
        ) : (
          <p className="mt-2 text-sky-800/90">{dual.message}</p>
        )}
      </div>
    </div>
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
        <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
          {variant === 'oversight' ? (
            <AlertTriangle size={16} className="text-rose-700" />
          ) : (
            <AlertCircle size={16} className="text-amber-700" />
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
            className="text-xs font-bold text-teal-800 inline-flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        ) : null}
      </div>

      {trialBanner}

      {variant === 'cashier' ? (
        <>
          <p className="text-sm font-semibold text-teal-900 bg-teal-50/80 border border-teal-100 rounded-xl px-4 py-3">
            Training: Cashier confirms actual payment received (bank/cash) — not every accounting line.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <p className="text-sm font-semibold text-indigo-900 bg-indigo-50/80 border border-indigo-100 rounded-xl px-4 py-3">
            Training: Head of Accounts reviews exceptions and reconciliation — not routine cashier confirmation.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-2">Dual-control warnings (not blocked)</p>
            <ul className="text-sm font-medium text-amber-950 space-y-1">
              <li>Payment approve + pay same display name: {dual.paymentSameDisplayName ?? 0}</li>
              <li>Refund approve + pay same display name: {dual.refundSameDisplayName ?? 0}</li>
              <li>Refund same user requested + approved: {dual.refundSameUserRequestAndApprove ?? 0}</li>
            </ul>
          </div>
        </>
      ) : null}

      {variant === 'oversight' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-teal-900">Delivery credit (AP1d)</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <CountCard label="Pending credit requests" count={credit.pendingCreditExceptionsCount} tone="amber" />
            <CountCard
              label="Approved credit exposure"
              count={credit.approvedCreditExposureNgn}
              tone="slate"
              hint="Receivable still outstanding"
            />
            <CountCard label="Overdue approved credit" count={credit.overdueApprovedCreditCount} tone="amber" />
            <CountCard label="Deliveries allowed by credit" count={credit.deliveriesAllowedByCreditCount} tone="slate" />
            <CountCard
              label="Unpaid deliveries, no credit"
              count={credit.deliveriesWarningNoCreditCount}
              tone="rose"
            />
          </div>
          {variant !== 'cashier' ? (
            <Link to="/accounting" className="mt-2 inline-block text-xs font-bold text-teal-800 hover:underline">
              Review on Accounting Desk → Credit
            </Link>
          ) : null}
        </div>
      ) : null}

      {flags.deliveryPaymentGateMode && flags.deliveryPaymentGateMode !== 'off' ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-rose-900">
            Delivery payment gate (AP1b — {flags.deliveryPaymentGateMode})
          </p>
          <p className="text-xs font-medium text-rose-950 mt-1 leading-relaxed">
            {flags.deliveryPaymentGateMode === 'enforce'
              ? 'Unpaid deliveries are blocked on POST /api/deliveries/:id/confirm.'
              : 'Unpaid deliveries still confirm but are audited. Use payment-release-check before dispatch.'}
          </p>
        </div>
      ) : null}

      {variant === 'cashier' && flags.accountingPolicyV1Diagnostics && ap1c?.available ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <p className="text-xs font-bold text-amber-950">
            AP1c dry-run: {ap1c.receiptsBeforeProductionCredited1200Count ?? 0} receipt(s) pre-production
            posted to GL 1200 (should be 2500). Accounting Desk has full detail. No GL changed.
          </p>
        </div>
      ) : null}

      {flags.accountingPolicyV1Diagnostics && ap1c?.available ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3 text-xs font-medium text-violet-950 space-y-1">
          <p>
            <span className="font-black uppercase tracking-wide text-violet-900">AP1c dry-run: </span>
            Pre-prod GL 1200 {ap1c.receiptsBeforeProductionCredited1200Count ?? 0} · Release gap ₦
            {Number(ap1c.releaseGapNgn || 0).toLocaleString()} · AR risk ₦
            {Number(ap1c.potentialArOverstatementNgn || 0).toLocaleString()}
          </p>
          {(ap1c.receiptReversalsMissingResolvableMetaCount > 0 ||
            ap1c.refundPayoutsRevenueReviewCount > 0) && (
            <p className="text-amber-900">
              AP1c-4: reversals unresolved {ap1c.receiptReversalsMissingResolvableMetaCount ?? 0} · refunds
              needing revenue review {ap1c.refundPayoutsRevenueReviewCount ?? 0}
            </p>
          )}
        </div>
      ) : null}

      {flags.accountingPolicyV1Diagnostics && ap1 ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wide text-violet-900">
            Accounting Policy v1 diagnostics (AP1a)
          </p>
          <p className="text-xs font-medium text-violet-950 leading-relaxed">
            {data?.accountingPolicyV1Note ||
              'Read-only indicators; GL timing unchanged until AP1c.'}
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
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-3 flex items-center gap-2">
          <Users size={14} />
          Role adoption (trial monitoring)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <RoleBars title="Receipt confirmations by role" rows={adoption.receiptConfirmationsByRole} />
          <RoleBars title="Payment approvals by role" rows={adoption.paymentApprovalsByRole} />
          <RoleBars title="Payment payouts by role" rows={adoption.paymentPayoutsByRole} />
        </div>
        <p className="text-xs font-medium text-slate-600 mt-3">
          Active cashier users: {adoption.cashierActiveUserCount ?? 0} · Finance manager receipt confirmations:{' '}
          {adoption.financeManagerReceiptConfirmationCount ?? 0}
          {adoption.financeManagerOverrideNote ? (
            <span className="block mt-1 text-slate-500">{adoption.financeManagerOverrideNote}</span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-bold">
        {variant !== 'cashier' ? (
          <Link to="/cashier" className="text-teal-800 hover:underline">
            Cashier Desk →
          </Link>
        ) : null}
        {variant !== 'accounting' ? (
          <Link to="/accounting" className="text-teal-800 hover:underline">
            Accounting Desk →
          </Link>
        ) : null}
        <Link to="/accounts?tab=receipts" className="text-teal-800 hover:underline">
          Finance receipts queue →
        </Link>
        <Link to="/exec" className="text-teal-800 hover:underline">
          Command Centre →
        </Link>
      </div>
    </section>
  );
}
