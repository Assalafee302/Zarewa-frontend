import { describe, it, expect } from 'vitest';
import { refundGlImpactFromLines, refundGlImpactRows } from './refundGlPreview.js';

describe('refundGlPreview', () => {
  it('maps overpayment to deposit GL hint', () => {
    const rows = refundGlImpactRows(['Overpayment']);
    expect(rows[0].posting).toContain('2500');
    expect(rows[0].revenueReview).toBeFalsy();
  });

  it('flags revenue review for post-production non-overpayment categories', () => {
    const rows = refundGlImpactRows(['Unproduced meterage'], { hasCompletedProduction: true });
    expect(rows[0].revenueReview).toBe(true);
  });

  it('derives categories from included calculation lines only', () => {
    const rows = refundGlImpactFromLines(
      [
        { include: true, category: 'Overpayment', amountNgn: '5000' },
        { include: false, category: 'Other', amountNgn: '1000' },
      ],
      { hasCompletedProduction: false }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe('Overpayment');
  });
});
