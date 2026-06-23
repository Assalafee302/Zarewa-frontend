import { describe, expect, it } from 'vitest';
import {
  accountingRegisterBranchKey,
  snapshotRegisterMatches,
} from './accountingRegisterSnapshot.js';

describe('accountingRegisterSnapshot', () => {
  it('normalizes branch keys', () => {
    expect(accountingRegisterBranchKey(null)).toBe('ALL');
    expect(accountingRegisterBranchKey('ALL')).toBe('ALL');
    expect(accountingRegisterBranchKey('BR-KD')).toBe('BR-KD');
  });

  it('matches pack scope to panel branch', () => {
    const pack = { ok: true, sections: [] };
    expect(snapshotRegisterMatches(pack, null, 'ALL')).toBe(true);
    expect(snapshotRegisterMatches(pack, 'BR-KD', 'BR-KD')).toBe(true);
    expect(snapshotRegisterMatches(pack, 'BR-KD', 'ALL')).toBe(false);
    expect(snapshotRegisterMatches(null, 'BR-KD', 'BR-KD')).toBe(false);
  });
});
