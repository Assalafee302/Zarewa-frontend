import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { screen, cleanup, waitFor } from '@testing-library/react';
import { apiFetch } from '../../lib/apiBase';
import { renderWithProviders } from '../../test/renderWithProviders';
import SalesCustomersTab from './SalesCustomersTab';

function withRouter(ui) {
  return <MemoryRouter>{ui}</MemoryRouter>;
}

vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../../context/CustomersContext', () => ({
  useCustomers: () => ({ deleteCustomer: vi.fn() }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({ hasPermission: () => false, canMutate: false }),
}));

afterEach(() => cleanup());

const CUSTOMER = {
  customerID: 'CUS-KD-26-0001',
  name: 'Amina Traders',
  phoneNumber: '08012345678',
  email: 'amina@example.com',
  status: 'active',
  tier: 'gold',
};

describe('SalesCustomersTab', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({
      ok: true,
      data: { ok: true, customers: [CUSTOMER], total: 1 },
    });
  });

  it('fetches customers from the paginated search endpoint instead of a local snapshot', async () => {
    renderWithProviders(
      withRouter(
        <SalesCustomersTab searchQuery="" onSearchChange={() => {}} quotations={[]} receipts={[]} cuttingLists={[]} />
      )
    );

    expect(await screen.findByText('Amina Traders')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/customers?limit=5000'));
  });

  it('re-queries the server with the search term (debounced) rather than filtering locally', async () => {
    const { rerender } = renderWithProviders(
      withRouter(
        <SalesCustomersTab searchQuery="" onSearchChange={() => {}} quotations={[]} receipts={[]} cuttingLists={[]} />
      )
    );
    await screen.findByText('Amina Traders');
    apiFetch.mockClear();

    rerender(
      withRouter(
        <SalesCustomersTab searchQuery="amina" onSearchChange={() => {}} quotations={[]} receipts={[]} cuttingLists={[]} />
      )
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('q=amina'));
    });
  });

  it('shows an error state when the customers request fails', async () => {
    apiFetch.mockResolvedValue({ ok: false, data: { error: 'Network down' } });
    renderWithProviders(
      withRouter(
        <SalesCustomersTab searchQuery="" onSearchChange={() => {}} quotations={[]} receipts={[]} cuttingLists={[]} />
      )
    );
    expect(await screen.findByText(/could not load customers/i)).toBeTruthy();
  });
});
