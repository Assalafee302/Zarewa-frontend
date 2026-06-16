import { describe, expect, it } from 'vitest';
import {
  getHrDashboardIntro,
  getHrDashboardOverviewKpis,
  getHrDashboardPendingKpi,
  getHrDashboardQuickActions,
  getHrDashboardQueueLines,
  hrPayrollRunsPath,
  hrRequestQueuePath,
} from './hrDashboardUi.js';

describe('hrDashboardUi', () => {
  it('builds HR admin queue links', () => {
    const perms = ['hr.staff.manage', 'hr.requests.hr_review', 'hr.payroll.prepare'];
    const lines = getHrDashboardQueueLines({ pendingHrReview: 3 }, {}, perms);
    expect(lines.some((l) => l.label === 'HR queue' && l.count === 3)).toBe(true);
    expect(lines.some((l) => l.href === hrRequestQueuePath('hr_queue'))).toBe(true);
  });

  it('prioritises GM final KPI for gmhr-only permissions', () => {
    const perms = ['hr.requests.gm_approve', 'hr.payroll.gm_approve'];
    const kpi = getHrDashboardPendingKpi({ pendingGmHrReview: 2 }, {}, perms);
    expect(kpi.label).toBe('Awaiting GM final');
    expect(kpi.value).toBe(2);
    expect(kpi.href).toContain('gm_queue');
  });

  it('uses GM-focused intro for gmhr role', () => {
    const intro = getHrDashboardIntro('gmhr', ['hr.requests.gm_approve']);
    expect(intro.description).toMatch(/GM-approve/i);
  });

  it('includes GM final quick action for gmhr', () => {
    const actions = getHrDashboardQuickActions(['hr.requests.gm_approve', 'hr.payroll.gm_approve']);
    expect(actions.some((a) => a.label === 'GM final queue')).toBe(true);
    expect(actions.some((a) => a.label === 'HR review queue')).toBe(false);
  });

  it('shows GM payroll KPI row for gmhr', () => {
    const kpis = getHrDashboardOverviewKpis({
      counts: { pendingGmHrReview: 1, draftPayrollAwaitingGm: 2 },
      summary: {},
      staff: { active: 50 },
      permissions: ['hr.requests.gm_approve', 'hr.payroll.gm_approve'],
    });
    expect(kpis.map((k) => k.label)).toEqual([
      'Active staff',
      'Awaiting GM final',
      'Payroll awaiting GM',
      'Open incidents',
    ]);
    expect(kpis[2].href).toBe(hrPayrollRunsPath());
    expect(kpis[2].value).toBe(2);
  });

  it('surfaces payroll awaiting GM in queue lines for gmhr', () => {
    const lines = getHrDashboardQueueLines({ draftPayrollAwaitingGm: 3 }, {}, ['hr.payroll.gm_approve']);
    expect(lines.some((l) => l.label === 'Payroll awaiting GM sign-off' && l.count === 3)).toBe(true);
  });
});
