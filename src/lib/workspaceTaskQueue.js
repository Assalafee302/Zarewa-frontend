import { workItemNeedsActionForUser, workItemIsFiledTrayItem } from './workspaceInboxBuckets.js';
import { workItemShowsOnWorkspaceUnifiedInbox } from './workItemPersonalInbox.js';

export const TASK_QUEUE_TABS = [
  { id: 'needs_action', label: 'Needs My Action' },
  { id: 'waiting', label: 'Waiting on Others' },
  { id: 'returned', label: 'Returned to Me' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
];

/**
 * @param {object} item
 * @param {string} userId
 */
export function workItemIsReturnedToUser(item, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return false;
  const st = String(item?.status || '').toLowerCase();
  if (!/return|needs.?more|more.?info/.test(st)) return false;
  const sender = String(item?.senderUserId || '').trim();
  const assignee = String(item?.responsibleUserId || '').trim();
  return sender === uid || assignee === uid;
}

/**
 * @param {object} item
 * @param {string} userId
 */
export function workItemIsWaitingOnOthers(item, userId) {
  const uid = String(userId || '').trim();
  if (workItemNeedsActionForUser(item, uid)) return false;
  if (workItemIsFiledTrayItem(item)) return false;
  if (workItemIsReturnedToUser(item, uid)) return false;
  const st = String(item?.status || '').toLowerCase();
  if (/^(closed|cancelled|completed|converted)$/.test(st)) return false;
  return Boolean(item?.requiresApproval || item?.requiresResponse || st === 'open' || st === 'submitted');
}

/**
 * @param {object} item
 */
export function workItemIsOverdueTab(item) {
  return item?.slaState === 'overdue' || Boolean(item?.overdue);
}

/**
 * @param {object} item
 */
export function workItemIsCompletedTab(item) {
  if (workItemIsFiledTrayItem(item)) return true;
  const st = String(item?.status || '').toLowerCase();
  return /^(approved|paid|filed|closed|completed|converted)$/.test(st);
}

/**
 * @param {object} item
 * @param {string} tabId
 * @param {{ userId: string; roleKey?: string; permissions?: string[] }} inboxCtx
 */
export function workItemMatchesTaskQueueTab(item, tabId, inboxCtx) {
  if (!workItemShowsOnWorkspaceUnifiedInbox(item, inboxCtx)) return false;
  const uid = inboxCtx.userId;
  switch (tabId) {
    case 'needs_action':
      return workItemNeedsActionForUser(item, uid);
    case 'waiting':
      return workItemIsWaitingOnOthers(item, uid);
    case 'returned':
      return workItemIsReturnedToUser(item, uid);
    case 'overdue':
      return workItemIsOverdueTab(item) && !workItemIsCompletedTab(item);
    case 'completed':
      return workItemIsCompletedTab(item);
    default:
      // Unknown tab ids must not show the full inbox.
      return false;
  }
}

export function isValidTaskQueueTab(tabId) {
  return TASK_QUEUE_TABS.some((t) => t.id === tabId);
}

/**
 * @param {object[]} items
 * @param {{ userId: string; roleKey?: string; permissions?: string[] }} inboxCtx
 */
export function countTaskQueueTabs(items, inboxCtx) {
  const counts = {};
  for (const tab of TASK_QUEUE_TABS) {
    counts[tab.id] = items.filter((item) => workItemMatchesTaskQueueTab(item, tab.id, inboxCtx)).length;
  }
  return counts;
}
