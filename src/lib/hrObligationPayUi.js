import { formatNgn } from './hrFormat';
import { formatPeriodYyyymm } from './hrPayroll';

const KIND_LABEL = {
  loan: 'Staff loan',
  purchase: 'Purchase credit',
};

/**
 * Normalize loan schedule row or money-summary obligation into a shared payback shape.
 * @param {object} row
 * @param {'loan'|'purchase'} kind
 */
export function normalizeObligationForPayback(row, kind = 'loan') {
  if (!row) return null;
  const outstanding = Math.max(0, Math.round(Number(row.outstandingNgn ?? row.principalOutstandingNgn) || 0));
  const monthly = Math.round(Number(row.monthlyDeductionNgn ?? row.installmentNgn) || 0);
  const status = String(row.status || '').toLowerCase();
  const id = row.obligationAccountId || row.id || row.requestId;
  if (!id) return null;
  const deductionsActive =
    row.deductionsActive !== false && status !== 'pending_approval' && status !== 'pending_disbursement';
  const pauseUntilIso = row.pauseUntilIso || null;
  const pauseReason = row.pauseReason || null;
  const isPaused =
    outstanding > 0 &&
    (row.deductionsActive === false || status === 'inactive') &&
    !['pending_approval', 'pending_disbursement', 'paid_off'].includes(status);
  return {
    id,
    kind,
    kindLabel: KIND_LABEL[kind] || kind,
    title: row.title || (kind === 'purchase' ? 'Staff purchase credit' : 'Staff loan'),
    principalOriginalNgn: Math.round(Number(row.amountNgn ?? row.principalOriginalNgn) || 0),
    outstandingNgn: outstanding,
    monthlyNgn: monthly,
    monthsPaid: Math.round(Number(row.monthsPaid) || 0),
    termMonths: Math.round(Number(row.termMonths ?? row.repaymentMonths) || 0),
    status,
    quotationRef: row.quotationRef || null,
    expectedStartPeriod: row.expectedStartPeriod || null,
    note: row.note || null,
    deductionsActive,
    pauseUntilIso,
    pauseReason,
    isPaused,
  };
}

/** Active loan + purchase obligations with a balance or pending approval. */
export function collectRepayableObligations({ schedule = [], purchases = [] } = {}) {
  const loans = schedule
    .map((l) => normalizeObligationForPayback(l, 'loan'))
    .filter((o) => o && (o.outstandingNgn > 0 || o.status === 'pending_disbursement' || o.status === 'pending_approval'));
  const credit = (Array.isArray(purchases) ? purchases : [])
    .map((p) => normalizeObligationForPayback(p, 'purchase'))
    .filter((o) => o && (o.outstandingNgn > 0 || o.status === 'pending_approval'));
  return [...loans, ...credit];
}

/**
 * Human-readable payroll deduction line for loans and purchase credit.
 * @param {ReturnType<typeof normalizeObligationForPayback>} obligation
 */
export function obligationPayrollDeductionMessage(obligation) {
  if (!obligation) return null;
  if (obligation.isPaused) {
    const label = obligation.title ? `"${obligation.title}"` : `your ${obligation.kindLabel.toLowerCase()}`;
    const until = obligation.pauseUntilIso
      ? ` until ${String(obligation.pauseUntilIso).slice(0, 10)}`
      : '';
    return `${label} — payroll deductions are paused${until}. You can still pay early at Finance or via HR.`;
  }
  const monthly = obligation.monthlyNgn;
  if (monthly <= 0) return null;

  const { status, monthsPaid, title, expectedStartPeriod, kindLabel } = obligation;
  const label = title ? `"${title}"` : `your ${kindLabel.toLowerCase()}`;
  const startLabel = expectedStartPeriod
    ? formatPeriodYyyymm(String(expectedStartPeriod).replace(/\D/g, '').slice(0, 6))
    : null;

  if (status === 'pending_disbursement' || status === 'pending_approval') {
    if (status === 'pending_approval') {
      return `${label} — payroll deduction of ${formatNgn(monthly)}/month starts after approval.`;
    }
    return startLabel
      ? `After payout, payroll will deduct ${formatNgn(monthly)}/month for ${label}, starting ${startLabel}.`
      : `After payout, payroll will deduct ${formatNgn(monthly)}/month for ${label}.`;
  }

  if (status === 'active' || (obligation.outstandingNgn > 0 && status !== 'paid_off')) {
    if (monthsPaid <= 0) {
      return startLabel
        ? `First payroll deduction for ${label}: ${formatNgn(monthly)}/month from ${startLabel}.`
        : `Payroll deducts ${formatNgn(monthly)}/month for ${label} — no action needed each month.`;
    }
    return `Payroll deducts ${formatNgn(monthly)}/month for ${label} (${monthsPaid} month${monthsPaid === 1 ? '' : 's'} paid).`;
  }

  return null;
}

/** Obligations that should show payroll deduction messaging. */
export function obligationsWithPayrollDeduction(obligations = []) {
  return obligations.filter((o) => {
    if (!o || o.monthlyNgn <= 0 || o.isPaused) return false;
    return ['active', 'pending_disbursement', 'pending_approval'].includes(o.status);
  });
}

export function totalMonthlyPayrollDeduction(obligations = []) {
  return obligationsWithPayrollDeduction(obligations).reduce((s, o) => s + o.monthlyNgn, 0);
}

export function totalOutstandingNgn(obligations = []) {
  return obligations.reduce((s, o) => s + (o.outstandingNgn || 0), 0);
}
