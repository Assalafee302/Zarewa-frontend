/**
 * Context hooks for Zare / AI assistants on the Workspace command center.
 */
import { sanitizeZarePageContext } from './workspaceSanitize.js';

/**
 * @param {object} params
 * @returns {Record<string, unknown>}
 */
export function buildWorkspaceAiContext({
  folder = 'needs_action',
  category = 'all',
  selectedWorkItem = null,
  selectedThreadId = null,
  userRole = '',
  branchScope = '',
  branchLabel = '',
  viewAllBranches = false,
  permissions = [],
  intelligence = null,
  canOffice = false,
  canMutate = true,
  degraded = false,
}) {
  return sanitizeZarePageContext({
    surface: 'workspace_command_center',
    folder,
    category,
    userRole: String(userRole || ''),
    branchScope: String(branchScope || ''),
    branchLabel: String(branchLabel || ''),
    viewAllBranches: Boolean(viewAllBranches),
    permissions: Array.isArray(permissions) ? permissions : [],
    canOffice: Boolean(canOffice),
    canMutate: Boolean(canMutate),
    degraded: Boolean(degraded),
    selectedWorkItem: selectedWorkItem
      ? {
          id: selectedWorkItem.id,
          referenceNo: selectedWorkItem.referenceNo,
          title: selectedWorkItem.title,
          documentType: selectedWorkItem.documentType,
          category: selectedWorkItem.category,
          status: selectedWorkItem.status,
          requiresApproval: selectedWorkItem.requiresApproval,
          requiresResponse: selectedWorkItem.requiresResponse,
          actionLabel: selectedWorkItem.actionLabel,
          linkedThreadId: selectedWorkItem.linkedThreadId,
          redacted: Boolean(selectedWorkItem.redacted),
          confidentiality: selectedWorkItem.confidentiality,
        }
      : null,
    selectedThreadId: selectedThreadId ? String(selectedThreadId) : null,
    counts: intelligence?.counts || null,
    suggestions: intelligence?.suggestions?.map((s) => s.label) || [],
    visibleActions: deriveVisibleActions({ selectedWorkItem, canOffice, canMutate, permissions }),
  });
}

/**
 * @param {object} params
 */
function deriveVisibleActions({ selectedWorkItem, canOffice, canMutate, permissions }) {
  const actions = [];
  if (canOffice && canMutate) actions.push('compose_memo');
  if (!selectedWorkItem) return actions;

  if (selectedWorkItem.requiresApproval && canMutate) actions.push('approve', 'reject');
  if (selectedWorkItem.requiresResponse && canMutate) actions.push('reply');
  if (selectedWorkItem.linkedThreadId && canOffice) actions.push('open_thread');
  if (permissions.includes('finance.approve') && selectedWorkItem.documentType === 'payment_request') {
    actions.push('review_payment_request');
  }
  return actions;
}
