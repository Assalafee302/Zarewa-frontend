import { describe, expect, it } from 'vitest';
import {
  profileNavFlatItems,
  profilePageMetaForPath,
  profileShellEyebrow,
} from './profileNavConfig.js';

describe('profileNavConfig', () => {
  it('merges overview into work and pay nav group', () => {
    const labels = profileNavFlatItems('employee').map((item) => item.label);
    expect(labels[0]).toBe('Overview');
    expect(labels).toContain('Time off');
    expect(labels).toContain('Loans & credit');
  });

  it('returns route-aware page meta for employee sections', () => {
    expect(profilePageMetaForPath('/my-profile/overview', 'employee').title).toBe('Overview');
    expect(profilePageMetaForPath('/my-profile/time-off', 'employee').title).toBe('Time off');
    expect(profilePageMetaForPath('/my-profile/loans', 'employee').title).toBe('Loans & credit');
    expect(profilePageMetaForPath('/my-profile/requests', 'employee').title).toBe('My requests');
  });

  it('uses cohort hub copy for scholarship and domestic routes', () => {
    expect(profilePageMetaForPath('/my-profile/school', 'scholarship').title).toBe('Overview');
    expect(profilePageMetaForPath('/my-profile/home', 'domestic').title).toBe('Overview');
    expect(profileShellEyebrow('scholarship')).toBe('My benefits');
    expect(profileShellEyebrow('domestic')).toBe('My pay');
    expect(profileShellEyebrow('employee')).toBe('My HR');
  });
});
