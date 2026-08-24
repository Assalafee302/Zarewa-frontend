import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '../../lib/apiBase';
import { RequestDieselPanel } from './RequestDieselPanel';

vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(),
}));

afterEach(() => cleanup());

describe('RequestDieselPanel', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('blocks submit when there is no generator or forklift', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      data: { machines: [{ id: 'M-1', name: 'Line A', machineType: 'corrugation', status: 'active' }] },
    });
    const user = userEvent.setup();
    render(<RequestDieselPanel branchId="BR-KD" />);
    await user.click(screen.getByRole('button', { name: /request diesel/i }));
    expect(await screen.findByText(/no generator or forklift/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
  });

  it('posts litres against the selected plant file', async () => {
    let posted;
    apiFetch.mockImplementation(async (_url, opts) => {
      if (opts?.method === 'POST') {
        posted = opts.body;
        return { ok: true, data: { ok: true, requestID: 'PR-1' } };
      }
      return {
        ok: true,
        data: {
          machines: [
            { id: 'M-GEN', name: 'Standby generator', machineType: 'generator', status: 'active' },
            { id: 'M-FL', name: 'Yard forklift', machineType: 'forklift', status: 'active' },
            { id: 'M-OLD', name: 'Old gen', machineType: 'generator', status: 'decommissioned' },
          ],
        },
      };
    });
    const user = userEvent.setup();
    render(<RequestDieselPanel />);
    await user.click(screen.getByRole('button', { name: /request diesel/i }));
    const machine = await screen.findByLabelText(/^machine/i);
    expect(screen.getByRole('option', { name: /standby generator/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /old gen/i })).toBeNull();
    await user.selectOptions(machine, 'M-FL');
    await user.type(screen.getByLabelText(/^litres/i), '40');
    await user.type(screen.getByLabelText(/estimated amount/i), '36000');
    await user.click(screen.getByRole('button', { name: /submit request/i }));
    expect(posted).toMatchObject({
      machineId: 'M-FL',
      litres: 40,
      amountNgn: 36000,
      fuelKind: 'diesel',
    });
  });
});
