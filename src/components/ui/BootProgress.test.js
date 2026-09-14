import { describe, expect, it } from 'vitest';
import { bootProgressPct } from './BootProgress';

describe('bootProgressPct', () => {
  it('starts near zero and never claims 100% before the expected wait ends', () => {
    expect(bootProgressPct(0, 45_000)).toBe(0);
    expect(bootProgressPct(1_000, 45_000)).toBeGreaterThan(0);
    expect(bootProgressPct(1_000, 45_000)).toBeLessThan(20);
    expect(bootProgressPct(45_000, 45_000)).toBeLessThan(93);
    expect(bootProgressPct(45_000, 45_000)).toBeGreaterThan(80);
    expect(bootProgressPct(120_000, 45_000)).toBe(92);
  });
});
