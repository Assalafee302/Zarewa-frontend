import { describe, expect, it } from 'vitest';
import { isExitedOrRetiredStaff, matchesQuickFilter } from './hrStaffDirectoryUi.js';

describe('hrStaffDirectoryUi exited/retired', () => {
  it('matches retired employment status', () => {
    const staff = { profileExtra: { employmentMeta: { employmentStatus: 'retired' } } };
    expect(isExitedOrRetiredStaff(staff)).toBe(true);
    expect(matchesQuickFilter(staff, 'exited-retired')).toBe(true);
  });

  it('matches separated lifecycle status', () => {
    const staff = { profileExtra: { lifecycle: { separation: { status: 'separated' } } } };
    expect(isExitedOrRetiredStaff(staff)).toBe(true);
  });

  it('matches retirement noted in separation reason', () => {
    const staff = { profileExtra: { lifecycle: { separation: { status: 'active', reason: 'Voluntary retirement' } } } };
    expect(isExitedOrRetiredStaff(staff)).toBe(true);
  });

  it('does not match active staff', () => {
    const staff = { status: 'active', profileExtra: { employmentMeta: { employmentStatus: 'active' } } };
    expect(isExitedOrRetiredStaff(staff)).toBe(false);
    expect(matchesQuickFilter(staff, 'exited-retired')).toBe(false);
  });
});
