import { describe, expect, it } from 'vitest';
import { HR_SELF_SERVICE_PATH, LEGACY_ME_HR_REDIRECTS, hrSelfServicePathForTab } from './hrSelfServiceRoutes.js';

describe('hrSelfServiceRoutes', () => {
  it('maps completeness tabs to /my-profile paths', () => {
    expect(hrSelfServicePathForTab('documents')).toBe(HR_SELF_SERVICE_PATH.documents);
    expect(hrSelfServicePathForTab('employment')).toBe(HR_SELF_SERVICE_PATH.employment);
    expect(hrSelfServicePathForTab('policies')).toBe(HR_SELF_SERVICE_PATH.policies);
    expect(hrSelfServicePathForTab('school')).toBe(HR_SELF_SERVICE_PATH.school);
    expect(hrSelfServicePathForTab('unknown')).toBe(HR_SELF_SERVICE_PATH.documents);
  });

  it('defines legacy /me HR redirects to /my-profile', () => {
    expect(LEGACY_ME_HR_REDIRECTS['/me/leave']).toBe(HR_SELF_SERVICE_PATH.leave);
    expect(LEGACY_ME_HR_REDIRECTS['/me/school']).toBe(HR_SELF_SERVICE_PATH.school);
    expect(LEGACY_ME_HR_REDIRECTS['/me/payslips']).toBe(HR_SELF_SERVICE_PATH.payslips);
  });
});
