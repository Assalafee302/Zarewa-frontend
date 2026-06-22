import { describe, expect, it } from 'vitest';
import { suggestExpenseCategoryFromMemoText } from '../../shared/lib/expenseCategorySuggestions.js';

describe('suggestExpenseCategoryFromMemoText', () => {
  it('suggests logistics for haulage keywords', () => {
    const r = suggestExpenseCategoryFromMemoText({ subject: 'Haulage', body: 'Pay transporter' });
    expect(r.category).toBe('Truck & mining');
  });

  it('returns null when no match', () => {
    const r = suggestExpenseCategoryFromMemoText({ subject: 'Hello', body: 'General note' });
    expect(r.category).toBeNull();
  });
});
