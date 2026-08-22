import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { canReviewHrRequests } from '../../lib/hrAccess';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';

const SCHOLARSHIP_REQUEST_KINDS = ['scholarship_profile_update', 'scholarship_fee_request'];

export default function ExecutiveHrScholarshipRequests({ compact = false }) {
  const ws = useWorkspace();
  const allowedScopes = useMemo(() => {
    const perms = ws?.permissions || [];
    const scopes = [];
    if (canReviewHrRequests(perms)) scopes.push('hr_queue');
    scopes.push('all');
    return scopes;
  }, [ws?.permissions]);

  return (
    <div className="space-y-4">
      {compact ? (
        <p className="text-sm text-slate-600">{FAMILY_BENEFITS.adminRequestsHint}</p>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-ui-xs font-medium text-slate-500">{FAMILY_BENEFITS.adminRequestsEyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{FAMILY_BENEFITS.adminRequestsTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {FAMILY_BENEFITS.adminRequestsHint}{' '}
            <Link
              to="/chairman?tab=scholarships&benefitsTab=school-fees"
              className="font-medium text-slate-800 underline underline-offset-2"
            >
              Chairman Office → School fees
            </Link>
            .
          </p>
        </div>
      )}
      <HrRequestsPanel
        allowedScopes={allowedScopes}
        defaultScope="hr_queue"
        kindsInclude={SCHOLARSHIP_REQUEST_KINDS}
        staffLinkBase={HR_EMPLOYEES}
        hideKindFilter
      />
    </div>
  );
}
