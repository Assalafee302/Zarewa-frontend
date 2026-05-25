import { categoryForWorkItem } from './workspaceCategoryRegistry.js';
import { workItemNeedsActionForUser } from './workspaceInboxBuckets.js';
import { workItemShowsInUnfiledTray } from './workspaceInboxBuckets.js';
import { normalizeWorkItem } from './workspaceWorkItemModel.js';

/**
 * Compute command-center intelligence from visible work items.
 * @param {object} params
 * @param {Record<string, unknown>[]} params.items
 * @param {string} params.userId
 * @param {{ userId: string, roleKey?: string, permissions?: string[] }} params.inboxCtx
 * @param {object|null} [params.officeSummary]
 * @param {boolean} [params.canMonitor]
 */
export function computeWorkspaceIntelligence({ items, userId, inboxCtx, officeSummary = null, canMonitor = false }) {
  const list = Array.isArray(items) ? items : [];
  const uid = String(userId || '').trim();

  const actionRequired = list.filter((item) => workItemNeedsActionForUser(item, uid));
  const overdue = actionRequired.filter((item) => item.slaState === 'overdue' || normalizeWorkItem(item, { userId: uid }).isOverdue);
  const pendingApprovals = actionRequired.filter((item) => item.requiresApproval);
  const pendingResponses = actionRequired.filter((item) => item.requiresResponse);
  const unfiled = list.filter((item) => workItemShowsInUnfiledTray(item, inboxCtx));

  const byCategory = {};
  for (const item of actionRequired) {
    const cat = categoryForWorkItem(item);
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  const financePending = actionRequired.filter((item) => categoryForWorkItem(item) === 'finance').length;
  const productionPending = actionRequired.filter((item) => categoryForWorkItem(item) === 'production').length;
  const procurementPending = actionRequired.filter((item) =>
    ['procurement', 'inventory'].includes(categoryForWorkItem(item))
  ).length;

  /** @type {{ id: string, label: string, description: string, priority: 'high'|'normal', view?: string, category?: string }[]} */
  const suggestions = [];

  if (overdue.length > 0) {
    suggestions.push({
      id: 'overdue',
      label: `Review ${overdue.length} overdue item${overdue.length === 1 ? '' : 's'}`,
      description: 'Items past their due date need immediate attention.',
      priority: 'high',
      view: 'needs_action',
    });
  }

  if (financePending > 0) {
    suggestions.push({
      id: 'finance',
      label: `Review ${financePending} finance item${financePending === 1 ? '' : 's'}`,
      description: 'Payment requests, refunds, or treasury items awaiting action.',
      priority: financePending >= 3 ? 'high' : 'normal',
      view: 'needs_action',
      category: 'finance',
    });
  }

  if (unfiled.length > 0) {
    suggestions.push({
      id: 'unfiled',
      label: `File ${unfiled.length} unfiled record${unfiled.length === 1 ? '' : 's'}`,
      description: 'Records missing filing reference or classification.',
      priority: 'normal',
      view: 'unfiled',
    });
  }

  if (officeSummary?.unreadApprox > 0) {
    suggestions.push({
      id: 'unread-memos',
      label: `Read ${officeSummary.unreadApprox} unread memo${officeSummary.unreadApprox === 1 ? '' : 's'}`,
      description: 'Internal memos with unread messages.',
      priority: 'normal',
      view: 'memos',
    });
  }

  if (productionPending > 0) {
    suggestions.push({
      id: 'production',
      label: `Follow up on ${productionPending} production item${productionPending === 1 ? '' : 's'}`,
      description: 'Production gates or shop-floor items need review.',
      priority: 'normal',
      view: 'needs_action',
      category: 'production',
    });
  }

  if (procurementPending > 0) {
    suggestions.push({
      id: 'procurement',
      label: `Check ${procurementPending} procurement item${procurementPending === 1 ? '' : 's'}`,
      description: 'Material, inventory, or procurement requests pending.',
      priority: 'normal',
      view: 'needs_action',
      category: 'procurement',
    });
  }

  const maintenanceFuel = list.filter((item) => {
    const sm = item.data?.smartMemo || item.data || {};
    const type = sm.memoType || '';
    return type === 'maintenance_repairs' || type === 'fuel_diesel';
  });
  if (maintenanceFuel.length > 0) {
    suggestions.push({
      id: 'maintenance-fuel',
      label: `Review ${maintenanceFuel.length} maintenance/fuel memo${maintenanceFuel.length === 1 ? '' : 's'}`,
      description: 'Generator, diesel, or repair requests may need approval.',
      priority: 'high',
      view: 'memos',
    });
  }

  if (actionRequired.length === 0) {
    suggestions.push({
      id: 'caught-up',
      label: 'You are all caught up',
      description: 'No items require your action right now.',
      priority: 'normal',
      view: 'needs_action',
    });
  }

  return {
    counts: {
      actionRequired: actionRequired.length,
      overdue: overdue.length,
      pendingApprovals: pendingApprovals.length,
      pendingResponses: pendingResponses.length,
      unfiled: unfiled.length,
      unreadMemos: officeSummary?.unreadApprox ?? 0,
      financePending,
      productionPending,
      procurementPending,
      totalVisible: list.length,
    },
    byCategory,
    suggestions: suggestions.slice(0, 6),
    canMonitor,
    priorities: {
      actionRequired: actionRequired.slice(0, 8).map((item) => normalizeWorkItem(item, { userId: uid })),
      overdue: overdue.slice(0, 5).map((item) => normalizeWorkItem(item, { userId: uid })),
    },
  };
}
