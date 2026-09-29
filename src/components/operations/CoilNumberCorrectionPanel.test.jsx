import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CoilNumberCorrectionPanel from './CoilNumberCorrectionPanel.jsx';

const mockUseWorkspace = vi.fn();

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => mockUseWorkspace(),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ show: vi.fn() }),
}));
vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(async () => ({ ok: true, data: { ok: true, corrections: [] } })),
}));

function renderPanel(coilNo = '') {
  return render(
    <MemoryRouter>
      <CoilNumberCorrectionPanel coilNo={coilNo} />
    </MemoryRouter>
  );
}

describe('CoilNumberCorrectionPanel', () => {
  beforeEach(() => {
    mockUseWorkspace.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it('shows Correct number on the stock desk for store when nothing is waiting', async () => {
    mockUseWorkspace.mockReturnValue({
      session: { user: { id: 'u-store', roleKey: 'operations_officer', displayName: 'Store' } },
      hasPermission: (permission) => permission === 'inventory.receive',
    });
    renderPanel();
    expect(await screen.findByRole('button', { name: /correct number/i })).toBeInTheDocument();
  });

  it('hides the desk section from a role that cannot request or approve', () => {
    mockUseWorkspace.mockReturnValue({
      session: { user: { id: 'u-sales', roleKey: 'sales_staff', displayName: 'Sales' } },
      hasPermission: () => false,
    });
    renderPanel();
    expect(screen.queryByRole('button', { name: /correct number/i })).toBeNull();
    expect(screen.queryByRole('heading', { name: /coil number/i })).toBeNull();
  });
});
