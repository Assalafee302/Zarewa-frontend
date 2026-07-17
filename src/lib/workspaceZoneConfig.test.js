import { describe, it, expect } from 'vitest';
import {
  getWorkspaceZoneConfig,
  actionChipToTaskTab,
  workItemMatchesActionChip,
  getWorkspaceZoneLabel,
  isValidWorkspaceZone,
  WORKSPACE_ZONES,
  ACTION_TABS,
} from './workspaceZoneConfig.js';
import { TASK_QUEUE_TABS } from './workspaceTaskQueue.js';

describe('workspaceZoneConfig', () => {
  it('returns five zones and staff default action', () => {
    const cfg = getWorkspaceZoneConfig({ roleKey: 'sales_staff' });
    expect(cfg.zones).toHaveLength(5);
    expect(cfg.defaultZone).toBe('action');
    expect(cfg.zones.map((z) => z.id)).toEqual(['activity', 'rooms', 'action', 'records', 'apps']);
  });

  it('maps branch manager to activity default with endorsement chips', () => {
    const cfg = getWorkspaceZoneConfig({ roleKey: 'sales_manager' });
    expect(cfg.defaultZone).toBe('activity');
    expect(cfg.actionChips.some((c) => c.id === 'endorsements')).toBe(true);
    expect(cfg.title).toMatch(/Branch/i);
  });

  it('maps office finance role to action with review chips', () => {
    const cfg = getWorkspaceZoneConfig({
      roleKey: 'finance_manager',
      permissions: ['finance.view', 'accounting.desk.view', 'hr.directory.view', 'dashboard.view'],
    });
    expect(cfg.defaultZone).toBe('action');
    expect(cfg.actionChips.some((c) => c.id === 'approvals' || c.id === 'review')).toBe(true);
    expect(cfg.apps.some((a) => a.path.includes('account'))).toBe(true);
  });

  it('filters apps by module permissions', () => {
    const noPerms = getWorkspaceZoneConfig({ roleKey: 'finance_manager', permissions: [] });
    expect(noPerms.apps.some((a) => a.path.includes('account'))).toBe(false);
    const wildcard = getWorkspaceZoneConfig({ roleKey: 'finance_manager', permissions: ['*'] });
    expect(wildcard.apps.some((a) => a.path.includes('account'))).toBe(true);
    const staffHr = getWorkspaceZoneConfig({ roleKey: 'sales_staff', permissions: ['hr.self'] });
    expect(staffHr.apps.some((a) => a.path === '/my-profile')).toBe(true);
  });

  it('maps executive to activity with high_value chip', () => {
    const cfg = getWorkspaceZoneConfig({ roleKey: 'md' });
    expect(cfg.defaultZone).toBe('activity');
    expect(cfg.actionChips.some((c) => c.id === 'high_value')).toBe(true);
    expect(cfg.title).toMatch(/Executive/i);
  });

  it('actionChipToTaskTab returns real queue tab ids', () => {
    const tabIds = new Set(TASK_QUEUE_TABS.map((t) => t.id));
    expect(actionChipToTaskTab('overdue')).toBe('overdue');
    expect(actionChipToTaskTab('branch_pulse')).toBe('waiting');
    expect(actionChipToTaskTab('unknown')).toBe('needs_action');
    for (const chip of ['endorsements', 'team_requests', 'incidents', 'review', 'approvals', 'conversions', 'high_value', 'overdue', 'branch_pulse']) {
      expect(tabIds.has(actionChipToTaskTab(chip))).toBe(true);
    }
  });

  it('ACTION_TABS is the task-queue tab set (single source of truth)', () => {
    expect(ACTION_TABS).toBe(TASK_QUEUE_TABS);
  });

  it('workItemMatchesActionChip narrows content by chip', () => {
    const incident = { documentType: 'incident_report', title: 'Missing coil' };
    const expense = { documentType: 'expense_support', documentClass: 'request' };
    const approval = { requiresApproval: true, documentType: 'general' };
    expect(workItemMatchesActionChip(incident, 'incidents')).toBe(true);
    expect(workItemMatchesActionChip(expense, 'incidents')).toBe(false);
    expect(workItemMatchesActionChip(expense, 'conversions')).toBe(true);
    expect(workItemMatchesActionChip(approval, 'approvals')).toBe(true);
    expect(workItemMatchesActionChip(expense, 'approvals')).toBe(false);
    expect(workItemMatchesActionChip(expense, null)).toBe(true);
    expect(workItemMatchesActionChip(expense, 'branch_pulse')).toBe(false);
    expect(workItemMatchesActionChip({ status: 'waiting' }, 'branch_pulse')).toBe(true);
    expect(workItemMatchesActionChip({ priority: 'high' }, 'high_value')).toBe(true);
    expect(workItemMatchesActionChip({ amountNgn: 1500000 }, 'high_value')).toBe(true);
    expect(workItemMatchesActionChip({ documentType: 'payment_request' }, 'finance')).toBe(true);
  });

  it('isValidWorkspaceZone accepts the five zones only', () => {
    for (const z of WORKSPACE_ZONES) expect(isValidWorkspaceZone(z.id)).toBe(true);
    expect(isValidWorkspaceZone('desk')).toBe(false);
    expect(isValidWorkspaceZone('')).toBe(false);
  });

  it('getWorkspaceZoneLabel covers all zone ids', () => {
    for (const z of WORKSPACE_ZONES) {
      expect(getWorkspaceZoneLabel(z.id)).toBe(z.label);
    }
    expect(getWorkspaceZoneLabel('nope')).toBe('nope');
  });
});
