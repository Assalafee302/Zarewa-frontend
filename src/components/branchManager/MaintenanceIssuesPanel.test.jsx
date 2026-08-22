import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { apiFetch } from '../../lib/apiBase';
import { MaintenanceIssuesPanel } from './MaintenanceIssuesPanel';

vi.mock('../../lib/apiBase', () => ({
  apiFetch: vi.fn(),
}));

afterEach(() => cleanup());

describe('MaintenanceIssuesPanel', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('shows back-on-line status instead of raw snake_case', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      data: {
        workOrders: [
          {
            id: 'MWO-1',
            referenceNo: 'MWO-1',
            machineName: 'Line A',
            symptom: 'Belt slip',
            status: 'returned_to_production',
            returnedToProductionAtIso: '2026-08-20T10:00:00.000Z',
            priority: 'high',
          },
        ],
      },
    });
    render(<MaintenanceIssuesPanel />);
    expect(await screen.findByText(/back on line/i)).toBeInTheDocument();
    expect(screen.queryByText(/returned_to_production/i)).toBeNull();
  });

  it('reopens the same work order after focus is cleared', async () => {
    apiFetch.mockImplementation(async (url) => {
      if (String(url).includes('openOnly=1')) {
        return {
          ok: true,
          data: {
            workOrders: [
              {
                id: 'MWO-1',
                referenceNo: 'MWO-1',
                machineName: 'Line A',
                symptom: 'Belt slip',
                status: 'open',
              },
            ],
          },
        };
      }
      return { ok: true, data: { workOrder: { id: 'MWO-1', symptom: 'Belt slip', status: 'open' }, technicians: [], vendors: [] } };
    });
    const onHandled = vi.fn();
    const { rerender } = render(
      <MaintenanceIssuesPanel focusWorkOrderId="MWO-1" onFocusWorkOrderHandled={onHandled} />
    );
    await waitFor(() => expect(onHandled).toHaveBeenCalled());
    const detailCalls = () =>
      apiFetch.mock.calls.filter((c) => String(c[0]).includes('/work-orders/MWO-1') && !String(c[0]).includes('openOnly'));
    const afterFirst = detailCalls().length;
    expect(afterFirst).toBeGreaterThan(0);
    rerender(<MaintenanceIssuesPanel focusWorkOrderId="" onFocusWorkOrderHandled={onHandled} />);
    rerender(<MaintenanceIssuesPanel focusWorkOrderId="MWO-1" onFocusWorkOrderHandled={onHandled} />);
    await waitFor(() => expect(detailCalls().length).toBeGreaterThan(afterFirst));
  });
});
