import { describe, expect, it } from 'vitest';
import { buildHrMainNav } from './hrMainNav.js';

describe('buildHrMainNav', () => {
  it('includes Time & Absence and hides Analytics for HR admin bundle', () => {
    const perms = ['hr.staff.manage', 'hr.requests.hr_review', 'hr.reports.view'];
    const { navItems, moreNavItems } = buildHrMainNav(perms);
    expect(navItems.some((i) => i.to === '/hr/time-absence')).toBe(true);
    expect(navItems.some((i) => i.to === '/hr/requests')).toBe(false);
    expect(navItems.some((i) => i.to === '/hr/analytics')).toBe(false);
    expect(moreNavItems.some((i) => i.to === '/hr/analytics')).toBe(true);
  });

  it('shows Time & Absence for gmhr without HR review permission', () => {
    const perms = ['hr.requests.gm_approve', 'hr.directory.view'];
    const { navItems } = buildHrMainNav(perms);
    expect(navItems.some((i) => i.to === '/hr/time-absence')).toBe(true);
  });
});
