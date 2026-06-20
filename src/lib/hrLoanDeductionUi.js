import { formatNgn } from './hrFormat';
import { formatPeriodYyyymm } from './hrPayroll';

/**
 * Human-readable payroll deduction line for an active or pending loan.
 * @param {{ status?: string; monthlyDeductionNgn?: number; monthsPaid?: number; outstandingNgn?: number; expectedStartPeriod?: string; title?: string }} loan
 */
export function loanPayrollDeductionMessage(loan) {
  if (!loan) return null;
  const monthly = Math.round(Number(loan.monthlyDeductionNgn) || 0);
  if (monthly <= 0) return null;

  const status = String(loan.status || '').toLowerCase();
  const monthsPaid = Math.round(Number(loan.monthsPaid) || 0);
  const label = loan.title ? `"${loan.title}"` : 'your staff loan';
  const startLabel = loan.expectedStartPeriod ? formatPeriodYyyymm(String(loan.expectedStartPeriod).replace(/\D/g, '').slice(0, 6)) : null;

  if (status === 'pending_disbursement') {
    return startLabel
      ? `After payout, payroll will deduct ${formatNgn(monthly)}/month for ${label}, starting ${startLabel}.`
      : `After payout, payroll will deduct ${formatNgn(monthly)}/month for ${label}.`;
  }

  if (status === 'active' || (Number(loan.outstandingNgn) > 0 && status !== 'paid_off')) {
    if (monthsPaid <= 0) {
      return startLabel
        ? `First payroll deduction for ${label}: ${formatNgn(monthly)}/month from ${startLabel}.`
        : `Payroll deducts ${formatNgn(monthly)}/month for ${label} — first deduction on the next locked run.`;
    }
    return `Payroll deducts ${formatNgn(monthly)}/month for ${label} (${monthsPaid} month${monthsPaid === 1 ? '' : 's'} paid).`;
  }

  return null;
}

/** Loans that should show a payroll deduction notice on overview screens. */
export function loansWithPayrollDeduction(schedule = []) {
  return schedule.filter((loan) => {
    const monthly = Math.round(Number(loan.monthlyDeductionNgn) || 0);
    if (monthly <= 0) return false;
    const status = String(loan.status || '').toLowerCase();
    return status === 'active' || status === 'pending_disbursement';
  });
}
