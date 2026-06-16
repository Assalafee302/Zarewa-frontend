import React, { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import HrRequestsOverview from '../../components/hr/HrRequestsOverview';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { ProfileOverviewSection } from '../../components/profile/profileOverviewUi';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import {
  canEndorseBranchHr,
  canGmApproveHrRequests,
  canReviewHrRequests,
} from '../../lib/hrAccess';

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'queue', label: 'Pending queue' },
  { id: 'leave', label: 'Leave' },
  { id: 'loans', label: 'Loans' },
  { id: 'all', label: 'All requests' },
];

function SubViewPills({ views, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
            active === v.id ? 'bg-teal-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

export default function HrRequests() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const scopeParam = searchParams.get('scope') || '';
  const viewParam = searchParams.get('view') || 'overview';
  const view = VIEWS.some((v) => v.id === viewParam) ? viewParam : 'overview';

  const canReview = canReviewHrRequests(perms);
  const canEndorse = canEndorseBranchHr(perms);
  const canGm = canGmApproveHrRequests(perms);

  const allowedScopes = useMemo(() => {
    const scopes = [];
    if (canReview) scopes.push('hr_queue');
    if (canEndorse) scopes.push('endorse_queue');
    if (canGm) scopes.push('gm_queue');
    scopes.push('all');
    return scopes;
  }, [canReview, canEndorse, canGm]);

  const defaultScope = useMemo(() => {
    if (scopeParam && allowedScopes.includes(scopeParam)) return scopeParam;
    return allowedScopes[0] || 'all';
  }, [scopeParam, allowedScopes]);

  const setViewAndUrl = useCallback(
    (nextView, extra = {}) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('view', nextView);
        if (extra.scope) next.set('scope', extra.scope);
        else if (nextView === 'overview') next.delete('scope');
        if (extra.clearRequestId) next.delete('requestId');
        return next;
      });
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (requestId && view === 'overview') {
      setViewAndUrl('queue', { scope: scopeParam || defaultScope });
    }
  }, [requestId, view, scopeParam, defaultScope, setViewAndUrl]);

  const queueIntro =
    'Workflow: employee submits → HR review → branch manager endorsement → GM HR final approval. Rejected requests stop at the deciding stage.';

  return (
    <HrPageBody>
      <HrPageIntro
        title="Leave & loan requests"
        description="Unified queue for leave and loan approvals — same four-step chain used on My Profile and Team HR endorsements."
      />

      <SubViewPills views={VIEWS} active={view} onChange={(id) => setViewAndUrl(id, { clearRequestId: id === 'overview' })} />

      {view === 'overview' ? (
        <ProfileOverviewSection title="Pending counts" subtitle="Click a tile to open that queue">
          <HrRequestsOverview canReview={canReview} canEndorse={canEndorse} canGm={canGm} />
        </ProfileOverviewSection>
      ) : null}

      {view === 'queue' ? (
        <ProfileOverviewSection title="Pending queue" subtitle={queueIntro}>
          <HrRequestsPanel
            allowedScopes={allowedScopes}
            defaultScope={defaultScope}
            staffLinkBase={HR_EMPLOYEES}
            focusRequestId={requestId}
            showStageBar
          />
        </ProfileOverviewSection>
      ) : null}

      {view === 'leave' ? (
        <ProfileOverviewSection title="Leave requests" subtitle={queueIntro}>
          <HrRequestsPanel
            allowedScopes={allowedScopes}
            defaultScope={defaultScope}
            kindFilter="leave"
            hideKindFilter
            staffLinkBase={HR_EMPLOYEES}
            focusRequestId={requestId}
            showStageBar
          />
        </ProfileOverviewSection>
      ) : null}

      {view === 'loans' ? (
        <ProfileOverviewSection title="Loan requests" subtitle={queueIntro}>
          <HrRequestsPanel
            allowedScopes={allowedScopes}
            defaultScope={defaultScope}
            kindFilter="loan"
            hideKindFilter
            staffLinkBase={HR_EMPLOYEES}
            focusRequestId={requestId}
            showStageBar
          />
        </ProfileOverviewSection>
      ) : null}

      {view === 'all' ? (
        <ProfileOverviewSection title="All requests" subtitle="Full history and open items across kinds">
          <HrRequestsPanel
            allowedScopes={allowedScopes}
            defaultScope={defaultScope}
            staffLinkBase={HR_EMPLOYEES}
            focusRequestId={requestId}
            showStageBar
          />
        </ProfileOverviewSection>
      ) : null}
    </HrPageBody>
  );
}
