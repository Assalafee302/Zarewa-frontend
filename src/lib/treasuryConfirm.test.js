import { describe, expect, it } from 'vitest';
import {
  applyTreasuryConfirmation,
  describeCorrectionChange,
  treasuryConfirmPrompt,
} from './treasuryConfirm.js';

describe('treasuryConfirmPrompt', () => {
  it('asks for a date reason on backdated or future postings', () => {
    for (const code of ['DATE_REASON_REQUIRED', 'DATE_ADMIN_REQUIRED', 'FUTURE_DATE']) {
      const p = treasuryConfirmPrompt({ code, message: 'Date is old.' });
      expect(p).toMatchObject({ kind: 'reason', target: 'treasuryConfirm', field: 'dateOverrideReason' });
    }
  });

  it('asks for a reason on a 120-second repeat and a plain confirm on a same-day repeat', () => {
    expect(treasuryConfirmPrompt({ code: 'DUPLICATE_BLOCK' })).toMatchObject({
      kind: 'reason',
      field: 'duplicateOverrideReason',
    });
    expect(treasuryConfirmPrompt({ code: 'DUPLICATE_SAME_DAY' })).toMatchObject({
      kind: 'confirm',
      field: 'duplicateSameDayConfirmed',
    });
  });

  it('shows old → new for a correction and puts the reason on the body', () => {
    const p = treasuryConfirmPrompt({
      code: 'CORRECTION_REASON_REQUIRED',
      details: {
        old: { amountNgn: 20000, treasuryAccountId: 2, accountName: 'Zaps', postedAtISO: '2026-08-07T12:00:00.000Z' },
        new: { amountNgn: 20000, treasuryAccountId: 2, accountName: 'Zaps', postedAtISO: '2026-04-05T12:00:00.000Z' },
      },
    });
    expect(p.target).toBe('body');
    expect(p.field).toBe('correctionReason');
    expect(p.message).toContain('Date: 2026-08-07 → 2026-04-05');
    expect(p.message).not.toContain('Amount:');
  });

  it('does not offer a confirmation for errors the user cannot override', () => {
    expect(treasuryConfirmPrompt({ code: 'STRICT_CACHE_MISMATCH' })).toBe(null);
    expect(treasuryConfirmPrompt({ code: 'WRONG_SIGN' })).toBe(null);
  });
});

describe('describeCorrectionChange', () => {
  it('lists amount and account changes', () => {
    expect(
      describeCorrectionChange({
        old: { amountNgn: 1000, treasuryAccountId: 4, accountName: 'Moniepoint', postedAtISO: '2026-09-01' },
        new: { amountNgn: 1500, treasuryAccountId: 2, accountName: 'Zaps', postedAtISO: '2026-09-01' },
      })
    ).toEqual(['Amount: ₦1,000 → ₦1,500', 'Account: Moniepoint → Zaps']);
  });
});

describe('applyTreasuryConfirmation', () => {
  it('merges answers without dropping earlier confirmations', () => {
    let body = JSON.stringify({ amountNgn: 5 });
    body = applyTreasuryConfirmation(body, { target: 'treasuryConfirm', field: 'amountFloorReason' }, 'residue');
    body = applyTreasuryConfirmation(body, { target: 'treasuryConfirm', field: 'duplicateSameDayConfirmed' }, true);
    body = applyTreasuryConfirmation(body, { target: 'body', field: 'correctionReason' }, 'bank statement');
    expect(JSON.parse(body)).toEqual({
      amountNgn: 5,
      treasuryConfirm: { amountFloorReason: 'residue', duplicateSameDayConfirmed: true },
      correctionReason: 'bank statement',
    });
  });
});
