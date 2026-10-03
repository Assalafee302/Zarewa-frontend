import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { PaymentRequestPayoutModal } from './PaymentRequestPayoutModal.jsx';

describe('PaymentRequestPayoutModal', () => {
  afterEach(() => {
    cleanup();
  });

  const basePaymentRequest = {
    type: 'payment_request',
    id: 'PR-KD-26-0042',
    total: 250_000,
    paid: 50_000,
    category: 'Factory Consumables',
    expenseCategory: 'Factory Consumables',
    description: 'Monthly lubrication oil and generator consumables',
    payeeName: 'Musa & Sons Oil Supplies',
    payeeBankName: 'Zenith Bank',
    payeeAccountNo: '1012345678',
    requestDate: '2026-10-01',
    approvedAtISO: '2026-10-02T10:00:00Z',
    approvedBy: 'Branch Manager',
    approvalNote: 'Approved under routine facility maintenance budget.',
    branchId: 'KD',
  };

  const bankAccounts = [
    { id: 1, name: 'Main Cash Till', type: 'Till', balance: 400_000 },
    { id: 2, name: 'Zenith Ops Account', type: 'Bank', balance: 2_500_000 },
  ];

  const payLines = [
    { id: 'line-1', treasuryAccountId: '2', dateISO: '2026-10-03', amount: '200000', reference: 'Zenith-TRF-401' },
  ];

  it('renders payout modal with net balance due and payee bank details', () => {
    render(
      <PaymentRequestPayoutModal
        isOpen
        onClose={vi.fn()}
        selectedPayment={basePaymentRequest}
        bankAccounts={bankAccounts}
        bankAccountsSelectOrder={bankAccounts}
        treasuryBookDisplayNgn={(a) => a.balance}
        treasuryAccountDisplayName={(a) => a.name}
        requestPayLines={payLines}
        onAddPayLine={vi.fn()}
        onUpdatePayLine={vi.fn()}
        onRemovePayLine={vi.fn()}
        requestPayNote=""
        onRequestPayNoteChange={vi.fn()}
        onConfirmPay={vi.fn()}
      />
    );

    expect(screen.getByText('Expense Payout')).toBeInTheDocument();
    expect(screen.getByText('PR-KD-26-0042')).toBeInTheDocument();
    expect(screen.getByText('Zenith Bank')).toBeInTheDocument();
    expect(screen.getByText('1012345678')).toBeInTheDocument();
    expect(screen.getByText('Disbursement')).toBeInTheDocument();
    expect(screen.getByText('Details & GL Readiness')).toBeInTheDocument();
  });

  it('switches between Disbursement and Details tabs', () => {
    render(
      <PaymentRequestPayoutModal
        isOpen
        onClose={vi.fn()}
        selectedPayment={basePaymentRequest}
        bankAccounts={bankAccounts}
        bankAccountsSelectOrder={bankAccounts}
        treasuryBookDisplayNgn={(a) => a.balance}
        treasuryAccountDisplayName={(a) => a.name}
        requestPayLines={payLines}
        onAddPayLine={vi.fn()}
        onUpdatePayLine={vi.fn()}
        onRemovePayLine={vi.fn()}
        requestPayNote=""
        onRequestPayNoteChange={vi.fn()}
        onConfirmPay={vi.fn()}
      />
    );

    const detailsTab = screen.getByRole('tab', { name: /Details & GL Readiness/i });
    fireEvent.click(detailsTab);

    expect(screen.getAllByText('Monthly lubrication oil and generator consumables').length).toBeGreaterThan(0);
    expect(screen.getByText('Memo / Description')).toBeInTheDocument();
    expect(screen.getByText(/Approved under routine facility maintenance budget/i)).toBeInTheDocument();
  });

  it('supports po_transport payment rendering with correct badges and actions', () => {
    const poTransportPayment = {
      type: 'po_transport',
      id: 'PO-KD-26-0881',
      total: 180_000,
      paid: 0,
      desc: 'Northern Haulage Express',
      category: 'Northern Haulage Express · Haulage',
      branchId: 'KD',
    };

    render(
      <PaymentRequestPayoutModal
        isOpen
        onClose={vi.fn()}
        selectedPayment={poTransportPayment}
        bankAccounts={bankAccounts}
        bankAccountsSelectOrder={bankAccounts}
        treasuryBookDisplayNgn={(a) => a.balance}
        treasuryAccountDisplayName={(a) => a.name}
        requestPayLines={payLines}
        onAddPayLine={vi.fn()}
        onUpdatePayLine={vi.fn()}
        onRemovePayLine={vi.fn()}
        requestPayNote=""
        onRequestPayNoteChange={vi.fn()}
        onConfirmPay={vi.fn()}
      />
    );

    expect(screen.getByText('PO Transport Payment')).toBeInTheDocument();
    expect(screen.getByText('PO PO-KD-26-0881')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm transport payout/i })).toBeInTheDocument();
  });
});
