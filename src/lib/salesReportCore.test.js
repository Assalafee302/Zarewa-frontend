// @vitest-environment node
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  bankNarrationByTreasuryMovementId,
  buildSalesReport,
  receiptMethodVersusTreasuryNote,
  receiptPaymentLines,
  SALES_EXCEPTION_AMOUNT_DIFFERS,
  SALES_RECON_ADVANCES,
  SALES_RECON_AMOUNT_DIFFERS,
  SALES_RECON_NO_TREASURY_IN_PERIOD,
  SALES_RECON_RECEIVED_BEFORE_PERIOD,
  SALES_RECON_TREASURY_NOT_IN_SALES,
} from './salesReportCore.js';

const kd = JSON.parse(
  fs.readFileSync(new URL('./__fixtures__/kd-2026-09/salesReportSource.json', import.meta.url), 'utf8')
);
const sep = buildSalesReport(kd);
const line = (key) => sep.reconciliation.lines.find((l) => l.key === key);
const byLe = (items) => Object.fromEntries(items.map((i) => [i.ledgerEntryId, i.amountNgn]));

describe('sales report v2 — Kaduna Sep 2026 fixture', () => {
  it('cash received from treasury by posting date = ₦206,631,365, split by account', () => {
    expect(sep.cashReceived.totalNgn).toBe(206_631_365);
    expect(sep.cashReceived.advancesInNgn).toBe(27_440);
    const byLabel = Object.fromEntries(sep.cashReceived.byAccount.map((a) => [a.displayName, a.amountNgn]));
    expect(byLabel).toEqual({ 'Taj Bank': 130_031_071, Moniepoint: 76_442_414, 'Cash Office': 157_880 });
  });

  it('recognised sales = report rows ₦211,760,175 less Yusuf’s reversed receipts = ₦209,638,175', () => {
    expect(sep.recognised.reportRowsTotalNgn).toBe(211_760_175);
    expect(sep.recognised.totalNgn).toBe(209_638_175);
    expect(sep.recognised.excludedReversedNgn).toBe(2_122_000);
    expect(sep.recognised.excludedReversedRows.map((r) => r.ledgerEntryId).sort()).toEqual([
      'LE-KD-26-1767',
      'LE-KD-26-1778',
    ]);
    expect(sep.recognised.notProducedNgn).toBe(236_720);
  });

  it('keeps the suspended receipt that reached the bank (Alhaji Mrido ₦20,000), marked suspended', () => {
    const row = sep.recognisedRows.find((r) => r.ledgerEntryId === 'LE-KD-26-1597');
    expect(row).toMatchObject({ amountPaidNgn: 20_000, suspended: true });
    expect(sep.recognised.suspendedKeptNgn).toBe(20_000);
  });

  it('reconciles recognised sales to cash received with nothing unexplained', () => {
    expect(line(SALES_RECON_RECEIVED_BEFORE_PERIOD).amountNgn).toBe(-8_349_610);
    expect(line(SALES_RECON_RECEIVED_BEFORE_PERIOD).items).toHaveLength(5);
    expect(byLe(line(SALES_RECON_RECEIVED_BEFORE_PERIOD).items)['LE-KD-26-1560']).toBe(-7_458_660);
    expect(byLe(line(SALES_RECON_NO_TREASURY_IN_PERIOD).items)).toEqual({
      'LE-KD-26-1611': -1_238_900,
      'LE-KD-26-1665': -1_367_000,
    });
    expect(byLe(line(SALES_RECON_AMOUNT_DIFFERS).items)).toEqual({ 'LE-KD-26-1840': -200_000 });
    expect(byLe(line(SALES_RECON_TREASURY_NOT_IN_SALES).items)).toEqual({
      'LE-KD-26-1962': 5_609_795,
      'LE-KD-26-1766': 2_155_505,
      'LE-KD-26-1176': 200_000,
      'LE-KD-26-1769': 139_240,
      'LE-KD-26-1706': 7_520,
      'LE-KD-26-1502': 5_050,
      'LE-KD-26-1402': 4_150,
    });
    expect(line(SALES_RECON_TREASURY_NOT_IN_SALES).amountNgn).toBe(8_121_260);
    expect(line(SALES_RECON_ADVANCES).amountNgn).toBe(27_440);
    expect(sep.reconciliation.endNgn).toBe(206_631_365);
    expect(sep.reconciliation.unexplainedNgn).toBe(0);
  });

  it('lists receipts without a matching treasury movement as exceptions', () => {
    const kinds = Object.fromEntries(sep.exceptions.map((e) => [e.ledgerEntryId, e.kind]));
    expect(Object.keys(kinds)).toEqual(expect.arrayContaining(['LE-KD-26-1611', 'LE-KD-26-1665', 'LE-KD-26-1840']));
    expect(kinds['LE-KD-26-1840']).toBe(SALES_EXCEPTION_AMOUNT_DIFFERS);
  });

  it('shows the treasury account actually posted to in the Bank column', () => {
    const yahuza = sep.recognisedRows.find((r) => r.ledgerEntryId === 'LE-KD-26-1560');
    expect(yahuza.bankLabel).toBeTruthy();
    expect(sep.recognisedRows.every((r) => typeof r.bankNote === 'string')).toBe(true);
  });

  it('gives the same September figures when treasury is loaded only from the period start (live loader)', () => {
    const live = buildSalesReport({
      ...kd,
      treasuryMovements: kd.treasuryMovements.filter((t) => String(t.postedAtISO).slice(0, 10) >= kd.startDate),
    });
    expect(live.cashReceived.totalNgn).toBe(206_631_365);
    expect(live.recognised.totalNgn).toBe(209_638_175);
    expect(live.reconciliation.unexplainedNgn).toBe(0);
    expect(live.accrualHasFullHistory).toBe(false);
  });

  it('feeds the Accrual section from accrualTreasuryMovements (period-source shape)', () => {
    const live = buildSalesReport({
      ...kd,
      treasuryMovements: kd.treasuryMovements.filter((t) => String(t.postedAtISO).slice(0, 10) >= kd.startDate),
      accrualTreasuryMovements: kd.treasuryMovements,
    });
    expect(live.accrualHasFullHistory).toBe(true);
    expect(live.accrual.producedNgn).toBe(177_996_973);
    expect(live.accrual.bridge.differenceNgn).toBe(0);
  });
});

describe('receipt method vs treasury account', () => {
  it('flags a named account that differs from the posting', () => {
    expect(receiptMethodVersusTreasuryNote('Cash — Cash Office', ['Zarewa Aluminum & Plastics Ltd'])).toMatch(/Cash Office/);
    expect(receiptMethodVersusTreasuryNote('Bank — Zaps Aluminum Enterprises', ['Zaps Aluminum Enterprises'])).toBe('');
    expect(receiptMethodVersusTreasuryNote('Split (2 lines)', ['Cash Office'])).toBe('');
    expect(receiptMethodVersusTreasuryNote('Refund fund', ['Zaps Aluminum Enterprises'])).toMatch(/refund fund/);
    expect(receiptMethodVersusTreasuryNote('Bank — X', [])).toBe('');
  });
});

describe('sales report v2 print layout', () => {
  it('labels both figures and prints the reconciliation and exceptions', async () => {
    const { salesReportPrintPayload, salesReportExcelSheets } = await import('./salesReportPrint.js');
    const p = salesReportPrintPayload(sep, { title: 'Sales', refundedInPeriodNgn: 0, companyCutInPeriodNgn: 0 });
    const labels = p.summaryLines.map((l) => l.label);
    expect(labels).toContain('(1) Cash received in period (treasury, by posting date)');
    expect(labels).toContain('(2) Recognised sales (produced in period)');
    const recon = p.appendixSections[0].rows;
    expect(recon.at(-1)).toMatchObject({ item: 'Unexplained difference' });
    expect(recon.at(-1).amountNgn).toMatch(/0/);
    expect(p.appendixSections[1].rows.length).toBe(sep.exceptions.length);
    expect(salesReportExcelSheets(sep).map((s) => s.name)).toEqual([
      'Sales_report',
      'Cash_by_account',
      'Reconciliation',
      'Exceptions',
      'Accrual_produced',
      'Customer_balances',
      'Sales_bridge',
      'Accrual_exceptions',
    ]);
    expect(labels).toContain('(3) Accrual: goods produced in period (net value)');
    const bridge = p.appendixSections.find((x) => x.title.startsWith('Accrual: sales bridge')).rows;
    expect(bridge.at(-1)).toMatchObject({ item: 'Difference' });
    expect(bridge.at(-1).amountNgn).toMatch(/0/);
    const accrualKinds = p.appendixSections.find((x) => x.title === 'Accrual: exceptions').rows.map((r) => r.kind);
    expect(accrualKinds).toEqual(
      expect.arrayContaining([
        'Completed job with 0 m — not a sale',
        'Refunds bigger than the quotation value',
        'Double-counted advance application',
        'Treasury receipt with no customer',
        'Balance unchanged in the period',
      ])
    );
  });
});

describe('sales report — one row per payment line (Kaduna Sep 2026)', () => {
  const lines = (le) => sep.recognisedRows.find((r) => r.ledgerEntryId === le).paymentLines;
  const tmLines = (r) => r.paymentLines.filter((l) => l.treasuryMovementId);

  it('keeps every total: lines add up to recognised sales, cash and reconciliation unchanged', () => {
    const lineTotal = sep.recognisedRows.reduce((s, r) => s + r.paymentLines.reduce((a, l) => a + l.amountNgn, 0), 0);
    expect(lineTotal).toBe(209_638_175);
    for (const r of sep.recognisedRows) {
      expect(r.paymentLines.reduce((a, l) => a + l.amountNgn, 0)).toBe(r.amountPaidNgn);
    }
    expect(sep.cashReceived.totalNgn).toBe(206_631_365);
    expect(sep.reconciliation.unexplainedNgn).toBe(0);
  });

  it('finds 23 receipts split across >1 September treasury line, 5 across >1 account', () => {
    const split = sep.recognisedRows.filter((r) => tmLines(r).filter((l) => l.inPeriod).length > 1);
    expect(split).toHaveLength(23);
    const multiAccount = split.filter((r) => new Set(tmLines(r).filter((l) => l.inPeriod).map((l) => l.accountName)).size > 1);
    expect(multiAccount).toHaveLength(5);
  });

  it('gives each line its own treasury id, account, date, amount and payer', () => {
    expect(lines('LE-KD-26-1727').map((l) => [l.treasuryMovementId, l.accountName, l.postedDateISO, l.amountNgn])).toEqual([
      ['TM-KD-26-2560', 'Zarewa Aluminum & Plastics Ltd', '2026-09-12', 500_000],
      ['TM-KD-26-2561', 'Zarewa Aluminum & Plastics Ltd', '2026-09-12', 500_000],
      ['TM-KD-26-2562', 'Zarewa Aluminum & Plastics Ltd', '2026-09-12', 500_000],
      ['TM-KD-26-2563', 'Zaps Aluminum Enterprises', '2026-09-12', 291_880],
    ]);
    const malik = lines('LE-KD-26-1785');
    expect(malik[0]).toMatchObject({ paidBySource: 'bank narration' });
    expect(malik[0].paidBy).toMatch(/ADAM ABDULMALIK/);
    expect(malik[1]).toMatchObject({ treasuryMovementId: 'TM-KD-26-2660', isCash: true, paidBy: '', paidBySource: 'not matched' });
  });

  it('prints a subtotal per split receipt that does not add into the totals', async () => {
    const { salesReportPrintPayload, salesPaymentLineRows, SALES_LINE_SUBTOTAL } = await import('./salesReportPrint.js');
    const flat = salesPaymentLineRows(sep);
    const sub = flat.find((r) => r.lineType === SALES_LINE_SUBTOTAL && r.receiptNo === 'LE-KD-26-1727');
    expect(sub).toMatchObject({ amountNgn: 1_791_880, bank: 'MONIEPOINT + TB' });
    const p = salesReportPrintPayload(sep, { title: 'Sales', refundedInPeriodNgn: 0, companyCutInPeriodNgn: 0 });
    expect(p.columns.map((c) => c.key)).toEqual(expect.arrayContaining(['customerName', 'paidBy', 'treasuryMovementId', 'postedDateISO']));
    const cashTotal = p.rows.reduce((s, r) => s + r._amountPaidNgn, 0);
    expect(cashTotal).toBe(209_638_175);
    const cashRow = p.rows.find((r) => r.treasuryMovementId && r.bank === 'Cash' && r.paidBy.startsWith('not matched'));
    expect(cashRow.paidBy).toBe('not matched (cash)');
  });
});

describe('payment lines (synthetic)', () => {
  const t = (id, accountName, amountNgn, accountType = 'Bank') => ({
    id, type: 'RECEIPT_IN', postedAtISO: '2026-09-05', accountName, accountType, bankName: accountType === 'Cash' ? '' : 'Taj Bank', amountNgn,
  });
  const narration = bankNarrationByTreasuryMovementId([
    { description: 'NIP FRM ALI CAP JOS', systemMatch: 'TM-KD-26-0001+TM-KD-26-0002 · less ₦100 POS fee' },
  ]);

  it('reads the bank narration for every movement named in a bank-recon match', () => {
    expect(narration.get('TM-KD-26-0001')).toBe('NIP FRM ALI CAP JOS');
    expect(narration.get('TM-KD-26-0002')).toBe('NIP FRM ALI CAP JOS');
  });

  it('prefers the payer typed on the receipt, then the bank narration, then "not matched"', () => {
    const base = { receiptAmountNgn: 300, treasuryLines: [t('TM-KD-26-0001', 'Zaps', 200), t('TM-KD-26-0009', 'Cash Office', 100, 'Cash')], method: 'Split (2 lines)', narrationByMovementId: narration, inPeriod: () => true };
    const fromBank = receiptPaymentLines(base);
    expect(fromBank.map((l) => [l.paidBy, l.paidBySource])).toEqual([['NIP FRM ALI CAP JOS', 'bank narration'], ['', 'not matched']]);
    const fromReceipt = receiptPaymentLines({ ...base, receiptPayer: 'Musa Ali' });
    expect(fromReceipt.every((l) => l.paidBy === 'Musa Ali' && l.paidBySource === 'receipt')).toBe(true);
  });

  it('checks each line’s own account against the method text', () => {
    const out = receiptPaymentLines({ receiptAmountNgn: 300, treasuryLines: [t('A', 'Zaps', 200), t('B', 'Cash Office', 100, 'Cash')], method: 'Bank — Zaps', inPeriod: () => true });
    expect(out.map((l) => l.check)).toEqual(['', 'Method says Zaps; posted to Cash Office']);
  });

  it('adds a difference line so the receipt subtotal stays the receipt amount', () => {
    const out = receiptPaymentLines({ receiptAmountNgn: 1_645_000, treasuryLines: [t('A', 'Zaps', 1_445_000)], method: '', inPeriod: () => true });
    expect(out.at(-1)).toMatchObject({ type: 'NO_TREASURY', amountNgn: 200_000, check: 'Receipt amount not found in treasury' });
  });
});
