import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { OperationsInventoryDesk } from './OperationsInventoryDesk';

afterEach(() => cleanup());

const emptyDeskProps = {
  stockReceiveKind: 'coil',
  setStockReceiveKind: vi.fn(),
  coilRestockMinKg: 85,
  navigate: vi.fn(),
  openRequestStock: vi.fn(),
  stoneRestockMinM: 10,
  anyReceivablePo: false,
  inTransitLoads: [],
  transitSearch: '',
  setTransitSearch: vi.fn(),
  transitSort: 'orderDesc',
  setTransitSort: vi.fn(),
  transitOrders: [],
  poSearchRemoteLoading: false,
  receivingPoId: null,
  onOpenReceive: vi.fn(),
  canReceiveInventory: true,
  ws: { canMutate: true, hasPermission: () => false },
  coilLiveSearch: '',
  setCoilLiveSearch: vi.fn(),
  coilLotsReceiptSorted: [],
  hasCoilReceiptSearch: false,
  canRegisterCoil: false,
  setShowRegisterCoil: vi.fn(),
  coilLotsByReceipt: [],
  coilSearchRemoteLoading: false,
  coilReceiptIncludesArchived: false,
  coilReceiptSort: { key: 'received', dir: 'desc' },
  toggleCoilReceiptSort: vi.fn(),
  coilLotsByReceiptCapped: [],
  coilReceiptListTruncated: false,
  coilListLimit: 40,
  coilColourLabel: (c) => c || '—',
  skuProductsLiveSorted: [],
  skuProductsReceiptFiltered: [],
  skuReceiptTruncated: false,
  skuListLimit: 15,
  skuProductsByReceipt: [],
  setProductMovementModal: vi.fn(),
  canAdjustInventory: true,
  setStockAdjustMaterialFamily: vi.fn(),
  setShowStockAdjust: vi.fn(),
  coilSpecBelowMinCount: 0,
  stoneSpecBelowMinCount: 0,
  inventoryStats: { lowStock: 0 },
};

describe('OperationsInventoryDesk', () => {
  it('shows the stock-kind switch and Request stock', () => {
    render(<OperationsInventoryDesk {...emptyDeskProps} />);
    expect(screen.getByRole('radiogroup', { name: /stock category/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /request stock/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^receive$/i })).toBeTruthy();
    expect(screen.queryByTestId('ops-coil-spec-board')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Colour × gauge' })).toBeNull();
  });

  it('opens receive from the PO list without an inline form', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const onOpenReceive = vi.fn();
    render(
      <OperationsInventoryDesk
        {...emptyDeskProps}
        anyReceivablePo
        onOpenReceive={onOpenReceive}
        transitOrders={[
          {
            poID: 'PO-KD-26-0099',
            supplierName: 'Kano Coils',
            status: 'In Transit',
            procurementKind: 'coil',
            lines: [{ lineKey: 'L1', productID: 'PRD-102', qtyOrdered: 4000, qtyReceived: 0 }],
          },
        ]}
      />
    );
    await user.click(screen.getByRole('button', { name: /^receive$/i }));
    expect(onOpenReceive).toHaveBeenCalledWith('PO-KD-26-0099');
    expect(screen.queryByRole('button', { name: /confirm receipt/i })).toBeNull();
    expect(screen.queryByLabelText(/coil number/i)).toBeNull();
  });
});
