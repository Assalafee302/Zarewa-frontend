import { describe, it, expect } from 'vitest';
import { selectPriceListRowsAsOf, normalizePricingAsAtIso, localCalendarDateIso } from './pricingAsOf.js';

describe('pricingAsOf (FE)', () => {
  it('picks latest effective_from on/before asAt per scope', () => {
    const rows = [
      { gaugeKey: '0.24', designKey: 'iv', branchId: 'BR-KD', unitPricePerMeterNgn: 4000, effectiveFromIso: '2026-01-01' },
      { gaugeKey: '0.24', designKey: 'iv', branchId: 'BR-KD', unitPricePerMeterNgn: 4500, effectiveFromIso: '2026-06-01' },
      { gaugeKey: '0.24', designKey: 'iv', branchId: 'BR-KD', unitPricePerMeterNgn: 5000, effectiveFromIso: '2026-12-01' },
    ];
    const asOf = selectPriceListRowsAsOf(rows, '2026-07-01');
    expect(asOf).toHaveLength(1);
    expect(asOf[0].unitPricePerMeterNgn).toBe(4500);
  });

  it('normalizePricingAsAtIso keeps YYYY-MM-DD', () => {
    expect(normalizePricingAsAtIso('2026-04-01T12:00:00Z')).toBe('2026-04-01');
  });

  it('localCalendarDateIso is YYYY-MM-DD', () => {
    expect(localCalendarDateIso(new Date(2026, 6, 10))).toBe('2026-07-10');
  });
});
