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
      treasuryAccounts: [
        {
          id: 1,
          name: 'Main till',
          type: 'Cash',
          balance: 1000,
          openingBalanceNgn: 1000,
          branchId: 'BR-YOL',
          accNo: 'TILL-1',
        },
      ],
      treasuryMovements: [],
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
  it('renders liquidity header and treasury account cards', () => {
    render(
      <MemoryRouter>
        <FinanceDeskWorkQueues
          onConfirmReceipt={() => {}}
          onPayRequest={() => {}}
          onPayRefund={() => {}}
          onPayRegisterSettlement={() => {}}
          onPayPoTransport={() => {}}
          onGoToTab={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/cashier desk/i)).toBeTruthy();
    expect(screen.getByText(/Total liquidity/i)).toBeTruthy();
    expect(screen.getByText(/Branch treasury accounts/i)).toBeTruthy();
    expect(screen.getByTestId('desk-all-clear')).toBeTruthy();
    expect(screen.getByText(/Main till/i)).toBeTruthy();
  });
});
