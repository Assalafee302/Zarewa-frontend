/**
 * Full QuotationModal mount is heavy/flaky for CI; the #185 contract is covered by
 * src/lib/quotationWorkbookPriceApply.reactLoop.test.jsx.
 * This file keeps a smoke import so the modal still loads under vitest.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/apiBase', () => ({
  apiFetch: vi.fn(async () => ({ ok: true, data: { ok: true } })),
}));

vi.mock('../lib/appConfirm', () => ({
  appConfirm: vi.fn(async () => true),
}));

vi.mock('../context/CustomersContext.jsx', () => ({
  useCustomers: () => ({ customers: [] }),
}));

vi.mock('../context/WorkspaceContext.jsx', () => ({
  useWorkspace: () => ({
    hasWorkspaceData: true,
    canMutate: true,
    hasPermission: () => true,
    canAccessModule: () => true,
    refresh: vi.fn(),
    refreshEpoch: 1,
    status: 'ok',
    branchScope: 'BR-KD',
    viewAllBranches: false,
    session: {
      user: { roleKey: 'sales', roleLabel: 'Sales', id: 'u1' },
      currentBranchId: 'BR-KD',
      branchId: 'BR-KD',
    },
    snapshot: {
      ok: true,
      masterData: {
        materialTypes: [],
        profiles: [],
        gauges: [],
        colours: [],
        quoteItems: [],
        priceList: [],
      },
      materialPricingRows: [],
      pricingRidgeAddOns: [],
      priceListItems: [],
      treasuryAccounts: [],
      periodLocks: [],
    },
  }),
}));

import QuotationModal from './QuotationModal.jsx';
import { productUsesWorkbookAutoPrice } from '../lib/quotationWorkbookPriceApply.js';

describe('QuotationModal workbook pricing wiring', () => {
  it('exports a mountable modal and shares workbook auto-price rules', () => {
    expect(typeof QuotationModal).toBe('function');
    expect(productUsesWorkbookAutoPrice('Roofing Sheet')).toBe(true);
    expect(productUsesWorkbookAutoPrice('Ridge Cap')).toBe(true);
  });
});
