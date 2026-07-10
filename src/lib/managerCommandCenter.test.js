import { describe, expect, it } from 'vitest';
import { computeBranchHealthScore } from './managerBranchHealthScore';
import { normalizeManagerPageTab } from './managerPageTabs';
import { checklistCompletionPct } from './managerDailyChecklist';
import { managerKindTone, managerSlaMeta, normalizeManagerInboxRoute } from './managerDashboardCore';

describe('manager command center helpers', () => {
  it('normalizes page tabs', () => {
    expect(normalizeManagerPageTab('intelligence')).toBe('intelligence');
    expect(normalizeManagerPageTab('ops')).toBe('operations');
    expect(normalizeManagerPageTab('')).toBe('today');
  });

  it('redirects attendance inbox routes to Team HR', () => {
    expect(normalizeManagerInboxRoute('attendance')).toMatchObject({
      tab: 'attention',
      redirectToTeamHr: true,
    });
  });

  it('uses four-color kind tones', () => {
    expect(managerKindTone('governance')).toBe('urgent');
    expect(managerKindTone('clearance')).toBe('pending');
  });

  it('marks refund SLA breach after 48h', () => {
    expect(managerSlaMeta('refunds', 51)?.tone).toBe('urgent');
    expect(managerSlaMeta('refunds', 10)?.tone).toBe('info');
    expect(managerSlaMeta('refunds', null)?.label).toMatch(/unknown/i);
  });

  it('computes health score in range', () => {
    const strong = computeBranchHealthScore({
      totalOpenActions: 0,
      overdueCount: 0,
      stockRegisterCount: 0,
      lowStockCount: 0,
      attendancePendingCount: 0,
      salesProgressPct: 100,
      metresProgressPct: 100,
      checklistCompletionPct: 100,
    });
    expect(strong.score).toBeGreaterThanOrEqual(85);
    expect(strong.status).toBe('Strong');

    const risk = computeBranchHealthScore({
      totalOpenActions: 20,
      overdueCount: 8,
      stockRegisterCount: 2,
      lowStockCount: 10,
      attendancePendingCount: 12,
      salesProgressPct: 20,
      metresProgressPct: 10,
      checklistCompletionPct: 0,
    });
    expect(risk.score).toBeLessThan(55);
    expect(risk.status).toBe('At risk');
  });

  it('computes checklist completion', () => {
    expect(checklistCompletionPct({})).toBe(0);
    expect(checklistCompletionPct({ open_cash: { done: true } })).toBe(13);
  });
});
