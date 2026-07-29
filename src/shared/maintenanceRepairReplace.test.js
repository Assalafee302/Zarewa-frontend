import { describe, expect, it } from 'vitest';
import {
  repairReplaceFlag,
  repairReplaceLabel,
} from './maintenanceRepairReplace.js';

describe('maintenanceRepairReplace (frontend)', () => {
  it('matches backend thresholds', () => {
    expect(
      repairReplaceFlag({
        lifetimeMaintenanceNgn: 4_000_000,
        costNgn: 10_000_000,
        netBookValueNgn: 8_000_000,
      })
    ).toBe('watch');
    expect(
      repairReplaceFlag({
        lifetimeMaintenanceNgn: 9_000_000,
        costNgn: 10_000_000,
        netBookValueNgn: 1_000_000,
      })
    ).toBe('replace_review');
    expect(repairReplaceLabel('watch')).toBe('Watch');
  });
});
