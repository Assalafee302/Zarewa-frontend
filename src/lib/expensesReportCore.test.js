// @vitest-environment node
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildExpensesReport, BOOK_FIXED_ASSET, BOOK_LOAN_REPAYMENTS, BOOK_REFUNDS, BOOK_STAFF_LOANS } from './expensesReportCore.js';
import { expensesReportExcelSheets, expensesReportPrintPayload } from './expensesReportPrint.js';

const kd = JSON.parse(
  fs.readFileSync(new URL('./__fixtures__/kd-2026-09/expensesReportSource.json', import.meta.url), 'utf8')
);
// HR payroll is not in the ERP export; the owner's split is supplied as the report input.
const payrollSplit = [
  { label: 'Factory', grossNgn: 528_000 },
  { label: 'Branch', grossNgn: 524_000 },
  { label: 'HQ share', grossNgn: 796_700 },
];
const sep = buildExpensesReport({ ...kd, payrollSplit });
const erp = Object.fromEntries(sep.erpByCategory.map((c) => [c.category, c.amountNgn]));
const book = Object.fromEntries(sep.bookByCategory.map((c) => [c.category, c.amountNgn]));
const reclass = (id) => sep.reclassifications.find((r) => r.rule === id);
const ids = (lines) => lines.map((l) => l.expenseID.slice(-4)).sort();

describe('expenses report v2 — Kaduna Sep 2026 fixture', () => {
  it('ERP view: 116 lines, ₦14,853,736, by ERP category', () => {
    expect(sep.totals).toEqual({ lineCount: 116, amountNgn: 14_853_736, erpIncludingBalancingNgn: 14_853_736 });
    expect(erp).toMatchObject({
      Maintenance: 3_640_350,
      'Admin salary': 1_868_700,
      'Office expenses': 1_734_270,
      'Carriage inward': 1_550_410,
      'IT & software': 1_500_000,
      'Chairman withdrawal': 1_256_000,
      'Fuel & lubricant': 915_477,
      Accessories: 544_360,
      'Outside corrugation': 418_000,
      Tax: 300_000,
      'Professional fees': 290_000,
      Purchases: 237_890,
      'Staff loan': 220_000,
      Security: 135_000,
      'Truck & mining': 89_410,
      Others: 55_000,
      'Admin expenses': 33_050,
      Welfare: 30_000,
      'Bank charges': 28_319,
      Wages: 7_500,
    });
  });

  it('shows the payment request’s real status, not "pending payout" on every row', () => {
    const statuses = new Set(sep.rows.map((r) => r.status));
    expect(statuses).toEqual(new Set(['Paid', 'Part-paid', 'Cancelled', 'No payment request']));
    expect(sep.rows.find((r) => r.expenseID === 'EXP-KD-26-0398').status).toBe('Cancelled');
  });

  it('book view reproduces the accounts book', () => {
    expect(book).toMatchObject({
      'Fuel & lubricant': 915_477,
      Maintenance: 919_400,
      'Office expenses': 883_550,
      'Admin expenses': 33_050,
      'Bank charges': 28_319,
      'Professional fees': 290_000,
      Tax: 300_000,
      'IT & software': 1_500_000,
      Security: 135_000,
      Welfare: 0,
      Others: 55_000,
      'Chairman withdrawal': 1_256_000,
      'Truck & mining': 89_410,
      Accessories: 1_027_250,
      'Carriage inward': 2_170_410,
    });
  });

  it('lists every line each rule moved', () => {
    expect(reclass('R1')).toMatchObject({ to: BOOK_REFUNDS, amountNgn: 756_720 });
    expect(ids(reclass('R1').lines)).toEqual(['0324', '0337', '0350', '0352', '0401']);
    expect(reclass('R2')).toMatchObject({ to: BOOK_STAFF_LOANS, amountNgn: 140_000 });
    expect(ids(reclass('R2').lines)).toEqual(['0298', '0315', '0325', '0333', '0342', '0343']);
    expect(reclass('R3')).toMatchObject({ to: BOOK_FIXED_ASSET, amountNgn: 2_877_950 });
    expect(ids(reclass('R3').lines)).toEqual(['0362', '0397']);
    expect(reclass('R4')).toMatchObject({ to: 'Accessories', amountNgn: 482_890 });
    expect(reclass('R5')).toMatchObject({ to: 'Maintenance', amountNgn: 257_000 });
    expect(reclass('R6')).toMatchObject({ to: 'Admin expenses', amountNgn: 20_000 });
    expect(ids(reclass('R6').lines)).toEqual(['0367']);
  });

  it('leaves the cancelled request (EXP-0398) out of the book view and lists it; book Admin expenses stays ₦33,050', () => {
    expect(sep.rows.find((r) => r.expenseID === 'EXP-KD-26-0398')).toMatchObject({ status: 'Cancelled', bookCategory: null });
    expect(book['Admin expenses']).toBe(33_050);
    expect(sep.exceptions.filter((e) => /^Cancelled/.test(e.kind)).map((e) => e.expenseID)).toEqual(['EXP-KD-26-0398']);
    expect(sep.bookByCategory.reduce((s, c) => s + c.amountNgn, 0)).toBe(14_853_736 - 20_000 + 910_000 - 290_000);
  });

  it('flags the "Check category" lines the accountant reclassified', () => {
    const warned = new Set(sep.rows.filter((r) => r.reclassRule).map((r) => r.expenseID.slice(-4)));
    for (const id of ['0401', '0352', '0350', '0324', '0337', '0325', '0315', '0342', '0333', '0343', '0298', '0362', '0397']) {
      expect(warned.has(id)).toBe(true);
    }
    expect(sep.warningCount).toBe(warned.size);
  });

  it('carriage: adds PO transport ₦910,000 and takes off the ₦290,000 that duplicates PO-0085 transport', () => {
    expect(sep.carriage.poTransportNgn).toBe(910_000);
    expect(sep.carriage.overlapNgn).toBe(290_000);
    expect(sep.carriage.overlap.map((o) => [o.expenseID, o.poID])).toEqual([
      ['EXP-KD-26-0402', 'PO-KD-26-0085'],
      ['EXP-KD-26-0403', 'PO-KD-26-0085'],
    ]);
  });

  it('payroll: Admin salary ₦1,868,700 = payroll gross ₦1,848,700 (split shown) + ₦20,000 imprest moved by R6', () => {
    expect(sep.payroll).toMatchObject({ adminSalaryNgn: 1_868_700, payrollGrossNgn: 1_848_700, splitDifferenceNgn: 0 });
    expect(sep.payroll.movedOutByRule).toEqual([expect.objectContaining({ expenseID: 'EXP-KD-26-0367', amountNgn: 20_000 })]);
    expect(sep.payroll.notExplainedByPayroll).toEqual([]);
  });

  it('bridges expenses by date to payment requests paid in September (₦14,957,877, 105) with nothing unexplained', () => {
    expect(sep.paymentRequestsPaid).toMatchObject({ count: 105, amountNgn: 14_957_877, unexplainedNgn: 0 });
  });

  it('prints ERP vs book, reclassifications and exceptions; Excel sums to the ERP total', () => {
    const p = expensesReportPrintPayload(sep, { title: 'Expenses' });
    expect(p.columns.map((c) => c.key)).toContain('check');
    expect(p.appendixSections.map((s) => s.title)).toEqual(
      expect.arrayContaining(['Reclassifications (rule-based — every line moved)', 'Expense exceptions'])
    );
    const sheet = expensesReportExcelSheets(sep).find((s) => s.name === 'Expenses').rows;
    expect(sheet.reduce((s, r) => s + r.amountNgn, 0)).toBe(14_853_736);
  });
});

describe('expense reclassification rules (synthetic)', () => {
  const line = (expenseID, category, description, amountNgn = 1000, staff = '') => ({
    expenseID,
    date: '2026-09-10',
    category,
    amountNgn,
    expenseType: description,
    reference: `PREQ-${expenseID}`,
    staff,
  });
  const run = (lines) =>
    buildExpensesReport({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      expenses: lines,
      paymentRequests: lines.map((l) => ({ requestID: l.reference, expenseID: l.expenseID, approvalStatus: 'Approved', description: l.expenseType, paidAmountNgn: l.amountNgn, paidAtISO: '2026-09-10', staffDisplayName: l.staff })),
    });

  it('does not treat "Diesel for gen" as a capital item, or a Staff loan IOU as a reclassification', () => {
    const r = run([line('E1', 'Fuel & lubricant', 'Diesel for gen'), line('E2', 'Staff loan', 'Gm Iou')]);
    expect(r.rows.every((x) => !x.reclassRule)).toBe(true);
  });

  it('treats a staff payee with "loan" / "advance" as a staff loan', () => {
    const r = run([line('E1', 'Office expenses', 'salary advance', 5000, 'Musa Staff')]);
    expect(r.rows[0]).toMatchObject({ reclassRule: 'R2', bookCategory: BOOK_STAFF_LOANS });
  });

  it('a BOI loan repayment is money out, not an expense: own book group, left out of the book expense total', () => {
    const r = run([line('E1', 'Loan repayment — BOI', 'BOI loan repayment', 3_386_836), line('E2', 'Bank charges', 'Bank charges — Taj', 104)]);
    expect(r.rows.find((x) => x.expenseID === 'E1')).toMatchObject({ bookCategory: BOOK_LOAN_REPAYMENTS });
    expect(r.totals.amountNgn).toBe(3_386_940);
    expect(r.bookExpenseTotalNgn).toBe(104);
  });

  it('first matching rule wins: a refund mentioning a forklift is a refund', () => {
    const r = run([line('E1', 'Office expenses', 'refund for fork lift hire')]);
    expect(r.rows[0].reclassRule).toBe('R1');
  });
});

describe('expenses report — round 2 (A2 balancing entry, A4 payment, R1 refunds)', () => {
  const sales = JSON.parse(
    fs.readFileSync(new URL('./__fixtures__/kd-2026-09/salesReportSource.json', import.meta.url), 'utf8')
  );
  const aug = buildExpensesReport({ ...kd, startDate: '2026-08-01', endDate: '2026-08-31' });

  it('A2: PREQ-KD-26-0330 "Account balnceing" is outside every category total, in its own box', () => {
    expect(aug.balancingEntries.rows.map((r) => [r.expenseID, r.requestID, r.amountNgn])).toEqual([
      ['EXP-KD-26-0404', 'PREQ-KD-26-0330', 32_811_891],
    ]);
    expect(aug.rows.some((r) => r.expenseID === 'EXP-KD-26-0404')).toBe(false);
    expect(aug.erpByCategory.reduce((s, c) => s + c.amountNgn, 0)).toBe(aug.totals.amountNgn);
    expect(aug.totals.erpIncludingBalancingNgn - aug.totals.amountNgn).toBe(32_811_891);
    expect(aug.paymentRequestsPaid.unexplainedNgn).toBe(0);
    const p = expensesReportPrintPayload(aug, { title: 'Expenses' });
    const box = p.appendixSections[0];
    expect(box.title).toBe('Balancing entry — not an expense');
    expect(box.rows[0]).toMatchObject({ ref: 'EXP-KD-26-0404', detail: 'PREQ-KD-26-0330' });
    expect(p.rows.some((r) => r.ref === 'EXP-KD-26-0404')).toBe(false);
  });

  it('A4: each line shows the treasury line that paid it, the account, paid date and BKR id', () => {
    const r = buildExpensesReport({
      ...kd,
      treasuryMovements: [...kd.treasuryMovements, ...sales.treasuryMovements.filter((t) => t.type !== 'TRANSPORT_PAYMENT')],
      bankRecon: sales.bankRecon,
    });
    const row = r.rows.find((x) => x.expenseID === 'EXP-KD-26-0290');
    expect(row).toMatchObject({
      requestID: 'PREQ-KD-26-0219',
      dateISO: '2026-09-01',
      paidDateISO: '2026-09-04',
      paidFrom: 'Zarewa Aluminum & Plastics Ltd (Moniepoint)',
      treasuryMovementIds: ['TM-KD-26-2427'],
      bankLineIds: ['BKR-KD-26-0230'],
    });
    expect(r.rows.filter((x) => x.treasuryMovementIds.length)).toHaveLength(113);
    expect(r.totals.amountNgn).toBe(14_853_736);
    const p = expensesReportPrintPayload(r, { title: 'Expenses' });
    expect(p.columns.map((c) => c.label)).toEqual(expect.arrayContaining(['Incurred', 'Paid', 'Paid from', 'Paid by', 'Treasury line', 'Bank line']));
    expect(p.rows.find((x) => x.ref === 'EXP-KD-26-0290')).toMatchObject({ treasury: 'TM-KD-26-2427', bankLine: 'BKR-KD-26-0230' });
  });

  it('R1: refunds are one line pointing to the Refund report, never listed', () => {
    const refundRows = [{ _amountNgn: 1_000 }, { _amountNgn: 2_500 }];
    const p = expensesReportPrintPayload(sep, { title: 'Expenses', refundRows });
    expect(p.rows.some((r) => /refund/i.test(String(r.groupKey)) && !/^Expense/.test(String(r.groupKey)))).toBe(false);
    expect(p.summaryLines.find((l) => l.label === 'Refunds paid in period — see Refund report').value).toMatch(/3,500/);
    const sheets = expensesReportExcelSheets(sep, { refundRows });
    expect(sheets.map((s) => s.name)).not.toContain('Refunds_paid');
    expect(sheets[0].rows.find((x) => /Refund report/.test(x.item)).amountNgn).toBe(3_500);
  });
});
