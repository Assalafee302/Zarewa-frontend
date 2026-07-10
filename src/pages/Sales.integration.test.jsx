/**
 * Integration-style Sales mount that keeps real UnsavedWork + Toast providers
 * and a workspace mock closer to production (stable hasPermission, refund access on).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnsavedWorkProvider } from '../context/UnsavedWorkContext';
import { ToastProvider } from '../context/ToastContext';

vi.mock('../lib/lazyWithRetry.js', () => ({
  lazyWithRetry: () => () => null,
  attemptChunkReload: () => false,
}));

vi.mock('../hooks/useWorkspaceDomain.js', () => ({
  useWorkspaceDomain: () => {},
}));

vi.mock('../lib/apiBase', () => ({
  apiFetch: vi.fn(async () => ({ ok: true, data: { ok: true, quotations: [] } })),
}));

vi.mock('../lib/appConfirm', () => ({
  appConfirm: vi.fn(async () => true),
}));

const hasPermission = vi.fn((p) => {
  const key = String(p || '');
  if (key === '*' || key.startsWith('refunds') || key === 'finance.approve' || key === 'sales.manage') {
    return true;
  }
  return true;
});

vi.mock('../context/WorkspaceContext.jsx', () => ({
  useWorkspace: () => ({
    hasWorkspaceData: true,
    canMutate: true,
    hasPermission,
    canAccessModule: () => true,
    refresh: vi.fn(),
    refreshEpoch: 1,
    status: 'ok',
    session: {
      user: { roleKey: 'sales', roleLabel: 'Sales', id: 'u1' },
      currentBranchId: 'BR-KD',
      viewAllBranches: false,
    },
    snapshot: {
      ok: true,
      quotations: [
        {
          id: 'QT-1',
          customer: 'Acme',
          customerID: 'C1',
          date: '2026-07-01',
          total: '₦1,000',
          totalNgn: 1000,
          status: 'Approved',
          paymentStatus: 'Unpaid',
          paidNgn: 0,
        },
      ],
      receipts: [],
      cuttingLists: [],
      productionJobs: [],
      refunds: [],
      customers: [{ customerID: 'C1', name: 'Acme', phoneNumber: '080' }],
      yardCoilRegister: [{ id: 'COIL-1', colour: 'IV', gaugeLabel: '0.24mm', materialType: 'Aluzinc', weightKg: 100 }],
      masterData: { priceList: [] },
      priceListItems: [],
      permissions: ['refunds.request', 'sales.manage'],
    },
  }),
}));

vi.mock('../context/CustomersContext.jsx', () => ({
  useCustomers: () => ({
    customers: [{ customerID: 'C1', name: 'Acme', phoneNumber: '080' }],
    deleteCustomer: vi.fn(),
  }),
}));

vi.mock('../context/InventoryContext.jsx', () => ({
  useInventory: () => ({ products: [], coilLots: [] }),
}));

import SalesPage from './Sales.jsx';

describe('Sales page integration (React #185)', () => {
  beforeEach(() => {
    hasPermission.mockClear();
  });

  it('mounts with UnsavedWorkProvider and sample quotation without error boundary', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <UnsavedWorkProvider>
            <SalesPage />
          </UnsavedWorkProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/Sales temporarily unavailable/i)).toBeNull();
    expect(screen.getByText('Sales')).toBeTruthy();
  });

  it('survives focusSalesTab deep-link without looping', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/sales', state: { focusSalesTab: 'receipts' } }]}>
        <ToastProvider>
          <UnsavedWorkProvider>
            <SalesPage />
          </UnsavedWorkProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/Sales temporarily unavailable/i)).toBeNull();
    expect(screen.queryByText(/Maximum update depth/i)).toBeNull();
  });
});
