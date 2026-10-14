// @vitest-environment node
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSalesAccrual, refundReasonList } from './salesAccrualCore.js';

const kd = JSON.parse(
  fs.readFileSync(new URL('./__fixtures__/kd-2026-09/salesReportSource.json', import.meta.url), 'utf8')
);
const acc = buildSalesAccrual(kd);
const balanceOf = (id) => acc.balances.rows.find((r) => r.customerID === id);

describe('sales accrual — Kaduna Sep 2026 fixture (owner-approved figures)', () => {
  it('values goods produced in September at ₦177,996,973 (net of value-reducing refunds)', () => {
    expect(acc.producedNgn).toBe(177_996_973);
    expect(acc.producedRows.reduce((s, r) => s + r.valueInPeriodNgn, 0)).toBe(177_996_973);
  });

  it('states customer debts and advances at period start and end', () => {
    expect(acc.openingDate).toBe('2026-08-31');
    expect(acc.balances.opening).toEqual({ debtsNgn: 4_891_060, advancesNgn: 37_282_580 });
    expect(acc.balances.closing).toEqual({ debtsNgn: 8_565_982, advancesNgn: 41_079_869 });
  });

  it('ties the sales bridge to ₦0', () => {
    expect(acc.bridge).toMatchObject({
      cashReceivedNgn: 206_631_365,
      refundsPaidNgn: 28_512_025,
      adjustmentNgn: -122_367,
      producedNgn: 177_996_973,
      differenceNgn: 0,
    });
  });

  it('flags balances unchanged in September without hiding them', () => {
    expect(acc.balances.staleAdvancesNgn).toBe(8_427_027);
    expect(acc.balances.staleDebtsNgn).toBe(4_767_620);
    expect(acc.exceptions.staleBalances.length).toBe(acc.balances.rows.filter((r) => r.unchanged).length);
  });

  it('Yusuf: reversed receipts are no cash; RF-9679 paid ₦32,400 fully value-reducing → debt ₦2,083,200', () => {
    expect(balanceOf('CUS-KD-26-1069')).toMatchObject({
      cashNgn: 0,
      refundsPaidNgn: 73_200,
      producedNgn: 2_010_000,
      closingNgn: -2_083_200,
    });
  });

  it('Mal Sani: advance reversal reduces cash and the re-posted advance (TM-KD-26-1499) is not cash', () => {
    expect(balanceOf('CUS-KD-26-0602')?.closingNgn ?? 0).toBe(0);
    expect(acc.exceptions.doubleCountedAdvances).toEqual([
      expect.objectContaining({
        customerID: 'CUS-KD-26-0602',
        treasuryMovementId: 'TM-KD-26-1499',
        ledgerEntryId: 'LE-KD-26-1154',
        amountNgn: 1_500_000,
        dateISO: '2026-07-16',
        advanceMovementId: 'TM-KD-26-1147',
        verification: expect.stringMatching(/^Unverified/),
      }),
    ]);
  });

  it('leaves the ₦1,907,500 treasury line with no customer out of balances and lists it', () => {
    expect(acc.exceptions.unassignedCash).toEqual([
      expect.objectContaining({ treasuryMovementId: 'TM-KD-26-0271', ledgerEntryId: 'LE-KD-26-0284', amountNgn: 1_907_500 }),
    ]);
  });

  it('applies the zero-metre rule: QT-1643 and QT-1558 excluded; accessory-only, stone flat sheet and effective-metre jobs count', () => {
    expect(acc.exceptions.zeroMetreJobs.map((j) => `${j.jobID} ${j.quotationRef}`).sort()).toEqual([
      'PRO-KD-26-1272 QT-KD-26-1558',
      'PRO-KD-26-1349 QT-KD-26-1643',
    ]);
    const produced = new Set(acc.producedRows.map((r) => r.quotationRef));
    expect(produced.has('QT-KD-26-1643')).toBe(false);
    expect(produced.has('QT-KD-26-1457')).toBe(true); // PRO-KD-26-1196, 0 actual m, 100 effective m
    expect(produced.has('QT-KD-26-1614')).toBe(true); // stone flat sheets, sold by the piece
    expect(produced.has('QT-KD-26-1652')).toBe(true); // accessory-only
  });

  it('lists refunds bigger than the quotation value (QT-1593 Tijjani Zakari, QT-1596 Anas Cap Zaria)', () => {
    expect(acc.exceptions.refundsOverValue.map((r) => r.quotationRef).sort()).toEqual(['QT-KD-26-1593', 'QT-KD-26-1596']);
    expect(acc.exceptions.refundsOverValue.find((r) => r.quotationRef === 'QT-KD-26-1593')).toMatchObject({
      quoteTotalNgn: 2_002_190,
      valueReducingRefundsNgn: 2_155_505,
    });
  });
});

describe('sales accrual rules (synthetic)', () => {
  const base = {
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    quotations: [{ id: 'Q1', customerID: 'C1', customer: 'One', totalNgn: 1_000_000 }],
    quotationLines: [{ quotationId: 'Q1', category: 'products', name: 'Roofing Sheet', qty: 100 }],
    ledgerEntries: [{ id: 'LE1', customerID: 'C1', quotationRef: 'Q1', type: 'RECEIPT', amountNgn: 1_100_000, atISO: '2026-08-10' }],
    treasuryMovements: [
      { id: 'T1', type: 'RECEIPT_IN', sourceKind: 'LEDGER_RECEIPT', sourceId: 'LE1', amountNgn: 1_100_000, postedAtISO: '2026-08-10', treasuryAccountId: 1 },
    ],
    refunds: [],
    bankRecon: [],
  };

  it('pro-rates a quotation split across periods by actual metres', () => {
    const a = buildSalesAccrual({
      ...base,
      productionJobs: [
        { jobID: 'J1', quotationRef: 'Q1', status: 'Completed', actualMeters: 60, completedAtISO: '2026-08-20' },
        { jobID: 'J2', quotationRef: 'Q1', status: 'Completed', actualMeters: 40, completedAtISO: '2026-09-05' },
      ],
    });
    expect(a.producedNgn).toBe(400_000);
    expect(a.producedRows[0]).toMatchObject({ quotationRef: 'Q1', valueInPeriodNgn: 400_000, proRated: true });
    expect(balanceOfRows(a, 'C1')).toMatchObject({ openingNgn: 500_000, producedNgn: 400_000, closingNgn: 100_000 });
    expect(a.bridge.differenceNgn).toBe(0);
  });

  it('counts only the part of a mixed refund above the overpayment, at the amount paid out', () => {
    const a = buildSalesAccrual({
      ...base,
      productionJobs: [{ jobID: 'J1', quotationRef: 'Q1', status: 'Completed', actualMeters: 100, completedAtISO: '2026-09-05' }],
      refunds: [
        {
          refundID: 'R1', customerID: 'C1', quotationRef: 'Q1', status: 'Paid', requestedAtISO: '2026-09-10',
          reasonCategory: '["Overpayment","Unproduced meterage"]', approvedAmountNgn: 200_000, paidAmountNgn: 160_000,
        },
      ],
    });
    // Overpayment 100,000 (1,100,000 stayed − 1,000,000); paid 160,000 → 60,000 reduces value.
    expect(a.producedRows[0].valueReducingRefundsNgn).toBe(60_000);
    expect(a.producedNgn).toBe(940_000);
  });

  it('confirms a re-posted advance when bank recon covers the date and shows no inflow', () => {
    const a = buildSalesAccrual({
      ...base,
      productionJobs: [],
      ledgerEntries: [
        { id: 'LA', customerID: 'C1', type: 'ADVANCE_IN', amountNgn: 500_000, atISO: '2026-09-02' },
        { id: 'LR', customerID: 'C1', quotationRef: 'Q1', type: 'RECEIPT', amountNgn: 500_000, atISO: '2026-09-09' },
      ],
      treasuryMovements: [
        { id: 'TA', type: 'ADVANCE_IN', sourceKind: 'LEDGER_ADVANCE', sourceId: 'LA', amountNgn: 500_000, postedAtISO: '2026-09-02', treasuryAccountId: 1 },
        { id: 'TR', type: 'RECEIPT_IN', sourceKind: 'LEDGER_RECEIPT', sourceId: 'LR', amountNgn: 500_000, postedAtISO: '2026-09-09', treasuryAccountId: 1 },
      ],
      bankRecon: [
        { bankDateISO: '2026-09-01', amountNgn: 1, treasuryAccountId: 1 },
        { bankDateISO: '2026-09-02', amountNgn: 500_000, treasuryAccountId: 1 },
        { bankDateISO: '2026-09-30', amountNgn: 1, treasuryAccountId: 1 },
      ],
    });
    expect(a.exceptions.doubleCountedAdvances).toEqual([
      expect.objectContaining({ treasuryMovementId: 'TR', verification: expect.stringMatching(/^Confirmed/) }),
    ]);
    expect(balanceOfRows(a, 'C1').closingNgn).toBe(500_000);
    expect(a.bridge).toMatchObject({ cashNotAttributableNgn: 500_000, differenceNgn: 0 });
  });

  it('reads refund reasons from arrays, JSON text or plain text', () => {
    expect(refundReasonList({ reasonCategory: ['Overpayment'] })).toEqual(['Overpayment']);
    expect(refundReasonList({ reasonCategory: '["Overpayment","Transport issue"]' })).toEqual(['Overpayment', 'Transport issue']);
    expect(refundReasonList({ reasonCategory: 'Overpayment, Additional services' })).toEqual(['Overpayment', 'Additional services']);
  });
});

function balanceOfRows(a, id) {
  return a.balances.rows.find((r) => r.customerID === id);
}
