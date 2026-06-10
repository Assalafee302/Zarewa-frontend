import { describe, expect, it } from 'vitest';
import { defaultHomePathForDepartment, pathToModuleKey } from './departmentWorkspace.js';

describe('departmentWorkspace routing', () => {
  it('maps cashier home to finance module', () => {
    expect(defaultHomePathForDepartment('cashier')).toBe('/accounts');
    expect(pathToModuleKey('/accounts?tab=desk')).toBe('finance');
    expect(pathToModuleKey('/cashier')).toBe('finance');
  });
});
