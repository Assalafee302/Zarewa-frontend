import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { RefundPayoutModal } from './RefundPayoutModal.jsx';

describe('RefundPayoutModal', () => {
  afterEach(() => {
    cleanup();
  });

  const baseRefund = {
    refundID: 'RF-KD-26-9505',
    customer: 'Kaduna Sheets Ltd',
    customerID: 'CUS-KD-26-0655',
    quotationRef: 'QT-KD-26-1237',
    payeeName: 'Kaduna Sheets Ltd',
    payeeBankName: 'TAJBank',
    payeeAccountNo: '0012345678',
    amountNgn: 151_330,
    approvedAmountNgn: 128_300,
    paidAmountNgn: 0,
    creditAppliedNgn: 23_030,
    creditAppliedToQuotationRef: 'QT-KD-26-1282',
    payoutHold: false,
    payoutHoldReason: '',
  };

  const bankAccounts = [
    { id: 1, name: 'Main Cash Till', type: 'Till', balance: 500_000 },
    { id: 2, name: 'TAJ Bank Main', type: 'Bank', balance: 1_200_000 },
  ];

  const payLines = [
    { id: 'line-1', treasuryAccountId: '1', dateISO: '2026-10-03', amount: '128300', reference: 'Cash' },
  ];

  it('renders payout modal with net cash due and payee bank details', () => {
    render(
      <RefundPayoutModal
        isOpen
        onClose={vi.fn()}
        refund={baseRefund}
        refundPayLines={payLines}
        bankAccountsSelectOrder={bankAccounts}
        treasuryBookDisplayNgn={(a) => a.balance}
        treasuryAccountDisplayName={(a) => a.name}
        activeActorLabel="Cashier Jane"
        onConfirmPay={vi.fn()}
      />
    );

    expect(screen.getByText('Refund Payout')).toBeInTheDocument();
    expect(screen.getByText('RF-KD-26-9505')).toBeInTheDocument();
    expect(screen.getAllByText('Kaduna Sheets Ltd').length).toBeGreaterThan(0);
    expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    expect(screen.getByText('Disbursement')).toBeInTheDocument();
    expect(screen.getByText('Settlement & Breakdown')).toBeInTheDocument();
  });

  it('switches between Disbursement and Settlement tabs', () => {
    render(
      <RefundPayoutModal
        isOpen
        onClose={vi.fn()}
        refund={baseRefund}
        refundPayLines={payLines}
        bankAccountsSelectOrder={bankAccounts}
        treasuryBookDisplayNgn={(a) => a.balance}
        treasuryAccountDisplayName={(a) => a.name}
        activeActorLabel="Cashier Jane"
        onConfirmPay={vi.fn()}
      />
    );

    const breakdownTabBtn = screen.getByRole('button', { name: /Settlement & Breakdown/i });
    fireEvent.click(breakdownTabBtn);

    expect(screen.getByText(/Settlement & Entitlement Story/i)).toBeInTheDocument();
    expect(screen.getByText(/Original Requested Amount/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Applied to/i).length).toBeGreaterThan(0);
  });

  it('renders Administrative Hold banner when on hold and allows manager to lift it', () => {
    const onLiftHold = vi.fn();
    const heldRefund = {
      ...baseRefund,
      payoutHold: true,
      payoutHoldReason: 'Customer disputing bank account',
    };

    render(
      <RefundPayoutModal
        isOpen
        onClose={vi.fn()}
        refund={heldRefund}
        refundPayLines={payLines}
        bankAccountsSelectOrder={bankAccounts}
        treasuryBookDisplayNgn={(a) => a.balance}
        treasuryAccountDisplayName={(a) => a.name}
        activeActorLabel="Cashier Jane"
        userMaySetRefundPayoutHold={true}
        onLiftHold={onLiftHold}
        onConfirmPay={vi.fn()}
      />
    );

    expect(screen.getByText(/Administrative Hold Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer disputing bank account/i)).toBeInTheDocument();

    const liftBtn = screen.getByRole('button', { name: /Lift hold/i });
    expect(liftBtn).toBeInTheDocument();
    fireEvent.click(liftBtn);
    expect(onLiftHold).toHaveBeenCalledTimes(1);
  });
});
