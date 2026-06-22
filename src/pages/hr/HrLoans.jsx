import React, { useMemo, useState } from 'react';
import { HrLoanApplicationForm } from '../../components/hr/HrLoanApplicationForm';
import { HrLegacyLoanMigrateForm } from '../../components/hr/HrLegacyLoanMigrateForm';
import { HrStaffPurchaseCreditQueue } from '../../components/hr/HrStaffPurchaseCreditQueue';
import { HrStaffBulkSalesCustomerLink } from '../../components/hr/HrStaffBulkSalesCustomerLink';
import { HrObligationAccountsPanel } from '../../components/hr/HrObligationAccountsPanel';
import { HrRecoveryObligationBackfillPanel } from '../../components/hr/HrRecoveryObligationBackfillPanel';
import { HrRequestsPanel } from '../../components/hr/HrRequestsPanel';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HrLoansHubIntro, HrLoansHubTabs } from '../../components/hr/HrLoansHubTabs';
import { HrStaffCreditSummaryStrip } from '../../components/hr/HrStaffCreditSummaryStrip';
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <HrLoansHubIntro embedded={embedded} />
        {canManageHrStaff(ws?.permissions) ? (
          <div className="flex flex-wrap gap-2">
            <HrAddFormButton onClick={() => setLoanModalOpen(true)}>New staff loan</HrAddFormButton>
            <HrAddFormButton onClick={() => setLegacyModalOpen(true)}>Register legacy loan</HrAddFormButton>
          </div>
        ) : null}
      </div>

      <HrStaffCreditSummaryStrip />

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

      <HrLoansHubTabs>
        {(section) => (
          <>
            {section === 'requests' ? (
              <section className="space-y-3">
                <p className="text-xs text-slate-600">Approval queue for staff loan applications.</p>
                <p className="text-xs text-slate-500 max-w-2xl">
                  After GM HR final approval, the employee&apos;s branch cashier pays the loan from Finance → My desk.
                  Repayments by cash or bank (outside payroll) also go through that branch cashier.
                </p>
                <HrRequestsPanel
                  allowedScopes={allowedScopes}
                  defaultScope={allowedScopes[0] || 'all'}
                  kindFilter="loan"
                  staffLinkBase={HR_EMPLOYEES}
                  showStageBar
                />
              </section>
            ) : null}

            {section === 'obligations' ? (
              <section className="space-y-3">
                <p className="text-xs text-slate-600 max-w-2xl">
                  When staff pay cash or bank transfer (not payroll deduction), their branch cashier records it under{' '}
                  <strong>Finance → My desk → Staff payments</strong>. HQ and mining staff use Kaduna (HQ); domestic staff
                  use their host branch. Payroll deductions post automatically on locked runs — discipline recoveries are
                  paid at the branch cashier instead.
                </p>
                <HrObligationAccountsPanel />
                <HrRecoveryObligationBackfillPanel />
              </section>
            ) : null}

            {section === 'purchase-credit' ? (
              <section className="space-y-3">
                <p className="text-xs text-slate-600">Roofing and materials sold on staff credit via Sales quotations.</p>
                {canManageHrStaff(ws?.permissions) ? <HrStaffBulkSalesCustomerLink /> : null}
                <HrStaffPurchaseCreditQueue />
              </section>
            ) : null}
          </>
        )}
      </HrLoansHubTabs>
    </div>
  );
}
