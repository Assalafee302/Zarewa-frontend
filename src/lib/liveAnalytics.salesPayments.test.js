import { describe, expect, it } from 'vitest';
import { salesPaymentsReceivedRows, salesPaymentsReceivedSummary } from './liveAnalytics.js';

describe('salesPaymentsReceivedRows', () => {
  it('uses sales-receipt cash, not shrunk ledger RECEIPT after finance overpay split', () => {
    const receipts = [
      {
        id: 'SR-1',
        ledgerEntryId: 'LE-REC',
        customer: 'Acme',
        quotationRef: 'QT-1',
        dateISO: '2026-03-10',
        amountNgn: 150_000,
        cashReceivedNgn: 150_000,
        bankReceivedAmountNgn: 150_000,
        financeReconciliationSavedAtISO: '2026-03-11T10:00:00.000Z',
        method: 'Transfer',
        status: 'Cleared',
      },
    ];
    const ledgerEntries = [
      {
        id: 'LE-REC',
        type: 'RECEIPT',
        atISO: '2026-03-10T12:00:00.000Z',
        amountNgn: 100_000,
        customerName: 'Acme',
        quotationRef: 'QT-1',
        paymentMethod: 'Transfer',
        bankReference: 'REF-1',
      },
      {
        id: 'LE-OV',
        type: 'OVERPAY_ADVANCE',
        atISO: '2026-03-10T12:00:00.000Z',
        amountNgn: 50_000,
        customerName: 'Acme',
        quotationRef: 'QT-1',
        paymentMethod: 'Transfer',
        bankReference: 'REF-1',
        note: 'Overpayment vs remaining balance on QT-1',
      },
    ];

    const rows = salesPaymentsReceivedRows(receipts, [], [], '2026-03-01', '2026-03-31', ledgerEntries);
    expect(rows).toHaveLength(1);
    expect(rows[0].amountPaidNgn).toBe(150_000);
    expect(rows[0].bankReference).toBe('REF-1');
    expect(salesPaymentsReceivedSummary(rows).totalReceivedNgn).toBe(150_000);
  });

  it('adds companion overpay when receipt row still holds allocation only', () => {
    const receipts = [
      {
        id: 'SR-2',
        ledgerEntryId: 'LE-REC2',
        customer: 'Beta',
        quotationRef: 'QT-2',
        dateISO: '2026-03-12',
        amountNgn: 80_000,
        method: 'Cash',
        status: 'Pending clearance',
      },
    ];
    const ledgerEntries = [
      {
        id: 'LE-REC2',
        type: 'RECEIPT',
        atISO: '2026-03-12T09:00:00.000Z',
        amountNgn: 80_000,
        customerName: 'Beta',
        quotationRef: 'QT-2',
        paymentMethod: 'Cash',
        bankReference: '',
      },
      {
        id: 'LE-OV2',
        type: 'OVERPAY_ADVANCE',
        atISO: '2026-03-12T09:00:00.000Z',
        amountNgn: 20_000,
        customerName: 'Beta',
        quotationRef: 'QT-2',
        paymentMethod: 'Cash',
        bankReference: '',
        note: 'Overpayment vs remaining balance on QT-2',
      },
    ];

    const rows = salesPaymentsReceivedRows(receipts, [], [], '2026-03-01', '2026-03-31', ledgerEntries);
    expect(rows).toHaveLength(1);
    expect(rows[0].amountPaidNgn).toBe(100_000);
  });

  it('skips reversed receipts', () => {
    const receipts = [
      {
        id: 'SR-REV',
        ledgerEntryId: 'LE-REV',
        customer: 'Gone',
        quotationRef: 'QT-3',
        dateISO: '2026-03-15',
        amountNgn: 40_000,
        status: 'Reversed',
      },
    ];
    const rows = salesPaymentsReceivedRows(receipts, [], [], '2026-03-01', '2026-03-31', []);
    expect(rows).toHaveLength(0);
  });

  it('filters by receipt date range', () => {
    const receipts = [
      {
        id: 'SR-IN',
        customer: 'In',
        quotationRef: 'QT-4',
        dateISO: '2026-03-20',
        amountNgn: 10_000,
      },
      {
        id: 'SR-OUT',
        customer: 'Out',
        quotationRef: 'QT-5',
        dateISO: '2026-04-01',
        amountNgn: 99_000,
      },
    ];
    const rows = salesPaymentsReceivedRows(receipts, [], [], '2026-03-01', '2026-03-31', []);
    expect(rows).toHaveLength(1);
    expect(rows[0].receiptId).toBe('SR-IN');
    expect(rows[0].group).toBe('Materials not produced in period');
  });

  it('keeps paid-but-unproduced cash as credit in the payment month', () => {
    const receipts = [
      {
        id: 'SR-JAN',
        customer: 'Deferred',
        quotationRef: 'QT-DEF',
        dateISO: '2026-01-20',
        amountNgn: 200_000,
      },
    ];
    const jan = salesPaymentsReceivedRows(receipts, [], [], '2026-01-01', '2026-01-31', []);
    expect(jan).toHaveLength(1);
    expect(jan[0].group).toBe('Materials not produced in period');
    expect(jan[0].amountPaidNgn).toBe(200_000);
  });

  it('recognizes prior-month credit as produced sales in the production month', () => {
    const receipts = [
      {
        id: 'SR-JAN',
        customer: 'Deferred',
        quotationRef: 'QT-DEF',
        dateISO: '2026-01-20',
        amountNgn: 200_000,
      },
    ];
    const jobs = [
      {
        quotationRef: 'QT-DEF',
        status: 'Completed',
        completedAtISO: '2026-02-05T14:00:00.000Z',
        actualMeters: 100,
      },
    ];
    const jan = salesPaymentsReceivedRows(receipts, jobs, [], '2026-01-01', '2026-01-31', []);
    expect(jan).toHaveLength(1);
    expect(jan[0].group).toBe('Materials not produced in period');

    const feb = salesPaymentsReceivedRows(receipts, jobs, [], '2026-02-01', '2026-02-28', []);
    expect(feb).toHaveLength(1);
    expect(feb[0].group).toBe('Materials produced in period');
    expect(feb[0].amountPaidNgn).toBe(200_000);
    expect(feb[0].firstProductionDateISO).toBe('2026-02-05');

    const mar = salesPaymentsReceivedRows(receipts, jobs, [], '2026-03-01', '2026-03-31', []);
    expect(mar).toHaveLength(0);
  });

  it('attributes same-month pay-and-produce to produced sales once', () => {
    const receipts = [
      {
        id: 'SR-SAME',
        customer: 'Same',
        quotationRef: 'QT-SAME',
        dateISO: '2026-03-10',
        amountNgn: 75_000,
      },
    ];
    const jobs = [
      {
        quotationRef: 'QT-SAME',
        status: 'Completed',
        completedAtISO: '2026-03-18T10:00:00.000Z',
        actualMeters: 50,
      },
    ];
    const rows = salesPaymentsReceivedRows(receipts, jobs, [], '2026-03-01', '2026-03-31', []);
    expect(rows).toHaveLength(1);
    expect(rows[0].group).toBe('Materials produced in period');
  });

  it('omits cash collected this period on quotes produced in a prior period', () => {
    const receipts = [
      {
        id: 'SR-LATE',
        customer: 'AR',
        quotationRef: 'QT-AR',
        dateISO: '2026-03-12',
        amountNgn: 60_000,
      },
    ];
    const jobs = [
      {
        quotationRef: 'QT-AR',
        status: 'Completed',
        completedAtISO: '2026-02-01T10:00:00.000Z',
        actualMeters: 40,
      },
    ];
    const rows = salesPaymentsReceivedRows(receipts, jobs, [], '2026-03-01', '2026-03-31', []);
    expect(rows).toHaveLength(0);
  });
});
