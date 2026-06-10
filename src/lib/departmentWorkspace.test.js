import { describe, expect, it } from 'vitest';
import { defaultHomePathForDepartment, pathToModuleKey } from './departmentWorkspace.js';

describe('departmentWorkspace routing', () => {
  it('maps cashier home with query string to finance module', () => {
    expect(defaultHomePathForDepartment('cashier')).toBe('/accounts?tab=desk');
    expect(pathToModuleKey('/accounts?tab=desk')).toBe('finance');
    expect(pathToModuleKey('/cashier')).toBe('finance');
  });
});
