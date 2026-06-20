import { describe, expect, it } from 'vitest';
import { buildUserProfileActions, buildUserProfileNav } from './userProfileActions.js';
import { HR_SELF_SERVICE_PATH } from './hrSelfServiceRoutes.js';

describe('buildUserProfileActions', () => {
  it('keeps account actions on /me', () => {
    const actions = buildUserProfileActions({ permissions: [], cohort: 'account_only', hasHrSelfService: false });
    expect(actions.find((a) => a.id === 'account-security')?.to).toBe('/me/account');
  });

  it('routes HR self-service actions to /my-profile', () => {
    const actions = buildUserProfileActions({
      permissions: ['hr.self', 'hr.my_leave.request', 'hr.my_loan.request', 'hr.my_documents.view', 'hr.my_payslip.view'],
      cohort: 'employee',
      hasHrSelfService: true,
    });
    const paths = actions.filter((a) => a.category === 'self_service').map((a) => a.to);
    expect(paths).toContain(HR_SELF_SERVICE_PATH.timeOff);
    expect(paths).toContain(HR_SELF_SERVICE_PATH.loans);
    expect(paths).toContain(HR_SELF_SERVICE_PATH.documents);
    expect(paths).toContain(HR_SELF_SERVICE_PATH.payslips);
    expect(paths).toContain(HR_SELF_SERVICE_PATH.employment);
    expect(paths.every((p) => p.startsWith('/my-profile'))).toBe(true);
  });

  it('routes scholarship actions to /my-profile', () => {
    const actions = buildUserProfileActions({
      permissions: ['hr.self', 'hr.my_documents.view'],
      cohort: 'scholarship',
      hasHrSelfService: true,
    });
    expect(actions.find((a) => a.id === 'school-profile')?.to).toBe(HR_SELF_SERVICE_PATH.school);
    expect(actions.find((a) => a.id === 'scholarship-payments')?.to).toBe(HR_SELF_SERVICE_PATH.payments);
    expect(actions.find((a) => a.id === 'scholarship-requests')?.to).toBe(HR_SELF_SERVICE_PATH.requests);
    expect(actions.find((a) => a.id === 'upload-document')?.to).toBe(HR_SELF_SERVICE_PATH.documents);
  });
});

describe('buildUserProfileNav', () => {
  it('shows account hub tabs only (HR area uses hub switcher)', () => {
    const nav = buildUserProfileNav('employee', true);
    expect(nav.map((n) => n.to)).toEqual(['/me', '/me/account', '/me/services']);
  });

  it('omits HR link when user has no HR self-service', () => {
    const nav = buildUserProfileNav('account_only', false);
    expect(nav.map((n) => n.to)).toEqual(['/me', '/me/account', '/me/services']);
  });
});
