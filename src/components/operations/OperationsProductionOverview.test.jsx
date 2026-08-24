import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperationsProductionOverview } from './OperationsProductionOverview';

vi.mock('./DeliveryPodPanel', () => ({ DeliveryPodPanel: () => null }));
vi.mock('./ReportFaultPanel', () => ({ ReportFaultPanel: () => null }));
vi.mock('./RequestDieselPanel', () => ({ RequestDieselPanel: () => null }));
vi.mock('./RequestSuppliesPanel', () => ({ RequestSuppliesPanel: () => null }));
vi.mock('./OperationsMachinesPanel', () => ({ OperationsMachinesPanel: () => null }));
vi.mock('./OperationsInventoryAttentionPanel', () => ({
  OperationsInventoryAttentionPanel: () => null,
}));

afterEach(() => cleanup());

const BASE = {
  coilLots: [],
  inventoryRows: [],
  cuttingLists: [],
  productionQueueModel: { mode: 'online', sections: [] },
  conversionStats: { efficiencyPct: null, flagged: 0 },
  productionQueueStats: {
    noCoil: 2,
    waiting: 1,
    needsReview: 1,
    overdue: 1,
    attention: 2,
  },
  hasWorkspaceData: true,
  masterData: {},
};

describe('OperationsProductionOverview', () => {
  it('Jobs without coil jumps to the Register no-coil filter', async () => {
    const user = userEvent.setup();
    const onGoProduction = vi.fn();
    render(<OperationsProductionOverview {...BASE} onGoProduction={onGoProduction} />);
    await user.click(screen.getByRole('button', { name: /jobs without coil/i }));
    expect(onGoProduction).toHaveBeenCalledWith('no_coil');
  });

  it('places the plant register next to the store desk', () => {
    render(<OperationsProductionOverview {...BASE} />);
    expect(screen.getByTestId('operations-plant-register')).toBeTruthy();
  });

  it('does not show maintenance vendors on Operations Desk', () => {
    render(<OperationsProductionOverview {...BASE} />);
    expect(screen.queryByText(/maintenance vendors/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /add vendor/i })).toBeNull();
  });
});
