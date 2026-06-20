import { describe, expect, it } from 'vitest';
import {
  treasuryBookBalanceByAccountId,
  treasuryBookDisplayNgn,
  treasuryBookTotalNgn,
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
});
