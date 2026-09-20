import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperationsReceiveModal } from './OperationsReceiveModal';

afterEach(() => cleanup());

const coilLine = {
  lineKey: 'L1',
  productName: 'Aluzinc 0.32 Bush Green',
  gauge: '0.32',
  color: 'Bush Green',
  remaining: 4200,
  qtyReceived: '',
  weightKg: '',
  coilNo: 'CL-26-0101',
  receivedAtISO: '2026-09-21',
  grnKind: 'coil',
  meterBasis: false,
};

function renderModal(overrides = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    purchaseOrder: { poID: 'PO-KD-26-0099', supplierName: 'Kano Coils', status: 'In Transit' },
    receiveDraft: { poID: 'PO-KD-26-0099', location: '' },
    setReceiveDraft: vi.fn(),
    grnLines: [coilLine],
    setGrnLines: vi.fn(),
    onSubmit: vi.fn((e) => e.preventDefault()),
    grnSubmitting: false,
    grnConversionOverride: false,
    setGrnConversionOverride: vi.fn(),
    canReceiveInventory: true,
    canOverrideConversion: false,
    ...overrides,
  };
  return { ...render(<OperationsReceiveModal {...props} />), props };
}

describe('OperationsReceiveModal', () => {
  it('opens a receive dialog with coil fields and confirm', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: /receive PO-KD-26-0099/i })).toBeTruthy();
    expect(screen.getByLabelText(/kilograms received/i)).toBeTruthy();
    expect(screen.getByLabelText(/weight \(kg\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/coil number/i)).toBeTruthy();
    expect(screen.getByLabelText(/date of receival/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /confirm receipt/i })).toBeTruthy();
  });

  it('shows stone qty fields for stone lines', () => {
    renderModal({
      grnLines: [
        {
          lineKey: 'L-S',
          productName: 'Stone trim',
          gauge: '0.40',
          color: 'Charcoal',
          remaining: 80,
          qtyReceived: '',
          receivedAtISO: '2026-09-21',
          grnKind: 'stone',
        },
      ],
    });
    expect(screen.getByLabelText(/metres received/i)).toBeTruthy();
    expect(screen.queryByLabelText(/coil number/i)).toBeNull();
  });

  it('submits the form from the footer', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();
    await user.click(screen.getByRole('button', { name: /confirm receipt/i }));
    expect(props.onSubmit).toHaveBeenCalled();
  });
});
