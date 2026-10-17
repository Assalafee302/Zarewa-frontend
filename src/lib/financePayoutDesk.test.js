import { describe, expect, it } from 'vitest';
import {
  filterPayoutDueRows,
  matchesPayoutQuery,
  haulageReadyNgn,
  nextPayoutSort,
  payoutAgeDays,
  refundLineReadyNgn,
  sortKeyedRows,
  sortPayoutDueRows,
  sortPayoutQueue,
  summarizePayoutDue,
} from './financePayoutDesk.js';
import { overdueRefundsHeadline, payoutLineAccountGate, refundQueueAge } from './financePayoutDesk.js';

const today = new Date('2026-09-29T12:00:00Z');

const rows = [
  {
    id: 'PR-1',
    kindKey: 'expense',
    kind: 'Expense request',
    party: 'Fuel vendor',
    ref: 'PR-1',
    date: '2026-09-20',
    ageDays: 9,
    amount: 2000,
    payable: true,
    statusLabel: 'Ready',
  },
  {
    id: 'RF-1',
    kindKey: 'refund',
    kind: 'Customer refund',
    party: 'Ada Musa',
    ref: 'RF-1',
    date: '2026-09-28',
    ageDays: 1,
    amount: 0,
    heldAmount: 45000,
    payable: false,
    statusLabel: 'Held',
  },
  {
    id: 'PO-1',
    kindKey: 'haulage',
    kind: 'PO haulage',
    party: 'Kano haulage',
    ref: 'PO-1',
    date: '2026-09-27',
    ageDays: 2,
    amount: 8000,
    payable: true,
    statusLabel: 'Ready',
  },
];

describe('financePayoutDesk', () => {
  it('counts calendar days since approval', () => {
    expect(payoutAgeDays('2026-09-22', today)).toBe(7);
    expect(payoutAgeDays('2026-09-29T08:00:00', today)).toBe(0);
    expect(payoutAgeDays('', today)).toBeNull();
  });

  it('filters by kind, readiness, and payee text', () => {
    expect(filterPayoutDueRows(rows, { kind: 'refund' }).map((row) => row.id)).toEqual(['RF-1']);
    expect(filterPayoutDueRows(rows, { status: 'ready' }).map((row) => row.id)).toEqual(['PR-1', 'PO-1']);
    expect(filterPayoutDueRows(rows, { query: 'ada' }).map((row) => row.id)).toEqual(['RF-1']);
  });

  it('sorts due rows and keeps payable lines ahead of a date tie', () => {
    const tied = [
      { id: 'held', date: '2026-09-01', payable: false, amount: 10, party: 'B', kind: 'Refund' },
      { id: 'ready', date: '2026-09-01', payable: true, amount: 10, party: 'A', kind: 'Refund' },
    ];
    expect(sortPayoutDueRows(tied, 'date', 'desc').map((row) => row.id)).toEqual(['ready', 'held']);
    expect(sortPayoutDueRows(rows, 'amount', 'desc').map((row) => row.id)).toEqual(['PO-1', 'PR-1', 'RF-1']);
    expect(sortPayoutDueRows(rows, 'age', 'desc')[0].id).toBe('PR-1');
  });

  it('summarises ready cash separately from held refunds', () => {
    expect(summarizePayoutDue(rows)).toMatchObject({
      payableCount: 2,
      payableNgn: 10000,
      heldCount: 1,
      heldNgn: 45000,
      oldestReadyDays: 9,
      byKind: { expense: 1, refund: 1, haulage: 1 },
    });
  });

  it('sorts a desk queue by amount or date', () => {
    const items = [
      { id: 'a', amount: 100, date: '2026-09-01' },
      { id: 'b', amount: 900, date: '2026-09-20' },
    ];
    expect(
      sortPayoutQueue(items, 'amount_desc', (item) => item.amount, (item) => item.date).map((item) => item.id)
    ).toEqual(['b', 'a']);
    expect(
      sortPayoutQueue(items, 'date_asc', (item) => item.amount, (item) => item.date).map((item) => item.id)
    ).toEqual(['a', 'b']);
    expect(matchesPayoutQuery('RF-2 Ada', 'ada')).toBe(true);
    expect(nextPayoutSort('date', 'desc', 'date')).toEqual({ key: 'date', dir: 'asc' });
    expect(nextPayoutSort('date', 'desc', 'payee')).toEqual({ key: 'payee', dir: 'asc' });
    expect(
      sortKeyedRows(
        [
          { refundID: 'B', amount: 10 },
          { refundID: 'A', amount: 40 },
        ],
        'amount',
        'desc',
        { amount: (row) => row.amount }
      ).map((row) => row.refundID)
    ).toEqual(['A', 'B']);
  });

  it('leaves held refunds and held haulage out of the Ready total', () => {
    expect(
      refundLineReadyNgn({
        amountDueNgn: 208_000,
        parentRefund: { payoutHold: true },
      })
    ).toBe(0);
    expect(refundLineReadyNgn({ amountDueNgn: 50_000, parentRefund: { payoutHold: false } })).toBe(50_000);
    expect(haulageReadyNgn({ outstandingNgn: 10_000, transportPayoutHold: true })).toBe(0);
    expect(haulageReadyNgn({ outstandingNgn: 10_000, transportPayoutHold: false })).toBe(10_000);
  });
});

describe('payoutLineAccountGate (A1)', () => {
  const ok = { queueKey: 'customer-0', payeeBankName: 'GTBank', payeeAccountNo: '0123456789', amountDueNgn: 5000 };
  const bad = { queueKey: 'staff-1', recipientLabel: 'Driver Ali', payeeBankName: '', payeeAccountNo: '000', amountDueNgn: 4000 };

  it('flags a line whose payee has no usable account', () => {
    expect(payoutLineAccountGate(bad).missing).toBe(true);
    expect(payoutLineAccountGate({ payeeBankName: 'GTBank', payeeAccountNo: '—' }).missing).toBe(true);
    expect(payoutLineAccountGate(ok).missing).toBe(false);
  });

  it('blocks a payable line when a sibling payee on the same refund is missing an account', () => {
    expect(payoutLineAccountGate(ok, [ok, bad]).blockedBy).toBe('Driver Ali');
    expect(payoutLineAccountGate(ok, [ok, { ...bad, amountDueNgn: 0 }]).blockedBy).toBe('');
  });
});

describe('refund queue age and overdue tile (A4)', () => {
  const today = new Date(2026, 9, 17);
  it('is amber after 7 days and red after 30', () => {
    expect(refundQueueAge({ approvalDate: '2026-10-10' }, today)).toEqual({ days: 7, tone: 'none' });
    expect(refundQueueAge({ approvalDate: '2026-10-09' }, today)).toEqual({ days: 8, tone: 'amber' });
    expect(refundQueueAge({ approvedAtISO: '2026-09-16T10:00:00Z' }, today)).toEqual({ days: 31, tone: 'red' });
    expect(refundQueueAge({}, today).tone).toBe('none');
  });

  it('counts overdue refunds once and sums what is left to pay on them', () => {
    const old = { approvalDate: '2026-10-01' };
    const fresh = { approvalDate: '2026-10-15' };
    const h = overdueRefundsHeadline(
      [
        { refundID: 'RF-1', amountDueNgn: 10000, parentRefund: old },
        { refundID: 'RF-1', amountDueNgn: 3000, parentRefund: old },
        { refundID: 'RF-2', amountDueNgn: 0, parentRefund: old },
        { refundID: 'RF-3', amountDueNgn: 5000, parentRefund: fresh },
      ],
      today
    );
    expect(h).toEqual({ count: 1, ngn: 13000 });
  });
});
