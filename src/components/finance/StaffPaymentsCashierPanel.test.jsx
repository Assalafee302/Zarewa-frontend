import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaffPaymentsCashierPanel } from './StaffPaymentsCashierPanel';

describe('StaffPaymentsCashierPanel', () => {
  it('merges recovery and loan rows in one compact queue', () => {
    render(
      <StaffPaymentsCashierPanel
        recoveries={[
          {
            scheduleId: 'S1',
            staffDisplayName: 'Ada Lovelace',
            staffEmployeeNo: 'E001',
            principalOutstandingNgn: 5000,
            caseNumber: 'C-1',
          },
        ]}
        obligations={[
          {
            id: 'O1',
            staffDisplayName: 'Bob Smith',
            staffEmployeeNo: 'E002',
            principalOutstandingNgn: 12000,
            kindLabel: 'Staff loan',
            title: 'Emergency loan',
          },
        ]}
        onReceiveRecovery={vi.fn()}
        onReceiveObligation={vi.fn()}
      />
    );
    expect(screen.getByTestId('finance-staff-payments-awaiting')).toBeTruthy();
    expect(screen.getByTestId('finance-staff-payment-row-recovery:S1')).toBeTruthy();
    expect(screen.getByTestId('finance-staff-payment-row-obligation:O1')).toBeTruthy();
    expect(screen.getByText(/Staff payments — loans, credit & recoveries/i)).toBeTruthy();
  });

  it('returns null when nothing is due', () => {
    const { container } = render(
      <StaffPaymentsCashierPanel recoveries={[]} obligations={[]} onReceiveRecovery={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
