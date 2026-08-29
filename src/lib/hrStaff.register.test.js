import { describe, it, expect } from 'vitest';
import { formToRegisterBody } from './hrStaff';

describe('formToRegisterBody', () => {
  it('omits username and password for a new login — server generates on register', () => {
    const body = formToRegisterBody({
      username: 'new.staff',
      displayName: 'New Staff',
      password: 'Zarewa@123',
      roleKey: 'sales_staff',
      employeeNo: 'ZAPKD001',
      payrollGroup: 'branch_ops',
    });
    expect(body.existingUserId).toBeUndefined();
    expect(body.username).toBeUndefined();
    expect(body.password).toBeUndefined();
    expect(body.employeeNo).toBe('ZAPKD001');
  });

  it('attaches an existing login without sending a password', () => {
    const body = formToRegisterBody({
      existingUserId: 'USR-1',
      username: 'store.keeper',
      displayName: 'Store Keeper',
      password: 'should-not-send',
      roleKey: 'operations_officer',
      employeeNo: 'ZAPKD610',
      payrollGroup: 'branch_ops',
      jobTitle: 'Store keeper',
    });
    expect(body.existingUserId).toBe('USR-1');
    expect(body.username).toBe('store.keeper');
    expect(body.password).toBeUndefined();
    expect(body.employeeNo).toBe('ZAPKD610');
  });
});
