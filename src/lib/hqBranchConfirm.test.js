import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearHqBranchConfirmed,
  isHqBranchConfirmed,
  markHqBranchConfirmed,
  roleNeedsHqBranchConfirm,
} from './hqBranchConfirm.js';

describe('hqBranchConfirm', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('flags admin, md, ceo, and chairman', () => {
    expect(roleNeedsHqBranchConfirm('admin')).toBe(true);
    expect(roleNeedsHqBranchConfirm('MD')).toBe(true);
    expect(roleNeedsHqBranchConfirm('ceo')).toBe(true);
    expect(roleNeedsHqBranchConfirm('chairman')).toBe(true);
    expect(roleNeedsHqBranchConfirm('sales')).toBe(false);
  });

  it('tracks confirmation in sessionStorage', () => {
    expect(isHqBranchConfirmed('u1')).toBe(false);
    markHqBranchConfirmed('u1');
    expect(isHqBranchConfirmed('u1')).toBe(true);
    clearHqBranchConfirmed('u1');
    expect(isHqBranchConfirmed('u1')).toBe(false);
  });
});
