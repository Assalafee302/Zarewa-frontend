/**
 * Mount QuotationModal, set material header, select Roofing Sheet — must not hit React #185.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UnsavedWorkProvider } from '../context/UnsavedWorkContext';
import { ToastProvider } from '../context/ToastContext';

vi.mock('../lib/lazyWithRetry.js', () => ({
  lazyWithRetry: (fn) => React.lazy(fn),
  attemptChunkReload: () => false,
}));

vi.mock('../lib/apiBase', () => ({
  apiFetch: vi.fn(async (url) => {
    if (String(url).includes('/api/pricing/policy')) {
      return { ok: true, data: { ok: true, ridgeAddOns: [] } };
    }
    if (String(url).includes('/api/material-incidents')) {
      return { ok: true, data: { ok: true, rows: [] } };
    }
    return { ok: true, data: { ok: true } };
  }),
}));

vi.mock('../lib/appConfirm', () => ({
  appConfirm: vi.fn(async () => true),
}));

vi.mock('../context/CustomersContext.jsx', () => ({
  useCustomers: () => ({
    customers: [{ customerID: 'C1', name: 'Acme', phoneNumber: '080' }],
  }),
}));

vi.mock('../context/InventoryContext.jsx', () => ({
  useInventory: () => ({ materialPoolSummary: { incidents: [] } }),
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
      viewAllBranches: false,
    },
    snapshot: {
      ok: true,
      masterData: {
        materialTypes: [
          { id: 'MAT-002', name: 'Aluzinc', inventoryModel: 'coil_kg', active: true },
        ],
        profiles: [{ id: 'P1', name: 'Rome', materialTypeId: 'MAT-002', active: true }],
        gauges: [{ id: 'G1', label: '0.40mm', value: '0.40', active: true }],
        colours: [{ id: 'COL1', name: 'Blue', value: 'Blue', active: true }],
        quoteItems: [
          {
            id: 'QI-RS',
            name: 'Roofing Sheet',
            itemType: 'product',
            active: true,
            defaultUnitPriceNgn: 0,
            unit: 'm',
          },
        ],
        priceList: [],
      },
      materialPricingRows: [
        {
          materialKey: 'aluzinc',
          gaugeMm: '0.40',
          branchId: 'BR-KD',
          designKey: 'rome',
          minimumPricePerMeterNgn: 4000,
          listPricePerMeterNgn: 4500,
          publishedListPriceNgn: 4500,
          commissionNgnPerM: 500,
        },
      ],
      pricingRidgeAddOns: [],
      priceListItems: [],
      treasuryAccounts: [{ id: 'TA1', name: 'Cash', branchId: 'BR-KD', active: true }],
      periodLocks: [],
    },
  }),
}));

import QuotationModal from './QuotationModal.jsx';

describe('QuotationModal product select (live #185 path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('selecting Roofing Sheet after material header does not exceed update depth', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <ToastProvider>
          <UnsavedWorkProvider>
            <QuotationModal
              isOpen
              onClose={onClose}
              editData={null}
              accessMode="edit"
              quotedByStaff="Sales"
              useLedgerApi={false}
              useQuotationApi={false}
            />
          </UnsavedWorkProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThan(2);
    });

    const boxes = () => screen.getAllByRole('combobox');

    // Material type
    const materialBox = boxes().find((el) =>
      Array.from(el.querySelectorAll('option')).some((o) => o.value === 'MAT-002')
    );
    expect(materialBox).toBeTruthy();
    await user.selectOptions(materialBox, 'MAT-002');

    await waitFor(() => {
      expect(
        boxes().some((el) =>
          Array.from(el.querySelectorAll('option')).some((o) => String(o.value).includes('0.40'))
        )
      ).toBe(true);
    });

    for (const box of boxes()) {
      const opts = Array.from(box.querySelectorAll('option')).map((o) => o.value);
      const gauge = opts.find((v) => String(v).includes('0.40'));
      if (gauge) await user.selectOptions(box, gauge);
      if (opts.includes('Rome')) await user.selectOptions(box, 'Rome');
      if (opts.includes('Blue')) await user.selectOptions(box, 'Blue');
    }

    await waitFor(() => {
      const productBox = boxes().find((el) =>
        Array.from(el.querySelectorAll('option')).some((o) => o.textContent?.includes('Roofing Sheet'))
      );
      expect(productBox).toBeTruthy();
    });

    const productBox = boxes().find((el) =>
      Array.from(el.querySelectorAll('option')).some((o) => o.textContent?.includes('Roofing Sheet'))
    );
    const roofOpt = Array.from(productBox.querySelectorAll('option')).find((o) =>
      o.textContent?.includes('Roofing Sheet')
    );
    await user.selectOptions(productBox, roofOpt.value);

    // Give effects a few frames; #185 would throw / show boundary text.
    await waitFor(() => {
      expect(screen.queryByText(/Maximum update depth/i)).toBeNull();
      expect(screen.queryByText(/Sales temporarily unavailable/i)).toBeNull();
      expect(productBox.value).toBe(roofOpt.value);
    });

    // Price may come from workbook (4500) or stay blank if header keys did not match — either is fine
    // as long as we did not enter an update-depth loop.
    await new Promise((r) => setTimeout(r, 200));
    expect(screen.queryByText(/Maximum update depth/i)).toBeNull();
  }, 45000);
});
