import { describe, it, expect } from 'vitest';
import { queueAgeKey, compareQueueOldestFirst, sortQueueOldestFirst } from './deskQueueOrder';

describe('queueAgeKey', () => {
  it('ages by when the wait started, not when it was approved', () => {
    // A refund requested in July and approved yesterday has kept someone waiting
    // since July. Approval date would put it at the back of the queue.
    const row = { requestedAtISO: '2026-07-02', approvalDate: '2026-09-10' };
    expect(queueAgeKey(row)).toBe('2026-07-02');
  });

  it('reads the field each queue actually carries', () => {
    expect(queueAgeKey({ requestDate: '2026-08-01' })).toBe('2026-08-01');
    expect(queueAgeKey({ dateISO: '2026-08-02' })).toBe('2026-08-02');
    expect(queueAgeKey({ date: '2026-08-03' })).toBe('2026-08-03');
    expect(queueAgeKey({ createdAtISO: '2026-08-04' })).toBe('2026-08-04');
  });

  it('is empty for a row with no usable date', () => {
    expect(queueAgeKey({ amountNgn: 500 })).toBe('');
    expect(queueAgeKey({ dateISO: '   ' })).toBe('');
    expect(queueAgeKey(null)).toBe('');
  });
});

describe('compareQueueOldestFirst', () => {
  it('puts the longest wait first', () => {
    const old = { requestedAtISO: '2026-06-01' };
    const recent = { requestedAtISO: '2026-09-10' };
    expect(compareQueueOldestFirst(old, recent)).toBeLessThan(0);
    expect(compareQueueOldestFirst(recent, old)).toBeGreaterThan(0);
  });

  it('surfaces undated rows rather than burying them', () => {
    // An undated row in a money queue is an anomaly. Sorting it last would hide it
    // below the cap, which is the exact failure this ordering exists to prevent.
    const undated = { refundID: 'RF-1' };
    const dated = { requestedAtISO: '2026-06-01' };
    expect(compareQueueOldestFirst(undated, dated)).toBeLessThan(0);
  });

  it('treats two undated rows as equal', () => {
    expect(compareQueueOldestFirst({ a: 1 }, { b: 2 })).toBe(0);
  });
});

describe('sortQueueOldestFirst', () => {
  it('drains the queue from the correct end', () => {
    const rows = [
      { id: 'new', requestedAtISO: '2026-09-10' },
      { id: 'oldest', requestedAtISO: '2026-05-01' },
      { id: 'middle', requestedAtISO: '2026-07-15' },
    ];
    expect(sortQueueOldestFirst(rows).map((r) => r.id)).toEqual(['oldest', 'middle', 'new']);
  });

  it('survives truncation: the oldest work stays on screen', () => {
    // The regression this guards. Twenty rows, a cap of three — under the old
    // newest-first order the three oldest were exactly the ones cut.
    const rows = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      requestedAtISO: `2026-09-${String(i + 1).padStart(2, '0')}`,
    }));
    const visible = sortQueueOldestFirst(rows).slice(0, 3).map((r) => r.id);
    expect(visible).toEqual([0, 1, 2]);
  });

  it('keeps a priority group ahead of the age order', () => {
    // Receipts missing a cutting list still come first; age orders within each group.
    const rows = [
      { id: 'ok-old', missing: false, dateISO: '2026-05-01' },
      { id: 'missing-new', missing: true, dateISO: '2026-09-01' },
      { id: 'missing-old', missing: true, dateISO: '2026-06-01' },
    ];
    const out = sortQueueOldestFirst(rows, { priority: (r) => r.missing }).map((r) => r.id);
    expect(out).toEqual(['missing-old', 'missing-new', 'ok-old']);
  });

  it('does not mutate the array it was given', () => {
    const rows = [{ id: 'b', dateISO: '2026-09-01' }, { id: 'a', dateISO: '2026-01-01' }];
    const copy = [...rows];
    sortQueueOldestFirst(rows);
    expect(rows).toEqual(copy);
  });

  it('handles junk input without throwing', () => {
    expect(sortQueueOldestFirst(null)).toEqual([]);
    expect(sortQueueOldestFirst(undefined)).toEqual([]);
  });
});
