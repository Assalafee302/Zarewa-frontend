import { describe, it, expect } from 'vitest';
import { formToSelfServiceProfilePatch } from './hrStaff.js';

describe('formToSelfServiceProfilePatch', () => {
  it('includes nextOfKin object for save progress', () => {
    const patch = formToSelfServiceProfilePatch({
      firstName: 'Douglas',
      surname: 'Yakubu',
      nextOfKinName: 'Mary Yakubu',
      nextOfKinPhone: '08030001234',
      nextOfKinRelationship: 'Spouse',
      nextOfKinAddress: 'Kaduna',
      nextOfKinAltPhone: '',
    });

    expect(patch.nextOfKin).toEqual({
      name: 'Mary Yakubu',
      phone: '08030001234',
      relationship: 'Spouse',
      address: 'Kaduna',
      altPhone: null,
    });
    expect(patch.nextOfKinName).toBeUndefined();
  });
});
