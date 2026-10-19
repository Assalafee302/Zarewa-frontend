import { describe, expect, it } from 'vitest';
import { payLinesUseCashOffice } from './cashOfficePayout.js';

describe('payLinesUseCashOffice (D2)', () => {
  const accounts = [{ id: 1, type: 'Cash' }, { id: 2, type: 'Bank' }, { id: 3, type: 'POS' }];
  it('is true only when a line pays from a Cash account', () => {
    expect(payLinesUseCashOffice([{ treasuryAccountId: '1' }], accounts)).toBe(true);
    expect(payLinesUseCashOffice([{ treasuryAccountId: 2 }, { treasuryAccountId: 3 }], accounts)).toBe(false);
    expect(payLinesUseCashOffice([], accounts)).toBe(false);
  });
});
