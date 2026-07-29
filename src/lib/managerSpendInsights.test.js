import { describe, expect, it } from 'vitest';
import {
  buildManagerSpendInsights,
  buildSpendRows,
  classifyPaymentRequestStatus,
  momSpikeSignals,
  monthBounds,
  priorMonthKey,
  recurringPayeeSignals,
} from './managerSpendInsights.js';

describe('managerSpendInsights', () => {
  it('monthBounds and priorMonthKey', () => {
    expect(monthBounds('2026-07')).toEqual({ startIso: '2026-07-01', endIso: '2026-07-31' });
    expect(priorMonthKey('2026-07')).toBe('2026-06');
    expect(priorMonthKey('2026-01')).toBe('2025-12');
  });

  it('classifies payment request statuses', () => {
    expect(classifyPaymentRequestStatus({ approvalStatus: 'Pending', amountRequestedNgn: 100 })).toBe('pending');
    expect(
      classifyPaymentRequestStatus({ approvalStatus: 'Approved', amountRequestedNgn: 100, paidAmountNgn: 0 })
    ).toBe('approved_awaiting');
    expect(
      classifyPaymentRequestStatus({ approvalStatus: 'Approved', amountRequestedNgn: 100, paidAmountNgn: 100 })
    ).toBe('paid');
    expect(classifyPaymentRequestStatus({ approvalStatus: 'Rejected', amountRequestedNgn: 100 })).toBe('rejected');
  });

  it('includes Maintenance category and pending by default', () => {
    const rows = buildSpendRows(
      {
        paymentRequests: [
          {
            requestID: 'PR1',
            requestDate: '2026-07-10',
            approvalStatus: 'Pending',
            amountRequestedNgn: 200_000,
            paidAmountNgn: 0,
            expenseCategory: 'Maintenance',
            branchId: 'BR-KD',
            payeeName: 'Musa Eng',
            description: 'Extruder bearing',
          },
          {
            requestID: 'PR2',
            requestDate: '2026-07-12',
            approvalStatus: 'Approved',
            amountRequestedNgn: 80_000,
            paidAmountNgn: 80_000,
            expenseCategory: 'Fuel & lubricant',
            branchId: 'BR-KD',
          },
        ],
        expenses: [],
      },
      { monthKey: '2026-07', branchId: 'BR-KD', paidOnly: false }
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.category === 'Maintenance')?.amountNgn).toBe(200_000);
  });

  it('paidOnly filter drops unpaid pending', () => {
    const rows = buildSpendRows(
      {
        paymentRequests: [
          {
            requestID: 'PR1',
            requestDate: '2026-07-10',
            approvalStatus: 'Pending',
            amountRequestedNgn: 200_000,
            paidAmountNgn: 0,
            expenseCategory: 'Maintenance',
            branchId: 'BR-KD',
          },
        ],
      },
      { monthKey: '2026-07', paidOnly: true }
    );
    expect(rows).toHaveLength(0);
  });

  it('MoM signal requires pct, absolute floor, and material prior baseline', () => {
    const tiny = momSpikeSignals([
      { category: 'Office expenses', amountNgn: 11_000, priorNgn: 8_000, deltaPct: 37, deltaNgn: 3_000 },
    ]);
    expect(tiny).toHaveLength(0);

    const thinPrior = momSpikeSignals([
      {
        category: 'Maintenance',
        amountNgn: 300_000,
        priorNgn: 10_000,
        deltaPct: 2900,
        deltaNgn: 290_000,
      },
    ]);
    expect(thinPrior).toHaveLength(0);

    const real = momSpikeSignals([
      {
        category: 'Maintenance',
        amountNgn: 300_000,
        priorNgn: 200_000,
        deltaPct: 50,
        deltaNgn: 100_000,
      },
    ]);
    expect(real).toHaveLength(1);
    expect(real[0].category).toBe('Maintenance');
  });

  it('spike-then-back-to-normal does not keep firing MoM the next month', () => {
    const snapshot = {
      paymentRequests: [
        {
          requestID: 'PR-SPIKE',
          requestDate: '2026-06-10',
          approvalStatus: 'Approved',
          amountRequestedNgn: 800_000,
          paidAmountNgn: 800_000,
          expenseCategory: 'Maintenance',
          branchId: 'BR-KD',
          payeeName: 'One-off repair',
        },
        {
          requestID: 'PR-NORMAL',
          requestDate: '2026-07-10',
          approvalStatus: 'Approved',
          amountRequestedNgn: 90_000,
          paidAmountNgn: 90_000,
          expenseCategory: 'Maintenance',
          branchId: 'BR-KD',
          payeeName: 'Routine',
        },
      ],
    };
    const spikeMonth = buildManagerSpendInsights(snapshot, { monthKey: '2026-06', branchId: 'BR-KD' });
    // June prior (May) is empty → thin prior → no MoM % alert (one-off still shows in drivers)
    expect(spikeMonth.signals.filter((s) => s.kind === 'mom_spike')).toHaveLength(0);
    expect(spikeMonth.drivers[0]?.category).toBe('Maintenance');

    const afterSpike = buildManagerSpendInsights(snapshot, { monthKey: '2026-07', branchId: 'BR-KD' });
    // July is down vs June spike — must not fire
    expect(afterSpike.vsPriorPct).toBeLessThan(0);
    expect(afterSpike.signals.filter((s) => s.kind === 'mom_spike')).toHaveLength(0);
  });

  it('flags recurring payees', () => {
    const signals = recurringPayeeSignals([
      { payee: 'Alhaji Musa', amountNgn: 50_000 },
      { payee: 'Alhaji Musa', amountNgn: 40_000 },
      { payee: 'Alhaji Musa', amountNgn: 30_000 },
      { payee: 'Other', amountNgn: 10_000 },
    ]);
    expect(signals).toHaveLength(1);
    expect(signals[0].count).toBe(3);
  });

  it('buildManagerSpendInsights returns drivers and totals', () => {
    const pack = buildManagerSpendInsights(
      {
        paymentRequests: [
          {
            requestID: 'PR1',
            requestDate: '2026-07-05',
            approvalStatus: 'Approved',
            amountRequestedNgn: 500_000,
            paidAmountNgn: 500_000,
            expenseCategory: 'Maintenance',
            branchId: 'BR-KD',
            payeeName: 'Vendor A',
          },
          {
            requestID: 'PR2',
            requestDate: '2026-06-05',
            approvalStatus: 'Approved',
            amountRequestedNgn: 100_000,
            paidAmountNgn: 100_000,
            expenseCategory: 'Maintenance',
            branchId: 'BR-KD',
            payeeName: 'Vendor A',
          },
        ],
      },
      { monthKey: '2026-07', branchId: 'BR-KD' }
    );
    expect(pack.totalNgn).toBe(500_000);
    expect(pack.priorTotalNgn).toBe(100_000);
    expect(pack.drivers[0].category).toBe('Maintenance');
    expect(pack.signals.some((s) => s.kind === 'mom_spike')).toBe(true);
  });
});

describe('Spend tab BM payment-register boundary', () => {
  it('sales_manager cannot open /accounts (Spend drill footer must not link)', async () => {
    const { userMayAccessLegacyAccountsRoute } = await import('./legacyAccountsAccess.js');
    // ManagerSpendTab gates Link via this helper — BM must stay false even with finance.approve.
    expect(userMayAccessLegacyAccountsRoute('sales_manager', ['expenses.create', 'finance.approve', 'reports.view'])).toBe(
      false
    );
    expect(userMayAccessLegacyAccountsRoute('md', ['finance.view', 'reports.view'])).toBe(true);
  });
});
