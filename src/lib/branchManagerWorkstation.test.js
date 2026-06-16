import { describe, it, expect } from 'vitest';
import {
  buildBranchHealthSignals,
  buildManagerTargetSourceMeta,
  computeBranchOpenActionCount,
  healthToneFromCount,
} from './branchManagerWorkstation';

describe('branchManagerWorkstation', () => {
  it('healthToneFromCount maps counts to tones', () => {
    expect(healthToneFromCount(0)).toBe('green');
    expect(healthToneFromCount(2)).toBe('amber');
    expect(healthToneFromCount(5)).toBe('red');
  });

  it('computeBranchOpenActionCount sums queue counts without double-counting attention', () => {
    expect(
      computeBranchOpenActionCount({
        ordersCount: 2,
        cashOutCount: 1,
        qcCount: 0,
        materialCount: 1,
        procurementCount: 2,
        governanceCount: 1,
        editsCount: 2,
        creditPendingCount: 0,
        stockRegisterCount: 1,
      })
    ).toBe(10);
  });

  it('buildManagerTargetSourceMeta includes line text', () => {
    const meta = buildManagerTargetSourceMeta({ managerTargetsPersonalOverride: true }, null);
    expect(meta.line).toContain('Personal');
    expect(meta.shortLabel).toBe('Personal');
  });

  it('buildBranchHealthSignals returns operational areas', () => {
    const signals = buildBranchHealthSignals({ ordersCount: 3, governanceCount: 1, procurementCount: 2 });
    expect(signals.find((s) => s.key === 'orders')?.tone).toBe('amber');
    expect(signals.find((s) => s.key === 'procurement')?.count).toBe(2);
    expect(signals.find((s) => s.key === 'governance')?.tone).toBe('red');
  });
});
