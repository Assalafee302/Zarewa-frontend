import { describe, expect, it } from 'vitest';
import { bootProgressPct } from './BootProgress';

describe('bootProgressPct', () => {
  it('bootProgressPct starts near zero and never claims 100% before the expected wait ends', () => {
    expect(bootProgressPct(0, 20_000)).toBe(0);
    expect(bootProgressPct(1_000, 20_000)).toBeGreaterThan(0);
    expect(bootProgressPct(1_000, 20_000)).toBeLessThan(30);
    expect(bootProgressPct(20_000, 20_000)).toBeLessThan(93);
    expect(bootProgressPct(20_000, 20_000)).toBeGreaterThan(80);
    expect(bootProgressPct(60_000, 20_000)).toBe(92);
  });
});
