import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PayrollMdApprovalPreview } from './PayrollMdApprovalPreview.jsx';
import { InterBranchLoanApprovalPreview } from './InterBranchLoanApprovalPreview.jsx';
import { StockRegisterApprovalPreview } from './StockRegisterApprovalPreview.jsx';

function money(n) {
  return `₦${Number(n || 0).toLocaleString('en-NG')}`;
}

describe('PayrollMdApprovalPreview', () => {
  it('shows net, headcount, and that sign-off does not pay staff', () => {
    render(
      <PayrollMdApprovalPreview
        payrollRunId="PR-202509"
        row={{ periodYyyymm: '202509' }}
        totals={{ headcount: 42, grossTotalNgn: 12_000_000, netTotalNgn: 9_500_000, taxTotalNgn: 800_000 }}
        formatNgn={money}
      />
    );
    expect(screen.getByText(/payroll md sign-off/i)).toBeTruthy();
    expect(screen.getByText(/september 2025/i)).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText(/does not itself send money/i)).toBeTruthy();
  });
});

describe('InterBranchLoanApprovalPreview', () => {
  it('shows lending route and that approve moves cash', () => {
    render(
      <InterBranchLoanApprovalPreview
        loanId="IBL-3"
        formatNgn={money}
        branchNameById={{ 'BR-KD': 'Kano', 'BR-AB': 'Abuja' }}
        loan={{
          lenderBranchId: 'BR-KD',
          borrowerBranchId: 'BR-AB',
          principalNgn: 2_000_000,
          purpose: 'Coil cover',
        }}
      />
    );
    expect(screen.getByText('IBL-3')).toBeTruthy();
    expect(screen.getByText('Kano')).toBeTruthy();
    expect(screen.getByText('Abuja')).toBeTruthy();
    expect(screen.getByText(/lending branch treasury/i)).toBeTruthy();
  });
});

describe('StockRegisterApprovalPreview', () => {
  it('says MD approval is no longer required', () => {
    render(
      <StockRegisterApprovalPreview periodKey="2025-09" branchLabel="Kano" status="awaiting_costing" />
    );
    expect(screen.getByText(/month-end stock register/i)).toBeTruthy();
    expect(screen.getByText(/md approval is no longer required/i)).toBeTruthy();
  });
});
