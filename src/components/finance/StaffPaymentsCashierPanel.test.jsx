import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaffPaymentsCashierPanel } from './StaffPaymentsCashierPanel';

const sampleRecoveries = [
  {
    scheduleId: 'S1',
    staffDisplayName: 'Ada Lovelace',
    staffEmployeeNo: 'E001',
    principalOutstandingNgn: 5000,
    caseNumber: 'C-1',
  },
];

const sampleObligations = [
  {
    id: 'O1',
    staffDisplayName: 'Bob Smith',
    staffEmployeeNo: 'E002',
    principalOutstandingNgn: 12000,
    kindLabel: 'Staff loan',
    title: 'Emergency loan',
  },
];

describe('StaffPaymentsCashierPanel', () => {
  it('keeps employee names hidden until expanded', () => {
    render(
      <StaffPaymentsCashierPanel
        recoveries={sampleRecoveries}
        obligations={sampleObligations}
        onReceiveRecovery={vi.fn()}
        onReceiveObligation={vi.fn()}
      />
    );
    expect(screen.getByTestId('finance-staff-payments-awaiting')).toBeTruthy();
    expect(screen.getByText(/2 due/i)).toBeTruthy();
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
    expect(screen.queryByText('Bob Smith')).toBeNull();
    expect(screen.getByText(/Private — employee names stay hidden/i)).toBeTruthy();
  });

  it('shows rows when expanded', () => {
    render(
      <StaffPaymentsCashierPanel
        recoveries={sampleRecoveries}
        obligations={sampleObligations}
        onReceiveRecovery={vi.fn()}
        onReceiveObligation={vi.fn()}
        expanded
      />
    );
    expect(screen.getByTestId('finance-staff-payment-row-recovery:S1')).toBeTruthy();
    expect(screen.getByTestId('finance-staff-payment-row-obligation:O1')).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Bob Smith')).toBeTruthy();
  });

  it('returns null when nothing is due', () => {
    const { container } = render(
      <StaffPaymentsCashierPanel recoveries={[]} obligations={[]} onReceiveRecovery={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
