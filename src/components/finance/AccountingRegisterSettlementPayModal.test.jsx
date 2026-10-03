import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { AccountingRegisterSettlementPayModal } from './AccountingRegisterSettlementPayModal.jsx';

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    snapshot: {
      treasuryMovements: [],
      treasuryAccounts: [
        { id: '1', name: 'Main Cash Till', type: 'Till', balance: 500_000 },
      ],
    },
    session: { user: { displayName: 'Finance Officer' } },
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

vi.mock('../../hooks/useAccountingRegisterSettlements', () => ({
  useRegisterSettlementMutations: () => ({
    busy: false,
    error: null,
    paySettlement: vi.fn().mockResolvedValue({ ok: true }),
  }),
}));

describe('AccountingRegisterSettlementPayModal', () => {
  afterEach(() => {
    cleanup();
  });

  const baseSettlement = {
    settlementId: 'STL-KD-26-0015',
    registerName: 'Main Cash Register',
    partyName: 'Amina Bello (Cashier)',
    approvedAmountNgn: 120_000,
    paidAmountNgn: 20_000,
    reason: 'Midday cash vault drop to main safe',
    requestedByName: 'Amina Bello',
    approvedByName: 'Branch Manager',
    payeeName: 'Amina Bello',
    payeeBankDetails: 'First Bank · 3098765432',
    branchId: 'KD',
  };

  it('renders settlement payout modal with hero card, balance due, and payee details', () => {
    render(
      <AccountingRegisterSettlementPayModal
        settlement={baseSettlement}
        open={true}
        onClose={vi.fn()}
        onPaid={vi.fn()}
      />
    );

    expect(screen.getByText('Register Withdrawal Payout')).toBeInTheDocument();
    expect(screen.getByText('STL-KD-26-0015')).toBeInTheDocument();
    expect(screen.getAllByText('Amina Bello').length).toBeGreaterThan(0);
    expect(screen.getByText(/Amina Bello \(Cashier\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/3098765432/).length).toBeGreaterThan(0);
    expect(screen.getByText('Disbursement')).toBeInTheDocument();
    expect(screen.getByText('Settlement Details')).toBeInTheDocument();
  });

  it('switches between Disbursement and Settlement Details tabs', () => {
    render(
      <AccountingRegisterSettlementPayModal
        settlement={baseSettlement}
        open={true}
        onClose={vi.fn()}
        onPaid={vi.fn()}
      />
    );

    const detailsTab = screen.getByRole('tab', { name: /Settlement Details/i });
    fireEvent.click(detailsTab);

    expect(screen.getAllByText('Midday cash vault drop to main safe').length).toBeGreaterThan(0);
    expect(screen.getByText('Withdrawal Reason / Purpose')).toBeInTheDocument();
  });
});
