// @vitest-environment node
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildReceiptsRegister,
  EXC_UNCONFIRMED,
  payerFromBankReference,
  payerFromNarration,
  receiptsVersusAccrualBridge,
  REVIEW_CONFIRMED_LATE,
  shortBankName,
} from '../shared/lib/receiptsRegisterCore.js';
import { REGISTER_COLUMNS, receiptsRegisterDocument, receiptsRegisterExcelSheets } from '../shared/lib/receiptsRegisterPrint.js';
import { renderReportDocument } from '../shared/lib/reportPrintDocument.js';
import { buildSalesAccrual } from './salesAccrualCore.js';

const kd = JSON.parse(
  fs.readFileSync(new URL('./__fixtures__/kd-2026-09/salesReportSource.json', import.meta.url), 'utf8')
);
// Fixture generated 2026-10-13 14:27 UTC.
const reg = buildReceiptsRegister({ ...kd, asAtISO: '2026-10-13T14:27:00Z' });
const accrual = buildSalesAccrual(kd);
const section = (n) => reg.sections[n - 1];

describe('receipts register helpers', () => {
  it('short bank names from the treasury account, never the account title', () => {
    expect(shortBankName({ accountType: 'Bank', bankName: 'Taj Bank', accountName: 'Zaps Aluminum Enterprises' })).toBe('Taj');
    expect(shortBankName({ accountType: 'Bank', bankName: 'Moniepoint', accountName: 'Zarewa Aluminum & Plastics Ltd' })).toBe('Moniepoint');
    expect(shortBankName({ accountType: 'Bank', bankName: 'Gt Bank', accountName: 'Gt Zarewa Aluminium' })).toBe('GT');
    expect(shortBankName({ accountType: 'Cash', accountName: 'Cash Office' })).toBe('Cash');
  });

  it('reads the payer from the bank narration or the ledger bank reference', () => {
    expect(payerFromNarration('NIP FRM ISAH KABIR Transfer — Paid by: ISAH KABIR')).toBe('ISAH KABIR');
    expect(payerFromBankReference('ibrahim dougo ₦15,000 Bank:Zarewa Aluminum & Plastics Ltd')).toBe('ibrahim dougo');
    expect(payerFromBankReference('REVERSAL_OF:LE-KD-26-1')).toBe('');
  });
});

describe('receipts register — Kaduna Sep 2026 fixture', () => {
  it('three sections in order; 1 + 2 + 3 = cash received ₦206,623,845 by bank', () => {
    expect(reg.sections.map((s) => [s.number, s.label, s.totalNgn, s.lines.length])).toEqual([
      [1, 'Produced in period', 198_472_873, 235],
      [2, 'Advances', 7_945_922, 13],
      [3, 'Settles earlier debt', 205_050, 2],
    ]);
    expect(reg.grandTotalNgn).toBe(206_623_845);
    expect(Object.fromEntries(reg.totalsByBank.map((b) => [b.bank, b.amountNgn]))).toEqual({
      Cash: 157_880,
      Moniepoint: 76_434_894,
      Taj: 130_031_071,
    });
    for (const s of reg.sections) {
      expect(s.byBank.reduce((a, b) => a + b.amountNgn, 0)).toBe(s.totalNgn);
      expect(s.lines.map((l) => l.dateISO)).toEqual(s.lines.map((l) => l.dateISO).slice().sort());
    }
  });

  it('agrees with the accrual statement bridge: difference ₦0', () => {
    const tie = receiptsVersusAccrualBridge(reg, accrual);
    expect(tie).toMatchObject({ totalNgn: 206_623_845, bridgeCashReceivedNgn: 206_623_845, differenceNgn: 0, comparable: true });
  });

  it('"Settled by credit, no cash": 24 receipts, ₦17,251,654, not in the cash lines', () => {
    expect(reg.creditSettled.rows).toHaveLength(24);
    expect(reg.creditSettled.amountNgn).toBe(17_251_654);
    expect(reg.lines.some((l) => l.ledgerEntryId === 'LE-KD-26-1706')).toBe(false);
  });

  it('one line per bank leg: LE-KD-26-1727 split over Moniepoint and Taj', () => {
    const legs = reg.lines.filter((l) => l.ledgerEntryId === 'LE-KD-26-1727');
    expect(legs.map((l) => [l.treasuryMovementId, l.bank, l.amountNgn])).toEqual([
      ['TM-KD-26-2560', 'Moniepoint', 500_000],
      ['TM-KD-26-2561', 'Moniepoint', 500_000],
      ['TM-KD-26-2562', 'Moniepoint', 500_000],
      ['TM-KD-26-2563', 'Taj', 291_880],
    ]);
  });

  it('Confirmed / Statement: "Alert · … · dd/mm hh:mm" and "✓ BKR-…", never "not matched"', () => {
    const l = reg.lines.find((x) => x.ledgerEntryId === 'LE-KD-26-1569');
    expect(l.confirmed).toMatch(/^Alert · .+ · 01\/09 10:10$/);
    expect(l.statement).toBe('✓ BKR-KD-26-0094');
    expect(reg.lines.every((x) => !/not matched/.test(x.statement + x.payer))).toBe(true);
    expect(reg.counts).toMatchObject({ unconfirmed: 6, unconfirmedOver24h: 6, noTreasury: 0 });
    expect(reg.lines.filter((x) => x.exceptions.includes(EXC_UNCONFIRMED)).every((x) => !x.confirmed)).toBe(true);
    expect(reg.counts.confirmedLate).toBe(reg.lines.filter((x) => x.review.includes(REVIEW_CONFIRMED_LATE)).length);
  });

  it('Remark = cashier note on the confirm step, else the ledger note', () => {
    const withNote = buildReceiptsRegister({
      ...kd,
      asAtISO: '2026-10-13T14:27:00Z',
      receipts: kd.receipts.map((r) => (r.ledgerEntryId === 'LE-KD-26-1569' ? { ...r, cashierNote: 'alert seen 10:10' } : r)),
    });
    expect(withNote.lines.find((l) => l.ledgerEntryId === 'LE-KD-26-1569').remark).toBe('alert seen 10:10');
    expect(reg.lines.find((l) => l.ledgerEntryId === 'LE-KD-26-1569').remark).toBe('Full settlement (receipt)');
  });

  it('open month: section 2 reads "Not yet produced"', () => {
    const open = buildReceiptsRegister({ ...kd, asAtISO: '2026-09-20T10:00:00Z' });
    expect(open.sections[1].label).toBe('Not yet produced');
  });

  it('filters: bank, unconfirmed, payer ≠ customer (bridge not compared when filtered)', () => {
    const taj = buildReceiptsRegister({ ...kd, asAtISO: '2026-10-13T14:27:00Z', filters: { bank: 'Taj' } });
    expect(taj.grandTotalNgn).toBe(130_031_071);
    expect(receiptsVersusAccrualBridge(taj, accrual).comparable).toBe(false);
    const unc = buildReceiptsRegister({ ...kd, asAtISO: '2026-10-13T14:27:00Z', filters: { confirmed: 'unconfirmed' } });
    expect(unc.lines.every((l) => !l.confirmed)).toBe(true);
    const pnc = buildReceiptsRegister({ ...kd, asAtISO: '2026-10-13T14:27:00Z', filters: { payerNotCustomer: true } });
    expect(pnc.lines.length).toBe(reg.counts.payerNotCustomer);
  });

  it('prints the exact columns, three sections, page-1 tie and the credit table', () => {
    expect(REGISTER_COLUMNS.map((c) => c.label)).toEqual([
      'Date', 'Payer (name on alert/receipt)', 'Customer', 'Quotation', 'Receipt', 'Amount received ₦', 'Bank', 'Confirmed', 'Statement', 'Remark',
    ]);
    const doc = receiptsRegisterDocument(reg, { branchName: 'Kaduna', accrual });
    expect(doc.sections.map((s) => s.title).slice(0, 3)).toEqual(['1. PRODUCED IN PERIOD', '2. ADVANCES', '3. SETTLES EARLIER DEBT']);
    expect(doc.summary.rows.find((r) => r.label === 'Difference (must be ₦0)').value).toBe(0);
    expect(doc.sections.at(-1).title).toMatch(/^Settled by credit, no cash/);
    const html = renderReportDocument(doc);
    expect(html).toContain('LE-KD-26-1727');
    expect(html).toContain('✓ BKR-KD-26-0094');
    const sheets = receiptsRegisterExcelSheets(reg, { accrual });
    expect(sheets[0].rows.reduce((s, r) => s + r.amountReceivedNgn, 0)).toBe(206_623_845);
    expect(sheets.at(-1).rows.at(-1)).toEqual({ item: 'Difference', amountNgn: 0 });
  });
});

describe('accrual sales statement — Kaduna Sep 2026 fixture', async () => {
  const { buildAccrualSalesStatement, accrualSalesStatementDocument, accrualSalesStatementExcelSheets } = await import(
    '../shared/lib/accrualSalesStatement.js'
  );
  const st = buildAccrualSalesStatement(accrual, kd);

  it('produced at quotation value by category − value-reducing refunds = net sales ₦177,996,973', () => {
    expect(st.grossNgn).toBe(180_508_704);
    expect(st.valueReducingRefundsNgn).toBe(2_511_731);
    expect(st.netSalesNgn).toBe(177_996_973);
    expect(st.categoriesTieNgn).toBe(0);
    expect(st.categories[0]).toMatchObject({ category: 'Roofing Sheet', quotationCount: 156, netNgn: 168_958_042 });
  });

  it('the bridge closes to ₦0 and its cash line equals the receipts register', () => {
    expect(st.bridgeDifferenceNgn).toBe(0);
    expect(st.bridgeLines[0].amountNgn).toBe(reg.grandTotalNgn);
  });

  it('lists credit receipts posted as cash, refunds above value, double-counted advances, 0 m jobs', () => {
    const kinds = Object.fromEntries(st.exceptions.map((x) => [x.ref, x.kind]));
    expect(kinds['LE-KD-26-1792']).toMatch(/^Credit receipt with treasury cash lines/);
    expect(st.exceptions.find((x) => x.ref === 'LE-KD-26-1792')).toMatchObject({ amountNgn: 4_045_901, severity: 'review' });
    expect(st.exceptions.find((x) => x.ref === 'LE-KD-26-1706')).toMatchObject({ amountNgn: 7_520, severity: 'exception' });
    expect(kinds['QT-KD-26-1593']).toBe('Refunds bigger than the quotation value');
    expect(kinds['TM-KD-26-1499']).toBe('Double-counted advance application');
    expect(kinds['PRO-KD-26-1349']).toBe('Completed job with 0 m — not a sale');
  });

  it('one page: no receipt lines, no detail sections', () => {
    const doc = accrualSalesStatementDocument(st, { branchName: 'Kaduna' });
    expect(doc.sections).toEqual([]);
    expect(renderReportDocument(doc)).not.toContain('LE-KD-26-1727');
    expect(accrualSalesStatementExcelSheets(st, accrual).map((x) => x.name)).toEqual([
      'Statement', 'By_category', 'Produced_by_quotation', 'Customer_balances', 'Bridge', 'Exceptions',
    ]);
  });
});
