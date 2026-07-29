import React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManagerSpendTab } from './ManagerSpendTab.jsx';

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub;
});

const snapshot = {
  branches: [{ id: 'BR-KD', name: 'Kaduna' }],
  paymentRequests: [
    {
      requestID: 'PR-BM-1',
      requestDate: '2026-07-08',
      approvalStatus: 'Approved',
      amountRequestedNgn: 120_000,
      paidAmountNgn: 120_000,
      expenseCategory: 'Maintenance',
      branchId: 'BR-KD',
      payeeName: 'Musa Eng',
      description: 'Bearing job',
    },
  ],
  expenses: [],
};

function renderSpend(roleKey, permissions) {
  return render(
    <MemoryRouter>
      <ManagerSpendTab
        snapshot={snapshot}
        branchId="BR-KD"
        branchLabel="Kaduna"
        viewAllBranches={false}
        roleKey={roleKey}
        permissions={permissions}
      />
    </MemoryRouter>
  );
}

describe('ManagerSpendTab drill-down access', () => {
  it('BM drill modal shows Finance-desk copy and no /accounts link', () => {
    renderSpend('sales_manager', ['expenses.create', 'reports.view', 'finance.approve']);
    fireEvent.click(screen.getByRole('button', { name: /Total expenses/i }));
    expect(screen.getByText(/Payouts & expenses stay on the Finance desk/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Full Payouts & expenses/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /accounts/i })).toBeNull();
  });

  it('MD drill modal can link to Payouts & expenses', () => {
    renderSpend('md', ['finance.view', 'reports.view']);
    fireEvent.click(screen.getByRole('button', { name: /Total expenses/i }));
    const link = screen.getByRole('link', { name: /Full Payouts & expenses/i });
    expect(link).toHaveAttribute('href', '/accounts?tab=disbursements');
  });
});
