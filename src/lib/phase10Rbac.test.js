import { describe, expect, it } from 'vitest';
import { canAccessModuleWithPermissions } from './moduleAccess.js';
import {
  canAccessExecutiveHr,
  canAccessMainHrWorkspace,
  canEditLeavePolicy,
  canViewHrOrgStructure,
  canViewHrSettings,
} from './hrAccess.js';
import { userMayViewAccountingDeskClient, userMayViewCashierDeskClient } from './financeDeskAccess.js';

describe('Phase 10 RBAC', () => {
  it('MD with payroll MD approve only sees executive HR not main HR', () => {
    const mdPerms = ['hr.executive.view', 'hr.payroll.md_approve', 'exec.dashboard.view'];
    expect(canAccessMainHrWorkspace(mdPerms)).toBe(false);
    expect(canAccessModuleWithPermissions(mdPerms, 'hr')).toBe(false);
    expect(canAccessExecutiveHr(mdPerms)).toBe(true);
    expect(canAccessModuleWithPermissions(mdPerms, 'executive_hr')).toBe(true);
    expect(canEditLeavePolicy(mdPerms)).toBe(true);
    expect(canViewHrSettings(mdPerms)).toBe(true);
  });

  it('HR admin sees main HR module', () => {
    expect(canAccessMainHrWorkspace(['hr.staff.manage'])).toBe(true);
    expect(canAccessModuleWithPermissions(['hr.directory.view'], 'hr')).toBe(true);
    expect(canViewHrOrgStructure(['hr.directory.view'])).toBe(true);
    expect(canViewHrSettings(['hr.directory.view'])).toBe(true);
  });

  it('branch manager cannot access main HR or accounting desk', () => {
    expect(canAccessModuleWithPermissions(['hr.team.view'], 'hr')).toBe(false);
    expect(canAccessModuleWithPermissions(['hr.team.view'], 'team_hr')).toBe(true);
    expect(userMayViewAccountingDeskClient('sales_manager', ['finance.approve'])).toBe(false);
  });

  it('cashier desk vs accounting desk segregation', () => {
    expect(userMayViewCashierDeskClient('cashier', [])).toBe(true);
    expect(userMayViewAccountingDeskClient('cashier', ['finance.view'])).toBe(false);
    expect(userMayViewAccountingDeskClient('finance_manager', ['accounting.desk.view'])).toBe(true);
  });

  it('staff can access my profile module only', () => {
    expect(canAccessModuleWithPermissions(['hr.self'], 'my_profile_hr')).toBe(true);
    expect(canAccessModuleWithPermissions(['hr.self'], 'hr')).toBe(false);
  });

  it('CEO sees main HR, executive HR, and scholarship registers', () => {
    const ceoPerms = [
      'exec.dashboard.view',
      'hr.executive.view',
      'hr.executive.benefits.view',
      'hr.executive.benefits.manage',
      'hr.chairman.manage',
      'hr.directory.view',
      'hr.staff.manage',
      'hr.reports.view',
    ];
    expect(canAccessMainHrWorkspace(ceoPerms)).toBe(true);
    expect(canAccessModuleWithPermissions(ceoPerms, 'hr')).toBe(true);
    expect(canAccessExecutiveHr(ceoPerms)).toBe(true);
    expect(canAccessModuleWithPermissions(ceoPerms, 'executive_hr')).toBe(true);
  });
});
