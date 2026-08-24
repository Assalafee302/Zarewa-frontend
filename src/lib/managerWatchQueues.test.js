import { describe, expect, it } from 'vitest';
import { buildManagerWatchModel, waitHoursFromIso, waitTone } from './managerWatchQueues';

const NOW = Date.parse('2026-08-24T12:00:00.000Z');

function hoursAgo(h) {
  return new Date(NOW - h * 36e5).toISOString();
}

describe('managerWatchQueues', () => {
  it('formats wait tone bands', () => {
    expect(waitTone(0.4).label).toMatch(/min/);
    expect(waitTone(6).tone).toBe('ok');
    expect(waitTone(10).tone).toBe('watch');
    expect(waitTone(30).tone).toBe('warn');
    expect(waitTone(50).tone).toBe('urgent');
    expect(waitTone(null).tone).toBe('unknown');
  });

  it('computes hours from ISO timestamps', () => {
    expect(waitHoursFromIso(hoursAgo(10), NOW)).toBeCloseTo(10, 5);
    expect(waitHoursFromIso('2026-08-23', NOW)).toBeGreaterThan(12);
  });

  it('builds aged production, receipt, expense, bank, and extra queues', () => {
    const model = buildManagerWatchModel(
      {
        cuttingLists: [
          {
            id: 'CL-1',
            customer: 'Amina Steel',
            quotationRef: 'Q-9',
            totalMeters: 40,
            productionRegistered: false,
            dateISO: hoursAgo(30),
          },
          {
            id: 'CL-done',
            productionRegistered: true,
            status: 'Finished',
            dateISO: hoursAgo(80),
          },
        ],
        receipts: [
          {
            id: 'RC-1',
            customer: 'Amina Steel',
            amountNgn: 150000,
            status: 'Pending clearance',
            dateISO: hoursAgo(10),
          },
          {
            id: 'RC-cleared',
            status: 'Cleared',
            financeReconciliationSavedAtISO: hoursAgo(1),
            amountNgn: 20000,
            dateISO: hoursAgo(40),
          },
        ],
        paymentRequests: [
          {
            requestID: 'PR-1',
            approvalStatus: 'Approved',
            amountRequestedNgn: 80000,
            paidAmountNgn: 0,
            description: 'Diesel',
            approvedAtISO: hoursAgo(52),
          },
          {
            requestID: 'PR-pending',
            approvalStatus: 'Pending',
            amountRequestedNgn: 5000,
            requestDate: hoursAgo(70),
          },
        ],
        refunds: [
          {
            refundID: 'RF-1',
            status: 'Approved',
            amountNgn: 25000,
            paidAmountNgn: 0,
            customer: 'Amina Steel',
            approvedAtISO: hoursAgo(5),
          },
        ],
        coilRequests: [
          {
            id: 'CR-1',
            status: 'pending',
            materialType: 'Aluzinc',
            colour: 'Blue',
            createdAtISO: hoursAgo(26),
          },
        ],
        productionJobs: [
          {
            jobID: 'PJ-1',
            status: 'Planned',
            needsCoil: true,
            customerName: 'Amina Steel',
            createdAtISO: hoursAgo(8),
          },
        ],
        treasuryAccounts: [
          {
            id: 1,
            name: 'GTBank Main',
            bankName: 'GTBank',
            type: 'Bank',
            openingBalanceNgn: 2_000_000,
            balance: 2_000_000,
            accNo: '0123456789',
            branchId: 'BR-1',
          },
          {
            id: 2,
            name: 'Till',
            bankName: '',
            type: 'Cash',
            openingBalanceNgn: 80_000,
            balance: 80_000,
            accNo: 'N/A',
            branchId: 'BR-1',
          },
        ],
        treasuryMovements: [{ treasuryAccountId: 1, amountNgn: 250_000 }],
      },
      { session: { currentBranchId: 'BR-1' }, nowMs: NOW }
    );

    expect(model.production.count).toBe(1);
    expect(model.production.items[0].id).toBe('CL-1');
    expect(model.production.oldestHours).toBeCloseTo(30, 5);

    expect(model.receipts.count).toBe(1);
    expect(model.receipts.totalNgn).toBe(150000);

    expect(model.expenses.count).toBe(1);
    expect(model.expenses.items[0].id).toBe('PR-1');
    expect(model.expenses.totalNgn).toBe(80000);
    expect(waitTone(model.expenses.oldestHours).tone).toBe('urgent');

    expect(model.refunds.count).toBe(1);
    expect(model.coilRequests.count).toBe(1);
    expect(model.millBlocked.count).toBe(1);

    expect(model.banks.accounts).toHaveLength(2);
    expect(model.banks.bankNgn).toBe(2_250_000);
    expect(model.banks.cashNgn).toBe(80_000);
    expect(model.banks.totalNgn).toBe(2_330_000);

    expect(model.totals.waitingCount).toBe(6);
    expect(model.totals.agedCount).toBeGreaterThanOrEqual(2);
  });
});
