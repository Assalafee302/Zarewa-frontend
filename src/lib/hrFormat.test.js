import { describe, expect, it } from 'vitest';
import {
  formatNgn,
  hrRequestKindLabel,
  payrollGroupLabel,
  yearsOfServiceFromIso,
} from './hrFormat.js';

describe('hrFormat', () => {
  it('formatNgn formats whole naira', () => {
    expect(formatNgn(150000)).toMatch(/₦/);
    expect(formatNgn(150000)).toContain('150');
  });

  it('payrollGroupLabel maps known groups', () => {
    expect(payrollGroupLabel({ profileExtra: { payrollGroup: 'mining_div' } })).toBe('Mining division');
    expect(payrollGroupLabel({})).toBe('Branch staff');
  });

  it('hrRequestKindLabel maps leave', () => {
    expect(hrRequestKindLabel('leave')).toBe('Leave');
  });

  it('yearsOfServiceFromIso returns null for invalid dates', () => {
    expect(yearsOfServiceFromIso('')).toBeNull();
    expect(yearsOfServiceFromIso('bad')).toBeNull();
  });
});
