import { describe, expect, it } from 'vitest';
import {
  treasuryBookBalanceByAccountId,
  treasuryBookDisplayNgn,
  treasuryBookTotalNgn,
  findTreasuryPayoutShortAccount,
  treasuryDeskBalanceSplit,
  treasuryDeskBalanceForAccount,
} from './financeDeskTreasury.js';

describe('financeDeskTreasury', () => {
  it('computes book balance from opening plus movements', () => {
    const accounts = [{ id: 1, balance: 0, openingBalanceNgn: 1000 }];
    const movements = [{ treasuryAccountId: 1, amountNgn: 250 }, { treasuryAccountId: 1, amountNgn: -50 }];
    const bookById = treasuryBookBalanceByAccountId(accounts, movements);
    expect(treasuryBookDisplayNgn(accounts[0], bookById)).toBe(1200);
    expect(treasuryBookTotalNgn(accounts, bookById)).toBe(1200);
  });

  it('falls back to stored balance when account id is not numeric', () => {
    const acc = { id: 'uuid-1', balance: 5000, openingBalanceNgn: 0 };
    expect(treasuryBookDisplayNgn(acc, new Map())).toBe(5000);
  });

  it('does not block payout when an unused account has low or negative balance', () => {
    const accounts = [
      { id: 1, name: 'Empty petty cash', balance: -5000, openingBalanceNgn: 0 },
      { id: 2, name: 'Main bank', balance: 100000, openingBalanceNgn: 50000 },
    ];
    const movements = [{ treasuryAccountId: 2, amountNgn: 50000 }];
    const bookById = treasuryBookBalanceByAccountId(accounts, movements);
    const lines = [{ treasuryAccountId: 2, amountNgn: 10000 }];
    expect(findTreasuryPayoutShortAccount(lines, accounts, bookById)).toBeNull();
  });

  it('flags only the paying account when its balance is insufficient', () => {
    const accounts = [
      { id: 1, name: 'Main bank', balance: 5000, openingBalanceNgn: 5000 },
      { id: 2, name: 'Petty cash', balance: 200, openingBalanceNgn: 200 },
    ];
    const bookById = treasuryBookBalanceByAccountId(accounts, []);
    const lines = [{ treasuryAccountId: 2, amountNgn: 500 }];
    const short = findTreasuryPayoutShortAccount(lines, accounts, bookById);
    expect(short?.name).toBe('Petty cash');
  });

  it('splits cashier desk balance into confirmed, confirmed+unlinked, and all inbound payments', () => {
    const accounts = [{ id: 7, name: 'GTB', openingBalanceNgn: 100_000, balance: 0 }];
    const receipts = [
      { id: 'RC-1', ledgerEntryId: 'LE-1', amountNgn: 50_000, financeReconciliationSavedAtISO: '2026-08-01' },
      { id: 'RC-2', ledgerEntryId: 'LE-2', amountNgn: 20_000, status: 'Pending clearance' },
    ];
    const movements = [
      { treasuryAccountId: 7, type: 'RECEIPT_IN', sourceKind: 'LEDGER_RECEIPT', sourceId: 'LE-1', amountNgn: 50_000 },
      { treasuryAccountId: 7, type: 'RECEIPT_IN', sourceKind: 'LEDGER_RECEIPT', sourceId: 'LE-2', amountNgn: 20_000 },
      { treasuryAccountId: 7, type: 'EXPENSE', sourceKind: 'EXPENSE', sourceId: 'EX-1', amountNgn: -10_000 },
    ];
    const bankDeposits = [
      { treasuryAccountId: 7, amountNgn: 30_000, allocatedNgn: 0, status: 'OPEN' },
    ];
    const bookById = treasuryBookBalanceByAccountId(accounts, movements);
    const split = treasuryDeskBalanceSplit({
      accounts,
      movements,
      receipts,
      bankDeposits,
      bookById,
    });
    expect(split.totals.bookNgn).toBe(160_000);
    expect(split.totals.confirmedNgn).toBe(50_000);
    expect(split.totals.unlinkedNgn).toBe(30_000);
    expect(split.totals.confirmedPlusUnlinkedNgn).toBe(80_000);
    expect(split.totals.pendingNgn).toBe(20_000);
    expect(split.totals.allTotalNgn).toBe(100_000);
    const acc = treasuryDeskBalanceForAccount(split.byAccountId, accounts[0]);
    expect(acc.bookNgn).toBe(160_000);
    expect(acc.confirmedNgn).toBe(50_000);
    expect(acc.confirmedPlusUnlinkedNgn).toBe(80_000);
    expect(acc.allTotalNgn).toBe(100_000);
  });
});
