import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperationsInventoryAttentionPanel } from './OperationsInventoryAttentionPanel';

afterEach(() => cleanup());

const ATTENTION = {
  ok: true,
  thresholds: { stalePlannedDays: 3, staleRunningDays: 2 },
  stuckProductionAttentionDistinctJobCount: 1,
  stuckProduction: {
    plannedWithoutCoils: {
      count: 1,
      samples: [{ jobID: 'J-1', cuttingListId: 'CL-1', customerName: 'Acme', ageDays: 4 }],
    },
    plannedStale: { count: 0, samples: [] },
    runningStale: { count: 0, samples: [] },
    managerReviewOpen: { count: 0, samples: [] },
    coilSpecMismatchPending: { count: 0, samples: [] },
  },
  inventoryChain: {
    wipProductsNonZero: 0,
    completionAdjustmentsLast30d: 0,
    deliveriesInProgress: { count: 0 },
  },
  crossModule: { partialPurchaseOrderCount: 2, openInTransitLoadCount: 1 },
};

describe('OperationsInventoryAttentionPanel', () => {
  it('opens a stuck job and jumps to Procurement', async () => {
    const user = userEvent.setup();
    const onOpenProductionTrace = vi.fn();
    const onGoProcurement = vi.fn();
    render(
      <OperationsInventoryAttentionPanel
        attention={ATTENTION}
        hasWorkspaceData
        onOpenProductionTrace={onOpenProductionTrace}
        onGoProcurement={onGoProcurement}
      />
    );
    await user.click(screen.getByRole('button', { name: /cl-1/i }));
    expect(onOpenProductionTrace).toHaveBeenCalledWith('CL-1');
    await user.click(screen.getByRole('button', { name: /open procurement/i }));
    expect(onGoProcurement).toHaveBeenCalledTimes(1);
  });
});
