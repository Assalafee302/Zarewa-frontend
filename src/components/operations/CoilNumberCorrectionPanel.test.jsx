import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CoilNumberCorrectionPanel from './CoilNumberCorrectionPanel.jsx';
import { apiFetch } from '../../lib/apiBase';

const mockUseWorkspace = vi.fn();
const showToast = vi.fn();

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => mockUseWorkspace(),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ show: showToast }),
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

  it('lets store send a correction from the stock desk without changing the number yet', async () => {
    const user = userEvent.setup();
    mockUseWorkspace.mockReturnValue({
      session: { user: { id: 'u-store', roleKey: 'operations_officer', displayName: 'Store' } },
      hasPermission: (permission) => permission === 'inventory.receive',
    });
    apiFetch.mockImplementation(async (url, opts) => {
      if (String(url).includes('/number-correction/preview')) {
        return {
          ok: true,
          data: {
            ok: true,
            fromCoilNo: 'CL-26-100',
            toCoilNo: 'CL-26-200',
            available: true,
            impact: { onHandKg: 800, status: 'Available' },
          },
        };
      }
      if (opts?.method === 'POST') {
        return { ok: true, data: { ok: true, correction: { id: 'CNC-1' } } };
      }
      return { ok: true, data: { ok: true, corrections: [] } };
    });

    renderPanel();
    await user.click(await screen.findByRole('button', { name: /correct number/i }));
    await user.type(screen.getByLabelText(/number on the coil now/i), 'CL-26-100');
    await user.type(screen.getByLabelText(/^correct number$/i), 'CL-26-200');
    await user.type(screen.getByLabelText(/why it is wrong/i), 'Mill tag does not match');
    const review = await screen.findByRole('button', { name: /^review$/i });
    expect(review).toBeEnabled();
    await user.click(review);
    await user.click(screen.getByRole('button', { name: /send for approval/i }));

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/coil-lots/CL-26-100/number-correction',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ toCoilNo: 'CL-26-200', reason: 'Mill tag does not match' }),
      })
    );
    expect(showToast).toHaveBeenCalledWith(
      'Sent to the branch manager. The coil number stays as it is until they approve.'
    );
    expect(screen.queryByRole('button', { name: /approve correction/i })).toBeNull();
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
