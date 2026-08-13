import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CashierBankChargeModal } from './CashierBankChargeModal.jsx';

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    viewAllBranches: false,
    branchScope: 'BR-YOL',
    canMutate: true,
    snapshot: {
      treasuryAccounts: [
        {
          id: 1,
          name: 'GTBank Main',
          bankName: 'Guaranty Trust Bank',
          type: 'Bank',
          balance: 500000,
          openingBalanceNgn: 500000,
          branchId: 'BR-YOL',
          accNo: '0123456789',
        },
      ],
      treasuryMovements: [],
    },
    session: { user: { roleKey: 'cashier' }, currentBranchId: 'BR-YOL' },
    hasPermission: (p) => p === 'finance.pay',
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ show: () => {}, dismiss: () => {} }),
}));

describe('CashierBankChargeModal', () => {
  it('shows date, amount, and account fields', () => {
    render(<CashierBankChargeModal open onClose={() => {}} />);
    expect(screen.getAllByText(/Record bank charge/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Date/i)).toBeTruthy();
    expect(screen.getByLabelText(/Amount/i)).toBeTruthy();
    expect(screen.getByLabelText(/Which account/i)).toBeTruthy();
    expect(screen.getByLabelText(/Charge type/i)).toBeTruthy();
  });
});
