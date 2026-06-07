import { describe, expect, it } from 'vitest';
import { getPageTourForPath } from './pageTourGuide.js';

describe('pageTourGuide', () => {
  it('returns cashier desk tour', () => {
    const t = getPageTourForPath('/cashier');
    expect(t?.query).toMatch(/cashier desk/i);
  });

  it('returns accounting desk tour', () => {
    const t = getPageTourForPath('/accounting');
    expect(t?.query).toMatch(/accounting desk/i);
  });

  it('returns sales workflow tour', () => {
    const t = getPageTourForPath('/sales');
    expect(t?.query).toMatch(/quotation/i);
  });
});
