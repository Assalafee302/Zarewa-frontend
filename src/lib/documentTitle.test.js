import { describe, expect, it } from 'vitest';
import { DOCUMENT_TITLE_BASE, documentTitleForPath } from './documentTitle.js';

describe('documentTitleForPath', () => {
  it('maps core modules', () => {
    expect(documentTitleForPath('/')).toContain('Operations dashboard');
    expect(documentTitleForPath('/sales')).toContain('Sales');
    expect(documentTitleForPath('/procurement')).toContain('Procurement');
    expect(documentTitleForPath('/operations')).toContain('Store & production');
    expect(documentTitleForPath('/accounts')).toContain('Finance & accounts');
    expect(documentTitleForPath('/reports')).toContain('Reports');
    expect(documentTitleForPath('/edit-approvals')).toContain('Edit approvals');
    expect(documentTitleForPath('/manager')).toContain('Management');
  });

  it('strips trailing slashes', () => {
    expect(documentTitleForPath('/sales/')).toBe(documentTitleForPath('/sales'));
  });

  it('treats legacy /deliveries like production workspace', () => {
    expect(documentTitleForPath('/deliveries')).toContain('Store & production');
  });

  it('maps HR module paths', () => {
    expect(documentTitleForPath('/hr/dashboard')).toContain('Human Resources');
    expect(documentTitleForPath('/hr/staff/usr-1')).toContain('Staff profile');
    expect(documentTitleForPath('/my-profile/overview')).toContain('My profile');
    expect(documentTitleForPath('/me/security')).toContain('Security');
    expect(documentTitleForPath('/team-hr/staff')).toContain('Team HR');
  });

  it('uses page-not-found title for removed accounting paths', () => {
    expect(documentTitleForPath('/accounting/ledger')).toMatch(/page not found/i);
  });

  it('maps settings sections', () => {
    expect(documentTitleForPath('/settings/profile')).toContain('Profile');
    expect(documentTitleForPath('/settings/governance')).toContain('Governance');
    expect(documentTitleForPath('/settings/data')).toContain('Master data');
  });

  it('includes base suffix', () => {
    expect(documentTitleForPath('/')).toContain(DOCUMENT_TITLE_BASE);
  });

  it('uses page-not-found title for unknown paths', () => {
    expect(documentTitleForPath('/no-such-route-zarewa')).toMatch(/page not found/i);
  });
});
