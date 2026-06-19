import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HrLoanApplicationForm } from '../../components/hr/HrLoanApplicationForm';
import { HrLegacyLoanMigrateForm } from '../../components/hr/HrLegacyLoanMigrateForm';
import { HrStaffPurchaseCreditQueue } from '../../components/hr/HrStaffPurchaseCreditQueue';
import { HrObligationAccountsPanel } from '../../components/hr/HrObligationAccountsPanel';
import { HrRecoveryObligationBackfillPanel } from '../../components/hr/HrRecoveryObligationBackfillPanel';
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
  const [legacyModalOpen, setLegacyModalOpen] = useState(false);
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
              HR services → Loans
            </Link>{' '}
            (when self-service is enabled). HR can originate applications here and track approvals below.
          </p>
        ) : (
          <p className="text-sm text-slate-600">Staff loan requests, approvals, and finance disbursement tracking.</p>
        )}
        {canManageHrStaff(ws?.permissions) ? (
          <div className="flex flex-wrap gap-2">
            <HrAddFormButton onClick={() => setLoanModalOpen(true)}>New staff loan</HrAddFormButton>
            <HrAddFormButton onClick={() => setLegacyModalOpen(true)}>Register legacy loan</HrAddFormButton>
          </div>
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

      <HrFormModal
        isOpen={legacyModalOpen}
        onClose={() => setLegacyModalOpen(false)}
        title="Register legacy staff loan"
        size="lg"
      >
        <HrLegacyLoanMigrateForm
          onSuccess={() => setLegacyModalOpen(false)}
          onCancel={() => setLegacyModalOpen(false)}
        />
      </HrFormModal>

      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Staff purchase credit (roof / materials)</h3>
        <HrStaffPurchaseCreditQueue />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Obligation ledger & repayments</h3>
        <p className="text-xs text-slate-600 max-w-2xl">
          View staff loan and purchase credit accounts and download PDFs. For loans and purchase credit, HR can post
          bulk bank repayments here. <strong>Discipline recoveries</strong> are paid at the branch cashier (Finance →
          Desk) — not through this ledger.
        </p>
        <HrObligationAccountsPanel />
        <HrRecoveryObligationBackfillPanel />
      </section>

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
