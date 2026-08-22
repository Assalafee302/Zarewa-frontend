import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { liveJobCoilDetail, ProductionQueueRecords } from './ProductionQueueRecords';
import { matchesProductionActiveFilter } from './productionQueueFilters';

afterEach(() => cleanup());

const ITEM = {
  id: 'CL-1',
  customer: 'Acme',
  lineStatusLabel: 'Planned',
  lineStatusChipClass: 'border-slate-200 bg-slate-50 text-slate-600',
  needsCoil: true,
  coilLabel: 'No coil yet',
};

describe('matchesProductionActiveFilter', () => {
  it('Attention is overdue or manager review, not every live job', () => {
    expect(matchesProductionActiveFilter({ overdue: true }, 'attention')).toBe(true);
    expect(matchesProductionActiveFilter({ managerReviewRequired: true }, 'attention')).toBe(true);
    expect(matchesProductionActiveFilter({ needsCoil: true }, 'attention')).toBe(false);
    expect(matchesProductionActiveFilter({ needsCoil: true }, 'no_coil')).toBe(true);
  });
});

describe('ProductionQueueRecords', () => {
  it('renders a captioned table whose ID cell is View', async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    render(
      <ProductionQueueRecords
        kind="live"
        caption="In-progress production jobs"
        items={[ITEM]}
        itemKey={(r) => `live-${r.id}`}
        openKey={null}
        onView={onView}
        viewLabel={(r) => `View production job ${r.id}`}
        renderMenu={() => <span>Menu</span>}
        detailOf={liveJobCoilDetail}
      />
    );
    const table = screen.getByRole('table', { name: 'In-progress production jobs' });
    await user.click(within(table).getByRole('button', { name: 'View production job CL-1' }));
    expect(onView).toHaveBeenCalledTimes(1);
  });
});
