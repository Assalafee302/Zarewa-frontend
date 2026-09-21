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

  it('filters to the payable factory when HQ is viewing all branches', () => {
    const list = treasuryAccountsForWorkspace(
      snapshot,
      { currentBranchId: 'BR-KD', viewAllBranches: true },
      { payableBranchId: 'BR-YL' }
    );
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Yola Main');
  });

  it('always filters by workspace branch even when bootstrap scope is single-branch', () => {
    const scoped = {
      branchScope: 'BR-KD',
      treasuryAccounts: [
        { id: 1, name: 'Kaduna Main', bankName: 'GTBank', branchId: 'BR-KD', type: 'Bank', accNo: '1' },
        { id: 2, name: 'Yola Main', bankName: 'Zenith', branchId: 'BR-YL', type: 'Bank', accNo: '2' },
      ],
    };
    const list = treasuryAccountsForWorkspace(scoped, {
      currentBranchId: 'BR-KD',
      viewAllBranches: false,
    });
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Kaduna Main');
  });

  it('includes unassigned accounts on the default workspace branch', () => {
    const scoped = {
      treasuryAccounts: [
        { id: 1, name: 'Legacy', bankName: 'GTBank', branchId: '', type: 'Bank', accNo: '1' },
        { id: 2, name: 'Kaduna', bankName: 'GTBank', branchId: 'BR-KD', type: 'Bank', accNo: '2' },
        { id: 3, name: 'Yola', bankName: 'Zenith', branchId: 'BR-YL', type: 'Bank', accNo: '3' },
      ],
    };
    const list = treasuryAccountsForWorkspace(scoped, { currentBranchId: 'BR-KD' });
    expect(list.map((a) => a.name).sort()).toEqual(['Kaduna', 'Legacy']);
  });

  it('excludes unassigned accounts from a non-default branch workspace', () => {
    const scoped = {
      treasuryAccounts: [
        { id: 1, name: 'Legacy', bankName: 'GTBank', branchId: '', type: 'Bank', accNo: '1' },
        { id: 2, name: 'Yola', bankName: 'Zenith', branchId: 'BR-YL', type: 'Bank', accNo: '2' },
      ],
    };
    const list = treasuryAccountsForWorkspace(scoped, { currentBranchId: 'BR-YL' });
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Yola');
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

  it('preserves POS type instead of collapsing it to Bank', () => {
    const rows = treasuryAccountsFromSnapshot({
      treasuryAccounts: [{ id: 9, name: 'Yola POS', type: 'POS', bankName: 'POS', accNo: '3' }],
    });
    expect(rows[0].type).toBe('POS');
  });
});
