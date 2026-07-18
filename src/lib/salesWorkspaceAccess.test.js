import { describe, expect, it } from 'vitest';
import { canEditCuttingList, canEditCuttingListAfterProduction } from './salesWorkspaceAccess.js';

describe('canEditCuttingList after production', () => {
  const finished = {
    id: 'CL-1',
    productionEditLocked: true,
    productionRegistered: true,
    status: 'Finished',
  };

  it('allows admin and MD to edit finished cutting lists', () => {
    expect(canEditCuttingListAfterProduction('admin')).toBe(true);
    expect(canEditCuttingListAfterProduction('md')).toBe(true);
    expect(canEditCuttingList(finished, null, 'admin')).toBe(true);
    expect(canEditCuttingList(finished, null, 'md')).toBe(true);
  });

  it('blocks other roles after production is finished', () => {
    expect(canEditCuttingListAfterProduction('sales_staff')).toBe(false);
    expect(canEditCuttingList(finished, null, 'sales_staff')).toBe(false);
    expect(canEditCuttingList(finished, null, null)).toBe(false);
  });

  it('still blocks everyone while the linked job is Running', () => {
    expect(canEditCuttingList(finished, { status: 'Running' }, 'admin')).toBe(false);
  });
});
