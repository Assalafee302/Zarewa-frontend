import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FinanceCashierPayoutsPanel } from './FinanceCashierPayoutsPanel.jsx';
import { AccountPageContext } from '../../pages/account/AccountPageContext.jsx';

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    snapshot: {
      paymentRequests: [
        {
          requestID: 'PR-OLD',
          approvalStatus: 'Approved',
          amountRequestedNgn: 15000,
          paidAmountNgn: 0,
          payeeName: 'Diesel Yard',
          approvedAtISO: '2026-09-01',
        },
        {
          requestID: 'PR-NEW',
          approvalStatus: 'Approved',
          amountRequestedNgn: 2000,
          paidAmountNgn: 0,
          payeeName: 'Ada Musa',
          approvedAtISO: '2026-09-28',
        },
      ],
      refunds: [],
      registerSettlementsAwaitingPayment: [],
      poTransportAwaitingTreasury: [],
    },
    session: { user: { roleKey: 'cashier' } },
    hasPermission: () => true,
  }),
}));

function renderPanel() {
  const page = {
    handleDeskPayRequest: vi.fn(),
    handleDeskPayRefund: vi.fn(),
    handleDeskViewRefund: vi.fn(),
    handleDeskViewPaymentRequest: vi.fn(),
    handleDeskPayRegisterSettlement: vi.fn(),
    handleDeskPayPoTransport: vi.fn(),
    canPayRequests: true,
    paymentsListWindow: { slice: [], total: 0, pageCount: 1, safePage: 0, from: 0, to: 0 },
    paymentsRegisterTotalNgn: 0,
    setPaymentsTablePage: vi.fn(),
    togglePaymentsSort: vi.fn(),
    paymentsTableSortKey: 'date',
    paymentsTableSortDir: 'desc',
    disbursementsSearch: '',
    setDisbursementsSearch: vi.fn(),
    ws: { snapshot: {} },
  };
  render(
    <AccountPageContext.Provider value={page}>
      <FinanceCashierPayoutsPanel />
    </AccountPageContext.Provider>
  );
  return page;
}

afterEach(() => cleanup());

describe('FinanceCashierPayoutsPanel', () => {
  it('shows ready total and sorts the queue by age', () => {
    renderPanel();
    expect(screen.getByTestId('finance-payout-metric-ready').textContent).toMatch(/17,000/);
    fireEvent.change(screen.getByLabelText('Search payouts to pay'), { target: { value: 'Diesel' } });
    expect(screen.getByText('Diesel Yard')).toBeTruthy();
    expect(screen.queryByText('Ada Musa')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Due/ }));
    const payees = screen.getAllByRole('row').map((row) => row.textContent);
    const diesel = payees.findIndex((text) => text.includes('Diesel Yard'));
    const ada = payees.findIndex((text) => text.includes('Ada Musa'));
    expect(diesel).toBeGreaterThan(0);
    expect(diesel).toBeLessThan(ada);
  });

  it('expands a payout row to show payee account details', () => {
    renderPanel();
    const dieselCell = screen.getByText('Diesel Yard');
    fireEvent.click(dieselCell.closest('tr'));
    expect(screen.getByText(/No bank account on this line/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Execute payout' })).toBeTruthy();
  });
});
