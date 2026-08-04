import { describe, expect, it } from 'vitest';
import {
  buildOtIntelFromRows,
  normalizeOtHubTab,
  userMayAccessOtWorkspace,
} from './otWorkspaceAccess';

describe('otWorkspaceAccess', () => {
  it('gates access on OT permissions', () => {
    expect(userMayAccessOtWorkspace(() => false)).toBe(false);
    expect(userMayAccessOtWorkspace((p) => p === 'ot.request')).toBe(true);
    expect(userMayAccessOtWorkspace((p) => p === '*')).toBe(true);
  });

  it('normalizes hub tabs to first allowed', () => {
    const has = (p) => p === 'ot.pay';
    // Cashier may open overview + pay (+ track), not requests
    expect(normalizeOtHubTab('requests', has)).toBe('overview');
    expect(normalizeOtHubTab('pay', has)).toBe('pay');
    expect(normalizeOtHubTab('bogus', has)).toBe('overview');
  });

  it('builds intel KPIs', () => {
    const intel = buildOtIntelFromRows([
      { status: 'draft', totalPayableNgn: 0, workType: 'production' },
      { status: 'pending_bm_approval', totalPayableNgn: 0, workType: 'production' },
      { status: 'approved_by_bm', totalPayableNgn: 5000, workType: 'offload' },
      { status: 'paid', totalPayableNgn: 3000, workType: 'production' },
    ]);
    expect(intel.openPipeline).toBe(3);
    expect(intel.payableQueueNgn).toBe(5000);
    expect(intel.paidNgn).toBe(3000);
    expect(intel.workTypeCounts.production).toBe(3);
  });
});
