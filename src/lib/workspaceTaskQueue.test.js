import { describe, it, expect } from 'vitest';
import {
  workItemMatchesTaskQueueTab,
  workItemIsWaitingOnOthers,
  workItemIsReturnedToUser,
  countTaskQueueTabs,
} from './workspaceTaskQueue.js';

const ctx = { userId: 'u1', roleKey: 'sales_staff', permissions: ['office.use'] };

describe('workspaceTaskQueue', () => {
  it('needs_action tab', () => {
    const item = {
      id: '1',
      requiresApproval: true,
      responsibleUserId: 'u1',
      visibility: [{ visibilityKind: 'user_id', visibilityValue: 'u1' }],
      senderUserId: 'u1',
    };
    expect(workItemMatchesTaskQueueTab(item, 'needs_action', ctx)).toBe(true);
  });

  it('returned tab', () => {
    const item = {
      id: '2',
      status: 'returned_for_info',
      senderUserId: 'u1',
      visibility: [{ visibilityKind: 'user_id', visibilityValue: 'u1' }],
    };
    expect(workItemIsReturnedToUser(item, 'u1')).toBe(true);
    expect(workItemMatchesTaskQueueTab(item, 'returned', ctx)).toBe(true);
  });

  it('waiting on others', () => {
    const item = {
      id: '3',
      status: 'submitted',
      requiresApproval: true,
      responsibleUserId: 'u2',
      visibility: [{ visibilityKind: 'user_id', visibilityValue: 'u1' }],
      senderUserId: 'u1',
    };
    expect(workItemIsWaitingOnOthers(item, 'u1')).toBe(true);
  });

  it('counts tabs', () => {
    const items = [
      { id: 'a', requiresApproval: true, responsibleUserId: 'u1', visibility: [{ visibilityKind: 'user_id', visibilityValue: 'u1' }], senderUserId: 'u1' },
      { id: 'b', status: 'closed', requiresApproval: false, requiresResponse: false, visibility: [{ visibilityKind: 'user_id', visibilityValue: 'u1' }], senderUserId: 'u1' },
    ];
    const c = countTaskQueueTabs(items, ctx);
    expect(c.needs_action).toBeGreaterThanOrEqual(1);
    expect(c.completed).toBeGreaterThanOrEqual(1);
  });
});
