import React from 'react';
import { ProfileInlineAlert } from '../profile/profileOverviewUi';
import { loanPayrollDeductionMessage } from '../../lib/hrLoanDeductionUi';

/**
 * Explains upcoming or active payroll deductions for staff loans.
 * @param {{ loans?: object[]; variant?: 'info'|'warning' }} props
 */
export function HrLoanPayrollDeductionBanner({ loans = [], variant = 'info' }) {
  const messages = loans.map((loan) => loanPayrollDeductionMessage(loan)).filter(Boolean);
  if (!messages.length) return null;

  return (
    <ProfileInlineAlert variant={variant}>
      <p className="font-semibold">Payroll loan deductions</p>
      <ul className="mt-2 space-y-1 text-xs">
        {messages.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </ProfileInlineAlert>
  );
}
