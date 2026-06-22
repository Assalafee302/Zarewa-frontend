import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchExpenseCategorySuggestion } from './expenseCategorySuggestApi.js';

vi.mock('./apiBase.js', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from './apiBase.js';

describe('fetchExpenseCategorySuggestion', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it('uses API result when available', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      data: { category: 'Maintenance', suggestedCategory: 'Maintenance', actorMaySelect: true },
    });
    const r = await fetchExpenseCategorySuggestion(
      { description: 'Roof repair at Yola factory building perimeter wall section' },
      { roleKey: 'finance_officer', permissions: ['expenses.create'] },
      () => true
    );
    expect(r.category).toBe('Maintenance');
    expect(r.source).toBe('api');
  });

  it('falls back to client rules when API fails', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: false, data: null });
    const r = await fetchExpenseCategorySuggestion(
      { description: 'Diesel top-up for plant fuel store this week' },
      { roleKey: 'sales_staff', permissions: ['expenses.create'] },
      (p) => p === 'expenses.create'
    );
    expect(r.category).toBe('Fuel & lubricant');
    expect(r.source).toBe('client');
  });
});
