import React, { useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import {
  canEndorseBranchHr,
  canGmApproveHrRequests,
  canReviewHrRequests,
} from '../../lib/hrAccess';

export default function HrRequests() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];

  const allowedScopes = useMemo(() => {
    const scopes = [];
    if (canReviewHrRequests(perms)) scopes.push('hr_queue');
    if (canEndorseBranchHr(perms)) scopes.push('endorse_queue');
    if (canGmApproveHrRequests(perms)) scopes.push('gm_queue');
    scopes.push('all');
    return scopes;
  }, [perms]);

  const defaultScope = allowedScopes[0] || 'all';

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Review leave, loan, and other HR requests. Branch managers endorse before GM HR final approval on sensitive
        cases.
      </p>
      <HrRequestsPanel allowedScopes={allowedScopes} defaultScope={defaultScope} />
    </div>
  );
}
