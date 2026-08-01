import { describe, expect, it, vi } from 'vitest';

vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

import * as XLSX from 'xlsx';
import {
  buildTreasuryAccountStatementPeriod,
  downloadTreasuryAccountStatementXlsx,
} from './treasuryAccountStatementExcel.js';

describe('treasuryAccountStatementExcel', () => {
  const account = {
    id: 7,
    name: 'Main Cash',
    bankName: 'Cash',
    balance: 80_000,
    openingBalanceNgn: 50_000,
  };

  const movements = [
    {
      id: 1,
      treasuryAccountId: 7,
      postedAtISO: '2026-07-01T10:00:00.000Z',
      amountNgn: 20_000,
      type: 'RECEIPT_IN',
      sourceKind: 'LEDGER_RECEIPT',
      reference: 'RCPT-1',
      sourceId: 'SR-1',
    },
    {
      id: 2,
      treasuryAccountId: 7,
      postedAtISO: '2026-07-15T10:00:00.000Z',
      amountNgn: -10_000,
      type: 'EXPENSE_OUT',
      sourceKind: 'EXPENSE',
      reference: 'EXP-1',
      sourceId: 'E-1',
    },
    {
      id: 3,
      treasuryAccountId: 7,
      postedAtISO: '2026-08-01T10:00:00.000Z',
      amountNgn: 20_000,
      type: 'RECEIPT_IN',
      sourceKind: 'LEDGER_RECEIPT',
      reference: 'RCPT-2',
      sourceId: 'SR-2',
    },
  ];

  it('builds July period with opening balance after prior postings', () => {
    const period = buildTreasuryAccountStatementPeriod({
      account,
      movements,
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    });
    expect(period.ok).toBe(true);
    expect(period.rows).toHaveLength(2);
    expect(period.openingBalanceNgn).toBe(50_000);
    expect(period.totals.in).toBe(20_000);
    expect(period.totals.out).toBe(10_000);
    expect(period.closingBalanceNgn).toBe(60_000);
    expect(period.rows[0].balanceNgn).toBe(70_000);
    expect(period.rows[1].balanceNgn).toBe(60_000);
  });

  it('rejects empty ranges', () => {
    const period = buildTreasuryAccountStatementPeriod({
      account,
      movements,
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    });
    expect(period.ok).toBe(false);
  });

  it('downloads xlsx without throwing', () => {
    const period = buildTreasuryAccountStatementPeriod({
      account,
      movements,
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    });
    expect(period.ok).toBe(true);
    const name = downloadTreasuryAccountStatementXlsx(period);
    expect(String(name)).toMatch(/\.xlsx$/);
    expect(XLSX.writeFile).toHaveBeenCalled();
  });
});
