import { describe, expect, it } from 'vitest';
import { isGenericStaffRoleLabel, staffPrintName, voucherRecordedByLabel } from './staffPrintName.js';

describe('staffPrintName', () => {
  it('prefers the login display name over a role fallback', () => {
    expect(staffPrintName({ displayName: 'Hauwa Bello', roleLabel: 'Cashier' }, 'Cashier')).toBe(
      'Hauwa Bello'
    );
  });

  it('does not treat a role-title display name as the person', () => {
    expect(staffPrintName({ displayName: 'Cashier', roleLabel: 'Cashier' }, 'Cashier')).toBe('Cashier');
  });
});

describe('voucherRecordedByLabel', () => {
  it('uses the stored ledger actor when it is a person name', () => {
    expect(
      voucherRecordedByLabel(
        { createdByName: 'Auwal Idris' },
        { displayName: 'Hauwa Bello', roleLabel: 'Cashier' },
        'Cashier'
      )
    ).toBe('Auwal Idris');
  });

  it('skips a stored Cashier role title and uses the current person name', () => {
    expect(
      voucherRecordedByLabel(
        { createdByName: 'Cashier' },
        { displayName: 'Hauwa Bello', roleLabel: 'Cashier' },
        'Cashier'
      )
    ).toBe('Hauwa Bello');
  });
});

describe('isGenericStaffRoleLabel', () => {
  it('flags cashier and sales role titles', () => {
    expect(isGenericStaffRoleLabel('Cashier')).toBe(true);
    expect(isGenericStaffRoleLabel('Sales')).toBe(true);
    expect(isGenericStaffRoleLabel('Hauwa Bello')).toBe(false);
  });
});
