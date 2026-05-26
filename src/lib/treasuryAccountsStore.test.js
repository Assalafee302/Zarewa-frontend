import { describe, it, expect } from 'vitest';
import {
  treasuryAccountsForWorkspace,
  treasuryAccountsFromSnapshot,
  workspaceTreasuryBranchId,
} from './treasuryAccountsStore.js';

describe('treasuryAccountsForWorkspace', () => {
  const snapshot = {
    branchScope: 'ALL',
    treasuryAccounts: [
      { id: 1, name: 'Kaduna Main', bankName: 'GTBank', branchId: 'BR-KD', type: 'Bank', accNo: '1' },
      { id: 2, name: 'Yola Main', bankName: 'Zenith', branchId: 'BR-YL', type: 'Bank', accNo: '2' },
    ],
  };

  it('filters to current branch when HQ view-all bootstrap includes all accounts', () => {
    const list = treasuryAccountsForWorkspace(snapshot, {
      currentBranchId: 'BR-KD',
      viewAllBranches: true,
    });
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Kaduna Main');
  });

  it('returns bootstrap list unchanged when already single-branch scoped', () => {
    const scoped = { ...snapshot, branchScope: 'BR-YL' };
    const list = treasuryAccountsForWorkspace(scoped, {
      currentBranchId: 'BR-YL',
      viewAllBranches: false,
    });
    expect(list).toHaveLength(2);
  });

  it('workspaceTreasuryBranchId prefers session branch over ALL scope', () => {
    expect(
      workspaceTreasuryBranchId({ currentBranchId: 'BR-YL' }, { branchScope: 'ALL' })
    ).toBe('BR-YL');
  });

  it('treasuryAccountsFromSnapshot maps branchId', () => {
    const rows = treasuryAccountsFromSnapshot(snapshot);
    expect(rows[1].branchId).toBe('BR-YL');
  });
});
