import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { apiFetch } from '../../lib/apiBase';
import { OperationsMachinesPanel } from './OperationsMachinesPanel';

vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('./MachineDossierModal', () => ({ MachineDossierModal: () => null }));

afterEach(() => cleanup());

describe('OperationsMachinesPanel', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({
      ok: true,
      data: {
        machines: [{ id: 'MAC-1', name: 'Line A', machineType: 'corrugation', status: 'active' }],
      },
    });
  });

  it('does not offer Register machine even when the viewer is Branch Manager', async () => {
    render(<OperationsMachinesPanel roleKey="sales_manager" branchId="BR-KD" />);
    expect(await screen.findByText('Line A')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /register machine/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /register first machine/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^edit$/i })).toBeNull();
  });

  it('does not offer Register machine for operations', async () => {
    render(<OperationsMachinesPanel roleKey="operations_officer" branchId="BR-KD" />);
    expect(await screen.findByText('Line A')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /register/i })).toBeNull();
  });
});
