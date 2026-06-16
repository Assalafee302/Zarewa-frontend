import { describe, expect, it } from 'vitest';
import { buildHrMainNav } from './hrMainNav.js';

describe('buildHrMainNav', () => {
  it('includes Requests and hides Analytics for HR admin bundle', () => {
    const perms = ['hr.staff.manage', 'hr.requests.hr_review', 'hr.reports.view'];
    const { navItems, moreNavItems } = buildHrMainNav(perms);
    expect(navItems.some((i) => i.to === '/hr/requests')).toBe(true);
    expect(navItems.some((i) => i.to === '/hr/analytics')).toBe(false);
    expect(moreNavItems.some((i) => i.to === '/hr/analytics')).toBe(true);
  });

  it('shows GM queue path for gmhr without HR review permission', () => {
    const perms = ['hr.requests.gm_approve', 'hr.directory.view'];
    const { navItems } = buildHrMainNav(perms);
    expect(navItems.some((i) => i.to === '/hr/requests')).toBe(true);
  });
});
