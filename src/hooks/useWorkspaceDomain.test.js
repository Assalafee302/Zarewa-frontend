import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useWorkspaceDomain } from './useWorkspaceDomain';

const ensureDomainLoaded = vi.fn(async () => ({ ok: true }));
const prefetchWorkspaceDomains = vi.fn(async () => {});

vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    status: 'ok',
    snapshot: { ok: true, customers: [] },
    refreshEpoch: 0,
    ensureDomainLoaded,
    prefetchWorkspaceDomains,
    isDomainLoaded: () => false,
  }),
}));

function Probe({ domain }) {
  const state = useWorkspaceDomain(domain);
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'ready' }, String(state.domainReady)),
    React.createElement('span', { 'data-testid': 'loading' }, String(state.domainLoading))
  );
}

describe('useWorkspaceDomain', () => {
  beforeEach(() => {
    ensureDomainLoaded.mockClear();
    prefetchWorkspaceDomains.mockClear();
  });

  it('loads primary domain on mount', async () => {
    render(React.createElement(Probe, { domain: 'sales' }));
    await waitFor(() => {
      expect(ensureDomainLoaded).toHaveBeenCalledWith('sales');
    });
  });

  it('loads finance and sales for account desk', async () => {
    render(React.createElement(Probe, { domain: ['finance', 'sales'] }));
    await waitFor(() => {
      expect(ensureDomainLoaded).toHaveBeenCalledWith('finance');
      expect(prefetchWorkspaceDomains).toHaveBeenCalledWith({ only: ['sales'] });
    });
  });
});
