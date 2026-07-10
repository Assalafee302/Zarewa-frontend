import { describe, expect, it } from 'vitest';
import { mergeDashboardPollIntoSnapshot, mergeRowsByKey } from './bootstrapPollMerge';

describe('mergeRowsByKey', () => {
  it('updates matching rows and appends new poll rows', () => {
    const prev = [
      { id: 'Q1', totalNgn: 100 },
      { id: 'Q2', totalNgn: 200 },
    ];
    const poll = [
      { id: 'Q1', totalNgn: 150, paidNgn: 50 },
      { id: 'Q3', totalNgn: 300 },
    ];
    const merged = mergeRowsByKey(prev, poll);
    expect(merged).toHaveLength(3);
    expect(merged[0]).toMatchObject({ id: 'Q1', totalNgn: 150, paidNgn: 50 });
    expect(merged[1]).toMatchObject({ id: 'Q2', totalNgn: 200 });
    expect(merged[2]).toMatchObject({ id: 'Q3', totalNgn: 300 });
  });
});

describe('mergeDashboardPollIntoSnapshot', () => {
  it('keeps longer local arrays when poll payload is trimmed', () => {
    const prev = {
      ok: true,
      quotations: Array.from({ length: 5 }, (_, i) => ({ id: `Q${i}`, totalNgn: i })),
      session: { user: { id: 'u1' } },
    };
    const poll = {
      ok: true,
      quotations: [
        { id: 'Q0', totalNgn: 99 },
        { id: 'Q4', totalNgn: 44 },
      ],
      session: { user: { id: 'u1', displayName: 'User' } },
      staffPurchaseCreditPendingCount: 2,
    };
    const merged = mergeDashboardPollIntoSnapshot(prev, poll);
    expect(merged.quotations).toHaveLength(5);
    expect(merged.quotations[0].totalNgn).toBe(99);
    expect(merged.quotations[4].totalNgn).toBe(44);
    expect(merged.session.user.displayName).toBe('User');
    expect(merged.staffPurchaseCreditPendingCount).toBe(2);
  });

  it('preserves domain accounting packs from previous snapshot', () => {
    const prev = {
      ok: true,
      accountingCreditors: { ok: true, rows: [{ id: 'c1' }] },
    };
    const poll = { ok: true, quotations: [] };
    const merged = mergeDashboardPollIntoSnapshot(prev, poll);
    expect(merged.accountingCreditors.rows).toHaveLength(1);
  });
});
