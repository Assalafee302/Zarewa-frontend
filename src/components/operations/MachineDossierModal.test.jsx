import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiFetch } from '../../lib/apiBase';
import { MachineDossierModal } from './MachineDossierModal';

vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(),
}));

afterEach(() => cleanup());

describe('MachineDossierModal', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('shows what is wrong, next actions, and event history', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        machine: { id: 'MAC-1', name: 'Line A', status: 'under_maintenance', machineCode: 'LA' },
        insight: { flag: 'ok', flagLabel: 'OK', openWorkOrders: 1, lifetimeMaintenanceNgn: 0 },
        currentFaults: [
          {
            id: 'MWO-1',
            referenceNo: 'MWO-1',
            kind: 'corrective',
            status: 'open',
            symptom: 'Belt slip',
            priority: 'machine_down',
            envelope: { shopFloorOpen: true, costOpen: true },
          },
        ],
        nextActions: [
          { key: 'acknowledge', workOrderId: 'MWO-1', title: 'Acknowledge this fault', detail: 'MWO-1' },
        ],
        events: [
          {
            id: 'MEV-1',
            eventKind: 'opened',
            note: 'Store reported belt slip',
            atIso: '2026-08-20T09:00:00.000Z',
            workOrderRef: 'MWO-1',
            actorDisplayName: 'Store',
          },
        ],
        workOrders: [],
        costByKind: {},
      },
    });
    const onAct = vi.fn();
    const user = userEvent.setup();
    render(
      <MachineDossierModal machineId="MAC-1" roleKey="sales_manager" onActOnWorkOrder={onAct} onClose={() => {}} />
    );
    expect(await screen.findByText(/what’s wrong now/i)).toBeInTheDocument();
    expect(screen.getAllByText(/belt slip/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/acknowledge this fault/i)).toBeInTheDocument();
    expect(screen.getByText(/fault reported/i)).toBeInTheDocument();
    expect(screen.getByText(/store reported belt slip/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /take action on this job/i }));
    expect(onAct).toHaveBeenCalledWith('MWO-1');
  });
});
