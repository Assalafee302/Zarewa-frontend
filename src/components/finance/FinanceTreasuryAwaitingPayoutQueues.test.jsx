import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinanceTreasuryAwaitingPayoutQueues } from './FinanceTreasuryAwaitingPayoutQueues.jsx';

describe('FinanceTreasuryAwaitingPayoutQueues', () => {
  it('renders refund and expense payout panels with shared test ids', () => {
    render(
      <FinanceTreasuryAwaitingPayoutQueues
        refunds={[{ refundID: 'RF-1', customer: 'Acme', approvedAmountNgn: 1000, paidAmountNgn: 0 }]}
        paymentRequests={[
          {
            requestID: 'PR-1',
            description: 'Fuel',
            amountRequestedNgn: 2000,
            paidAmountNgn: 0,
            expenseID: 'E-1',
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
    expect(screen.getByTestId('finance-refunds-awaiting-payout')).toBeTruthy();
    expect(screen.getByTestId('finance-payment-requests-awaiting-payout')).toBeTruthy();
    expect(screen.getByTestId('finance-refund-awaiting-row-RF-1')).toBeTruthy();
    expect(screen.getByTestId('finance-preq-awaiting-row-PR-1')).toBeTruthy();
  });
});
