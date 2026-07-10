import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/lazyWithRetry.js', () => ({
  lazyWithRetry: () => () => null,
  attemptChunkReload: () => false,
}));

vi.mock('../context/ToastContext.jsx', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

vi.mock('../context/CustomersContext.jsx', () => ({
  useCustomers: () => ({ customers: [] }),
}));

vi.mock('../context/InventoryContext.jsx', () => ({
  useInventory: () => ({ products: [], coilLots: [] }),
}));

vi.mock('../hooks/useWorkspaceDomain.js', () => ({
  useWorkspaceDomain: () => {},
}));

vi.mock('../context/WorkspaceContext.jsx', () => ({
  useWorkspace: () => ({
    hasWorkspaceData: true,
    canMutate: true,
    hasPermission: () => true,
    refresh: vi.fn(),
    refreshEpoch: 0,
    session: {
      user: { roleKey: 'sales', roleLabel: 'Sales' },
      currentBranchId: 'BR-KD',
      viewAllBranches: false,
    },
    snapshot: {
      quotations: [],
      receipts: [],
      cuttingLists: [],
      productionJobs: [],
      refunds: [],
      // Null weightKg previously crashed Sales via y.weightKg.toLocaleString().
      yardCoilRegister: [
        { id: 'COIL-BAD', colour: 'IV', gaugeLabel: '0.24mm', materialType: 'Aluzinc', weightKg: null },
        { id: 'COIL-OK', colour: 'TB', gaugeLabel: '0.24mm', materialType: 'Aluzinc', weightKg: 3200 },
      ],
      masterData: { priceList: [] },
      priceListItems: [],
    },
  }),
}));

import SalesPage from './Sales.jsx';

describe('Sales page', () => {
  it('renders without crashing into Sales temporarily unavailable', () => {
    render(
      <MemoryRouter>
        <SalesPage />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Sales temporarily unavailable/i)).toBeNull();
    expect(screen.getByText('Sales')).toBeTruthy();
  });
});
