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
  transitOrdersSortedFiltered: [],
  transitSearch: '',
  setTransitSearch: vi.fn(),
  transitSort: 'orderDesc',
  setTransitSort: vi.fn(),
  transitOrders: [],
  expandedReceivePoId: null,
  setExpandedReceivePoId: vi.fn(),
  setReceiveDraft: vi.fn(),
  receiveDraft: { poID: '', location: '' },
  canReceiveInventory: true,
  setGrnLines: vi.fn(),
  grnLines: [],
  applyTransitReceipt: vi.fn(),
  grnSubmitting: false,
  grnConversionOverride: false,
  setGrnConversionOverride: vi.fn(),
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
});
