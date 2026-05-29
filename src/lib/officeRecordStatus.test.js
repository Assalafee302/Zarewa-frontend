import { describe, it, expect } from 'vitest';
import { officeRecordStatusBadges, officeRecordNextActorLabel } from './officeRecordStatus.js';

describe('officeRecordStatus', () => {
  it('maps submitted status', () => {
    const b = officeRecordStatusBadges({ status: 'submitted' });
    expect(b.primary.label).toBe('Submitted');
  });

  it('shows overdue secondary badge', () => {
    const b = officeRecordStatusBadges({ status: 'open', overdue: true });
    expect(b.secondary?.label).toBe('Overdue');
  });

  it('next actor label', () => {
    expect(officeRecordNextActorLabel({}, 'Branch Manager')).toMatch(/Branch Manager/);
  });
});
