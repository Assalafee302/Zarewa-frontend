import { describe, expect, it } from 'vitest';
import {
  defaultHomePathForDepartment,
  pathToModuleKey,
  resolvePostLoginPath,
} from './departmentWorkspace.js';

describe('departmentWorkspace routing', () => {
  it('maps cashier home to finance module', () => {
    expect(defaultHomePathForDepartment('cashier')).toBe('/accounts');
    expect(pathToModuleKey('/accounts?tab=desk')).toBe('finance');
    expect(pathToModuleKey('/cashier')).toBe('finance');
  });

  it('prefers role desk over office.use on post-login', () => {
    const withOffice = ['office.use', 'operations.view', 'operations.manage', 'dashboard.view'];
    expect(resolvePostLoginPath({ roleKey: 'operations_officer' }, withOffice)).toBe('/operations');
    expect(
      resolvePostLoginPath({ roleKey: 'sales_manager' }, ['office.use', 'sales.view', 'sales.manage', 'dashboard.view'])
    ).toBe('/manager');
    expect(
      resolvePostLoginPath({ roleKey: 'finance_manager' }, [
        'office.use',
        'finance.view',
        'finance.post',
        'accounting.desk.view',
        'dashboard.view',
      ])
    ).toBe('/accounting');
    expect(
      resolvePostLoginPath({ roleKey: 'cashier' }, ['office.use', 'finance.view', 'finance.pay', 'dashboard.view'])
    ).toBe('/accounts');
  });
});
