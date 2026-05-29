import { describe, it, expect } from 'vitest';
import { resolveDeskProfile, getWorkspaceDeskNav, DESK_PROFILES } from './workspaceDeskNav.js';

describe('workspaceDeskNav', () => {
  it('resolves executive for md', () => {
    expect(resolveDeskProfile({ roleKey: 'md', permissions: [] })).toBe(DESK_PROFILES.executive);
  });

  it('resolves branch for sales_manager', () => {
    expect(resolveDeskProfile({ roleKey: 'sales_manager', permissions: [] })).toBe(DESK_PROFILES.branch);
  });

  it('resolves staff for sales_staff', () => {
    const nav = getWorkspaceDeskNav({ roleKey: 'sales_staff', permissions: ['sales.view'] });
    expect(nav.profile).toBe(DESK_PROFILES.staff);
    expect(nav.items.some((i) => i.id === 'create')).toBe(true);
  });

  it('office desk includes approvals for finance_manager', () => {
    const nav = getWorkspaceDeskNav({ roleKey: 'finance_manager', permissions: ['finance.view'] });
    expect(nav.profile).toBe(DESK_PROFILES.office);
    expect(nav.items.some((i) => i.id === 'approvals')).toBe(true);
  });
});
