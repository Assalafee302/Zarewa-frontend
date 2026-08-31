import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinanceTreasuryAwaitingPayoutQueues } from './FinanceTreasuryAwaitingPayoutQueues.jsx';

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    session: { user: { roleKey: 'cashier', permissions: ['finance.pay'] } },
    hasPermission: (p) => p === 'finance.pay',
  }),
}));

describe('FinanceTreasuryAwaitingPayoutQueues', () => {
  it('renders refund and expense payout panels with shared test ids', () => {
    render(
      <FinanceTreasuryAwaitingPayoutQueues
        refunds={[
          {
            refundID: 'RF-1',
            customer: 'Acme',
            approvedAmountNgn: 1000,
            paidAmountNgn: 0,
          },
          {
            refundID: 'RF-2',
            customer: 'Grace Emmanuel',
            approvedAmountNgn: 45000,
            paidAmountNgn: 4000,
            paymentNote: 'Settled at approval: company cut ₦4,000 → retention ledger.',
            splitDistributions: [],
          },
        ]}
        paymentRequests={[
          {
            requestID: 'PR-1',
            description: 'Fuel',
            amountRequestedNgn: 2000,
            paidAmountNgn: 0,
            expenseID: 'E-1',
            expenseCategory: 'Fuel & lubricant',
            expenseCategoryLane: 'production',
          },
          {
            requestID: 'PR-MWO',
            description: 'Technician lodging',
            amountRequestedNgn: 5000,
            paidAmountNgn: 0,
            maintenanceWorkOrderId: 'MWO-1',
            maintenanceCostKind: 'accommodation',
          },
        ]}
        registerSettlements={[]}
        poTransport={[]}
        renderRefundActions={() => <button type="button">Pay refund</button>}
        renderPaymentRequestActions={() => <button type="button">Pay expense</button>}
        renderRegisterSettlementActions={() => null}
        renderPoTransportActions={() => null}
      />
    );
    expect(screen.getByTestId('finance-payouts-combined')).toBeTruthy();
    expect(screen.getByTestId('finance-refunds-awaiting-payout')).toBeTruthy();
    expect(screen.getByTestId('finance-payment-requests-awaiting-payout')).toBeTruthy();
    expect(screen.getByTestId('finance-refund-awaiting-row-RF-1-customer-0')).toBeTruthy();
    expect(screen.getByTestId('finance-refund-awaiting-row-RF-2-customer-0')).toBeTruthy();
    expect(screen.getAllByTestId('finance-queue-status-dot').length).toBeGreaterThan(0);
    expect(screen.getByTestId('finance-preq-awaiting-row-PR-1')).toBeTruthy();
    expect(screen.getByText('Fuel & lubricant')).toBeTruthy();
    expect(screen.getAllByText(/Work order MWO-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Accommodation/).length).toBeGreaterThan(0);
  });
});
