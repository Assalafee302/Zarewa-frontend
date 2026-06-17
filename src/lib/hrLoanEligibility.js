import { formatNgn } from './hrFormat';

/**
 * @param {{
 *   hr?: { dateJoinedIso?: string; baseSalaryNgn?: number; housingAllowanceNgn?: number; transportAllowanceNgn?: number; compensationRedacted?: boolean };
 *   loanPolicy?: { loanMinServiceYears?: number; loanMaxSalaryMonths?: number; loanMaxRepaymentMonths?: number };
 *   hasGuarantorDoc?: boolean;
 *   activeLoanOutstandingNgn?: number;
 * }} input
 */
export function computeLoanEligibility(input = {}) {
  const { hr, loanPolicy, hasGuarantorDoc, activeLoanOutstandingNgn = 0 } = input;
  const policy = loanPolicy || {
    loanMinServiceYears: 3,
    loanMaxSalaryMonths: 4,
    loanMaxRepaymentMonths: 12,
  };

  const joined = String(hr?.dateJoinedIso || '').slice(0, 10);
  let serviceYears = 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(joined)) {
    const start = new Date(`${joined}T12:00:00Z`).getTime();
    serviceYears = Math.max(0, (Date.now() - start) / (365.25 * 24 * 60 * 60 * 1000));
  }

  const grossSalaryNgn =
    hr && !hr.compensationRedacted
      ? Math.round(
          (Number(hr.baseSalaryNgn) || 0) +
            (Number(hr.housingAllowanceNgn) || 0) +
            (Number(hr.transportAllowanceNgn) || 0)
        ) || Number(hr.baseSalaryNgn) || 0
      : null;

  const maxLoanNgn =
    grossSalaryNgn && policy.loanMaxSalaryMonths
      ? Math.round(grossSalaryNgn * Number(policy.loanMaxSalaryMonths))
      : null;

  const issues = [];
  const warnings = [];

  if (serviceYears < Number(policy.loanMinServiceYears || 3)) {
    issues.push(
      `Minimum ${policy.loanMinServiceYears} years of service required (you have ~${serviceYears.toFixed(1)} years).`
    );
  }
  if (activeLoanOutstandingNgn > 0) {
    issues.push(`Active loan outstanding: ${formatNgn(activeLoanOutstandingNgn)}. Contact HR for exceptional top-up.`);
  }
  if (!hasGuarantorDoc) {
    issues.push('Signed guarantor form must be uploaded under Documents.');
  }
  if (hr?.compensationRedacted) {
    warnings.push('Unlock compensation to see your policy maximum loan amount.');
  }

  const eligible = issues.length === 0;

  return {
    eligible,
    serviceYears,
    grossSalaryNgn,
    maxLoanNgn,
    policy,
    issues,
    warnings,
  };
}

export function loanRepaymentPreview(amountNgn, repaymentMonths) {
  const amount = Math.round(Number(amountNgn) || 0);
  const months = Math.round(Number(repaymentMonths) || 0);
  if (amount <= 0 || months <= 0) return null;
  const monthly = Math.ceil(amount / months);
  return { amountNgn: amount, repaymentMonths: months, monthlyDeductionNgn: monthly, totalNgn: monthly * months };
}
