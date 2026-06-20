import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { canEndorseBranchHr, canGmApproveHrRequests, canReviewHrRequests } from '../../lib/hrAccess';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrRequestsPanel } from './HrRequestsPanel';
import { HrCard } from './hrPageUi';

/**
 * Inline leave approval on employee profile — no hop to Time & absence hub.
 */
export function HrStaffLeaveActionsPanel({ userId }) {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const canReview = canReviewHrRequests(perms);
  const canEndorse = canEndorseBranchHr(perms);
  const canGm = canGmApproveHrRequests(perms);

  if (!userId || (!canReview && !canEndorse && !canGm)) return null;

  const scopes = [];
  if (canReview) scopes.push('hr_queue');
  if (canEndorse) scopes.push('endorse_queue');
  if (canGm) scopes.push('gm_queue');

  return (
    <HrCard title="Pending leave — review here" subtitle="Approve or reject without leaving this profile">
      <HrRequestsPanel
        allowedScopes={scopes}
        defaultScope={scopes[0]}
        kindFilter="leave"
        staffUserId={userId}
        hideKindFilter
        staffLinkBase={HR_EMPLOYEES}
        compact
        showStageBar
      />
    </HrCard>
  );
}
