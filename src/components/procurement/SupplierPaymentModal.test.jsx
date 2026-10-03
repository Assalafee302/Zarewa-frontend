import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { SupplierPaymentModal } from './SupplierPaymentModal.jsx';

describe('SupplierPaymentModal', () => {
  afterEach(() => {
    cleanup();
  });

  const baseAp = {
    apID: 'AP-2026-0044',
    supplierName: 'Kano Steel Mills Ltd',
    supplierId: 'SUP-001',
    invoiceRef: 'INV-KSM-9901',
    poRef: 'PO-2026-0088',
    amountNgn: 1_500_000,
    paidNgn: 500_000,
    branchId: 'KD',
  };

  const baseSupplier = {
    supplierID: 'SUP-001',
    supplierName: 'Kano Steel Mills Ltd',
    bankAccounts: [
      { bankName: 'Zenith Bank', accountNumber: '1012345678', accountName: 'Kano Steel Mills Ltd' },
    ],
  };

  const basePayLines = [
    { id: 'line-1', treasuryAccountId: '1', dateISO: '2026-10-03', amount: '1000000', reference: 'TRF-001' },
  ];

  const treasuryAccounts = [
    { id: '1', name: 'Main Corporate Account', type: 'Bank', balance: 5_000_000 },
  ];

  it('renders supplier payment modal with hero card, balance due, and supplier bank card', () => {
    render(
      <SupplierPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        selectedAp={baseAp}
        supplier={baseSupplier}
        apPayLines={basePayLines}
        onUpdateApPayLine={vi.fn()}
        onAddApPayLine={vi.fn()}
        onRemoveApPayLine={vi.fn()}
        treasuryAccounts={treasuryAccounts}
        treasuryBookByAccountId={{ '1': 5_000_000 }}
        apPayBusy={false}
        onSavePayment={vi.fn()}
      />
    );

    expect(screen.getAllByText(/Supplier Payment/i).length).toBeGreaterThan(0);
    expect(screen.getByText('AP-2026-0044')).toBeInTheDocument();
    expect(screen.getAllByText('Kano Steel Mills Ltd').length).toBeGreaterThan(0);
    expect(screen.getByText('Zenith Bank')).toBeInTheDocument();
    expect(screen.getByText('1012345678')).toBeInTheDocument();
    expect(screen.getByText('Disbursement')).toBeInTheDocument();
    expect(screen.getByText('Payable & PO Details')).toBeInTheDocument();
  });

  it('switches between Disbursement and Payable & PO Details tabs', () => {
    const handleAdjustments = vi.fn();
    render(
      <SupplierPaymentModal
        isOpen={true}
        onClose={vi.fn()}
        selectedAp={baseAp}
        supplier={baseSupplier}
        apPayLines={basePayLines}
        onUpdateApPayLine={vi.fn()}
        onAddApPayLine={vi.fn()}
        onRemoveApPayLine={vi.fn()}
        treasuryAccounts={treasuryAccounts}
        treasuryBookByAccountId={{ '1': 5_000_000 }}
        apPayBusy={false}
        onSavePayment={vi.fn()}
        onOpenAdjustments={handleAdjustments}
      />
    );

    const detailsTab = screen.getByText('Payable & PO Details');
    fireEvent.click(detailsTab);

    expect(screen.getByText('Payable Information')).toBeInTheDocument();
    expect(screen.getByText('Special Payments & Adjustments')).toBeInTheDocument();

    const adjustBtn = screen.getByText(/Open PO Adjustments for PO-2026-0088/i);
    fireEvent.click(adjustBtn);
    expect(handleAdjustments).toHaveBeenCalledWith('PO-2026-0088');
  });
});
