import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinanceDeskWorkQueues } from './FinanceDeskWorkQueues.jsx';

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    viewAllBranches: false,
    branchLabel: 'Yola',
    branchScope: 'BR-YOL',
    snapshot: {
      receipts: [],
      treasuryAccounts: [{ id: 'a1', name: 'Main till', type: 'cash', balance: 1000 }],
      paymentRequests: [],
      refunds: [],
    },
    session: { user: { roleKey: 'cashier', permissions: ['cashier.desk.view'] } },
  }),
}));

vi.mock('../../hooks/useFinanceTrialExceptions', () => ({
  useFinanceTrialExceptions: () => ({
    data: null,
    loading: false,
    error: null,
    reload: () => {},
  }),
}));

describe('FinanceDeskWorkQueues', () => {
  it('renders branch desk queues without crashing', () => {
    render(
      <MemoryRouter>
        <FinanceDeskWorkQueues
          onConfirmReceipt={() => {}}
          onPayRequest={() => {}}
          onPayRefund={() => {}}
          onPayPoTransport={() => {}}
          onGoToTab={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/cashier desk/i)).toBeTruthy();
    expect(screen.getByText(/PO transport \/ haulage to pay/i)).toBeTruthy();
    expect(screen.getByText(/Branch treasury balances/i)).toBeTruthy();
  });
});
