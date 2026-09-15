import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinanceDeskWorkQueues } from './FinanceDeskWorkQueues.jsx';

/**
 * Stable workspace shell — keep hasPermission identity stable to avoid effect loops.
 * Mutate only snapshot.purchasePaymentCashierAcksPending between tests.
 */
const snapshot = {
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
  purchasePaymentCashierAcksPending: [],
};

const hasPermission = (p) => ['cashier.desk.view', 'finance.pay'].includes(p);

const WORKSPACE = {
  viewAllBranches: false,
  branchLabel: 'Yola',
  branchScope: 'BR-YOL',
  snapshot,
  session: { user: { roleKey: 'cashier', permissions: ['cashier.desk.view', 'finance.pay'] } },
  hasPermission,
};

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => WORKSPACE,
}));

vi.mock('../../hooks/useFinanceTrialExceptions', () => ({
  useFinanceTrialExceptions: () => ({
    data: null,
    loading: false,
    error: null,
    reload: () => {},
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ show: () => {}, dismiss: () => {} }),
}));

describe('FinanceDeskWorkQueues', () => {
  beforeEach(() => {
    window.localStorage.setItem('zarewa.cashierDeskGuide.dismissed', '1');
    snapshot.purchasePaymentCashierAcksPending = [];
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders each treasury account with confirmed, unlinked, and all-total balances', () => {
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
    expect(screen.getByRole('region', { name: 'Till now' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Confirm receipts' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Pay out' })).toBeTruthy();
    expect(screen.getByText(/Main till/i)).toBeTruthy();
    expect(screen.getByText(/Confirmed ₦/)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Till and bank accounts' })).toBeTruthy();
    expect(screen.getByTestId('desk-all-clear')).toBeTruthy();
    expect(screen.getByTestId('desk-confirm-column')).toBeTruthy();
    expect(document.getElementById('desk-queue-receipts')).toBeTruthy();
    expect(screen.getByTestId('finance-payouts-combined')).toBeTruthy();
    expect(screen.queryByTestId('desk-bank-charges')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Record bank charge$/i })).toBeNull();
  });

  it('keeps the confirm column jump target when queues are empty', () => {
    render(
      <MemoryRouter>
        <FinanceDeskWorkQueues
          onConfirmReceipt={() => {}}
          onPayRequest={() => {}}
          onPayRefund={() => {}}
          onPayRegisterSettlement={() => {}}
          onPayPoTransport={() => {}}
          onGoToTab={() => {}}
          searchQuery="RF-KD-26-0001"
        />
      </MemoryRouter>
    );
    expect(document.getElementById('desk-queue-receipts')).toBeTruthy();
    expect(screen.getAllByText(/No receipts waiting to confirm/i).length).toBeGreaterThan(0);
  });

  it('shows acknowledge purchase payments queue for pending MD pays', () => {
    snapshot.purchasePaymentCashierAcksPending = [
      {
        ackId: 'PPCA-1',
        status: 'Pending',
        supplierName: 'Coil Supplier',
        poId: 'PO-100',
        amountNgn: 250000,
        paidAtISO: '2026-09-15T10:00:00.000Z',
        paidByName: 'Managing Director',
      },
    ];
    const onAck = vi.fn();
    render(
      <MemoryRouter>
        <FinanceDeskWorkQueues
          onConfirmReceipt={() => {}}
          onAcknowledgePurchasePayment={onAck}
          onPayRequest={() => {}}
          onPayRefund={() => {}}
          onPayRegisterSettlement={() => {}}
          onPayPoTransport={() => {}}
          onGoToTab={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByTestId('desk-purchase-payment-acks')).toBeTruthy();
    expect(screen.getByText(/Coil Supplier/i)).toBeTruthy();
    expect(screen.getByText(/PO-100/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Acknowledge$/i }));
    expect(onAck).toHaveBeenCalledOnce();
    expect(onAck.mock.calls[0][0].ackId).toBe('PPCA-1');
  });
});
