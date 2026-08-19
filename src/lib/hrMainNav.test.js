import { describe, expect, it } from 'vitest';
import { buildHrMainNav, hrNavItemIsActive } from './hrMainNav.js';

describe('buildHrMainNav', () => {
  it('keeps five work areas and folds talent, analytics, and executive into them', () => {
    const perms = ['hr.staff.manage', 'hr.requests.hr_review', 'hr.reports.view', 'hr.payroll.prepare'];
    const { navItems, moreNavItems, secondaryNavItems } = buildHrMainNav(perms, { showExecutive: true });
    expect(navItems.map((i) => i.label)).toEqual(['Dashboard', 'People', 'Time', 'Pay', 'Records']);
    expect(moreNavItems).toEqual([]);
    expect(navItems.some((i) => i.to === '/hr/analytics')).toBe(false);
    expect(navItems.some((i) => i.to === '/hr/talent')).toBe(false);
    expect(secondaryNavItems.some((i) => i.to === '/hr/analytics')).toBe(true);
    expect(secondaryNavItems.some((i) => i.to === '/executive-hr')).toBe(true);
    expect(hrNavItemIsActive(navItems.find((i) => i.label === 'People'), '/hr/talent')).toBe(true);
    expect(hrNavItemIsActive(navItems.find((i) => i.label === 'Records'), '/executive-hr/family')).toBe(true);
  });

  it('shows Time for gmhr without HR review permission', () => {
    const perms = ['hr.requests.gm_approve', 'hr.directory.view'];
    const { navItems } = buildHrMainNav(perms);
    expect(navItems.some((i) => i.to === '/hr/time-absence')).toBe(true);
  });
});
