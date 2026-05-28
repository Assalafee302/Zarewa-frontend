import { describe, expect, it } from 'vitest';
import {
  canAccessHrModule,
  canAccessMyProfileHr,
  canAccessTeamHr,
  canViewOrgSensitiveHr,
} from './hrAccess.js';

describe('hrAccess', () => {
  it('gates HR module vs team vs self-service', () => {
    expect(canAccessHrModule(['hr.staff.manage'])).toBe(true);
    expect(canAccessHrModule(['hr.team.view'])).toBe(false);
    expect(canAccessTeamHr(['hr.team.view'])).toBe(true);
    expect(canAccessMyProfileHr(['hr.self'])).toBe(true);
    expect(canViewOrgSensitiveHr(['hr.team.view'])).toBe(false);
    expect(canViewOrgSensitiveHr(['hr.payroll.view_sensitive'])).toBe(true);
  });
});
