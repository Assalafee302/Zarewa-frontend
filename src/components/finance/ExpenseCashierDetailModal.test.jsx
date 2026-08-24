import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ExpenseCashierDetailModal } from './ExpenseCashierDetailModal.jsx';
import { apiFetch } from '../../lib/apiBase';

vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(),
  apiUrl: (path) => path,
}));

vi.mock('../../lib/expenseRequestPrint', () => ({
  printExpenseRequestRecord: vi.fn(),
}));

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    snapshot: {
      paymentRequests: [
        {
          requestID: 'PR-OLD',
          payeeName: 'NNPC Depot',
          amountRequestedNgn: 80_000,
          paidAmountNgn: 80_000,
          requestDate: '2026-08-18',
          description: 'Diesel for generator',
          approvalStatus: 'Approved',
        },
      ],
      treasuryMovements: [],
    },
  }),
}));

const request = {
  requestID: 'PR-NEW',
  payeeName: 'NNPC Depot',
  payeeAccountNo: '0123456789',
  payeeBankName: 'GTBank',
  amountRequestedNgn: 80_000,
  paidAmountNgn: 0,
  requestDate: '2026-08-24',
  description: 'Diesel for generator',
  expenseCategory: 'Fuel & lubricant',
  approvalStatus: 'Approved',
  lineItems: [{ item: 'Diesel 200L', unit: 200, unitPriceNgn: 400, lineTotalNgn: 80_000 }],
};

describe('ExpenseCashierDetailModal', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(apiFetch).mockReset();
  });

  it('shows memo, payee, lines, and a similar paid request to compare', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: { ok: true, request } });

    render(<ExpenseCashierDetailModal request={request} isOpen onClose={() => {}} />);

    expect(screen.getAllByText('PR-NEW').length).toBeGreaterThan(0);
    expect(screen.getByText('Diesel for generator')).toBeInTheDocument();
    expect(screen.getAllByText('NNPC Depot').length).toBeGreaterThan(0);
    expect(screen.getByText(/Diesel 200L/i)).toBeInTheDocument();
    expect(await screen.findByTestId('expense-similar-banner')).toHaveTextContent(/similar request/i);
    expect(screen.getByText('PR-OLD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compare/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /compare/i }));
    expect(screen.getByText('This request')).toBeInTheDocument();
    expect(screen.getByText('Compare with')).toBeInTheDocument();
  });

  it('offers payout when an amount is still due', () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: { ok: true, request } });
    const onPay = vi.fn();
    render(<ExpenseCashierDetailModal request={request} isOpen onClose={() => {}} onPay={onPay} />);
    expect(screen.getByRole('button', { name: /payout/i })).toBeInTheDocument();
  });
});
