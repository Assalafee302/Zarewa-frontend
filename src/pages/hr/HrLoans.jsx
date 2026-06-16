import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HrLoanApplicationForm } from '../../components/hr/HrLoanApplicationForm';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  canGmApproveHrRequests,
  canManageHrStaff,
  canReviewHrRequests,
} from '../../lib/hrAccess';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';

export default function HrLoans({ embedded = false } = {}) {
  const ws = useWorkspace();
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const allowedScopes = useMemo(() => {
    const perms = ws?.permissions || [];
    const scopes = [];
    if (canReviewHrRequests(perms)) scopes.push('hr_queue');
    if (canGmApproveHrRequests(perms)) scopes.push('gm_queue');
    scopes.push('all');
    return scopes;
  }, [ws?.permissions]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {!embedded ? (
          <p className="text-sm text-slate-600 max-w-2xl">
            Staff apply for loans from{' '}
            <Link to="/my-profile/loans" className="font-semibold text-[#134e4a] hover:underline">
              My profile → My loans
            </Link>{' '}
            (when self-service is enabled). HR can originate applications here and track approvals below.
          </p>
        ) : (
          <p className="text-sm text-slate-600">Staff loan requests, approvals, and finance disbursement tracking.</p>
        )}
        {canManageHrStaff(ws?.permissions) ? (
          <HrAddFormButton onClick={() => setLoanModalOpen(true)}>New staff loan</HrAddFormButton>
        ) : null}
      </div>

      <HrFormModal
        isOpen={loanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        title="New staff loan application"
        size="lg"
      >
        <HrLoanApplicationForm onSuccess={() => setLoanModalOpen(false)} onCancel={() => setLoanModalOpen(false)} />
      </HrFormModal>

      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Loan requests</h3>
        <HrRequestsPanel
          allowedScopes={allowedScopes}
          defaultScope={allowedScopes[0] || 'all'}
          kindFilter="loan"
          staffLinkBase={HR_EMPLOYEES}
        />
      </section>
    </div>
  );
}
