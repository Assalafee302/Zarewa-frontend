import { describe, expect, it } from 'vitest';
import {
  treasuryBookBalanceByAccountId,
  treasuryBookDisplayNgn,
  treasuryBookTotalNgn,
  findTreasuryPayoutShortAccount,
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
});
