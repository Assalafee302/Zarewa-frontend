import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { canReviewHrRequests } from '../../lib/hrAccess';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';

const SCHOLARSHIP_REQUEST_KINDS = ['scholarship_profile_update', 'scholarship_fee_request'];

export default function ExecutiveHrScholarshipRequests() {
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
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">
          {FAMILY_BENEFITS.adminRequestsEyebrow}
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-900">{FAMILY_BENEFITS.adminRequestsTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {FAMILY_BENEFITS.adminRequestsHint}{' '}
          <Link to="/executive-hr/benefits?tab=school-fees" className="font-semibold text-violet-800 underline">
            Executive benefits → School fees
          </Link>
          .
        </p>
      </div>
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
