import { describe, expect, it } from 'vitest';
import { chairmanOfficeHref, chairmanOfficeHrefFromLegacyFamily } from './chairmanOfficeHrefs.js';

describe('chairmanOfficeHrefFromLegacyFamily', () => {
  it('sends household tabs to Chairman household', () => {
    expect(chairmanOfficeHrefFromLegacyFamily('domestic-dashboard')).toBe(
      '/chairman?tab=household&benefitsTab=domestic'
    );
    expect(chairmanOfficeHrefFromLegacyFamily('benefits', new URLSearchParams('tab=domestic'))).toBe(
      '/chairman?tab=household&benefitsTab=domestic'
    );
  });

  it('sends school fees and export onto scholarships', () => {
    expect(chairmanOfficeHrefFromLegacyFamily('benefits', new URLSearchParams('tab=school-fees'))).toBe(
      '/chairman?tab=scholarships&benefitsTab=school-fees'
    );
    expect(chairmanOfficeHrefFromLegacyFamily('benefits', new URLSearchParams('tab=export'))).toBe(
      '/chairman?tab=scholarships&benefitsTab=export'
    );
  });

  it('keeps staff deep-links', () => {
    expect(
      chairmanOfficeHrefFromLegacyFamily('benefits', new URLSearchParams('tab=domestic&staff=DOM-1'))
    ).toBe('/chairman?tab=household&benefitsTab=domestic&staff=DOM-1');
  });

  it('sends fee-request queues onto scholarships', () => {
    expect(chairmanOfficeHrefFromLegacyFamily('scholarship-requests')).toBe(
      '/chairman?tab=scholarships&benefitsTab=requests'
    );
    expect(chairmanOfficeHref('scholarships')).toBe('/chairman?tab=scholarships');
    expect(chairmanOfficeHrefFromLegacyFamily('family')).toBe('/chairman?tab=scholarships');
  });

  it('sends mining and old HQ-special registers to Chairman mining', () => {
    expect(chairmanOfficeHrefFromLegacyFamily('mining')).toBe('/chairman?tab=mining');
    expect(chairmanOfficeHrefFromLegacyFamily('hq-special')).toBe('/chairman?tab=mining');
    expect(chairmanOfficeHrefFromLegacyFamily('benefits', new URLSearchParams('tab=hq-special'))).toBe(
      '/chairman?tab=mining'
    );
  });
});
