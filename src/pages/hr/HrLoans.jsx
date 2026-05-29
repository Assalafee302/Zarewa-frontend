import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HrLoanApplicationForm } from '../../components/hr/HrLoanApplicationForm';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  canGmApproveHrRequests,
  canManageHrStaff,
  canReviewHrRequests,
} from '../../lib/hrAccess';

export default function HrLoans() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];

  const allowedScopes = useMemo(() => {
    const scopes = [];
    if (canReviewHrRequests(perms)) scopes.push('hr_queue');
    if (canGmApproveHrRequests(perms)) scopes.push('gm_queue');
    scopes.push('all');
    return scopes;
  }, [perms]);

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        Staff apply for loans from{' '}
        <Link to="/my-profile/loans" className="font-semibold text-[#134e4a] hover:underline">
          My profile → My loans
        </Link>{' '}
        (when self-service is enabled). HR can originate applications here and track approvals below.
      </p>

      {canManageHrStaff(perms) ? <HrLoanApplicationForm /> : null}

      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Loan requests</h3>
        <HrRequestsPanel
          allowedScopes={allowedScopes}
          defaultScope={allowedScopes[0] || 'all'}
          kindFilter="loan"
        />
      </section>
    </div>
  );
}
