import React from 'react';

/**
 * Explains branch cashier responsibility for loan payout and cash/bank repayments.
 * @param {{ variant?: 'disbursement' | 'repayment' | 'both' | 'legacy' }} props
 */
export function HrStaffLoanBranchCashierNote({ variant = 'both' }) {
  const showDisbursement = variant === 'both' || variant === 'disbursement';
  const showRepayment = variant === 'both' || variant === 'repayment' || variant === 'legacy';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 space-y-1.5">
      {showDisbursement ? (
        <p>
          <strong className="text-slate-800">After GM HR approval:</strong> the employee&apos;s branch cashier pays the
          loan from <strong>Finance → My desk</strong> (staff loan payment request). HQ and mining staff use{' '}
          <strong>Kaduna (HQ)</strong>; domestic staff use their host branch.
        </p>
      ) : null}
      {showRepayment ? (
        <p>
          <strong className="text-slate-800">
            {variant === 'legacy' ? 'Cash or bank repayments' : 'Early cash or bank repayments'}
          </strong>{' '}
          (not payroll deduction) are collected at the employee&apos;s branch cashier —{' '}
          <strong>Finance → My desk → Staff payments</strong>. Payroll deductions still post on locked runs.
        </p>
      ) : null}
    </div>
  );
}
