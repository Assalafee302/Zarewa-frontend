import React, { useMemo, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useCreditExceptions } from '../../hooks/useCreditExceptions';
import { FinanceSectionCard } from './FinanceSectionCard';
import { FinanceKpiCard } from './FinanceKpiCard';
import { FinanceEmptyState } from './FinanceEmptyState';
import { CreditExceptionApprovalCard } from './CreditExceptionApprovalCard';
import { CreditExceptionRequestModal } from './CreditExceptionRequestModal';
import { CreditExceptionReports } from './CreditExceptionReports';
import { FinanceTabs } from './FinanceTabs';
import { FinanceActionButton } from './FinanceActionButton';

function canApproveCredit(roleKey) {
  const rk = String(roleKey || '').toLowerCase();
  return ['md', 'admin', 'sales_manager', 'branch_manager'].includes(rk);
}

function canRevokeCredit(roleKey) {
  const rk = String(roleKey || '').toLowerCase();
  return ['md', 'admin', 'finance_manager'].includes(rk);
}

function canRequestCredit(roleKey) {
  const rk = String(roleKey || '').toLowerCase();
  return ['md', 'admin', 'sales_manager', 'branch_manager', 'finance_manager'].includes(rk);
}

const SUB_TABS = [
  { id: 'queue', label: 'Work queue' },
  { id: 'reports', label: 'Reports' },
];

/**
 * @param {{ branchId?: string | null; roleKey?: string; trialCredit?: object | null; compact?: boolean }} props
 */
export function CreditExceptionPanel({ branchId, roleKey, trialCredit, compact = false }) {
  const [subTab, setSubTab] = useState('queue');
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestQuote, setRequestQuote] = useState('');
  const { items, policy, loading, error, reload } = useCreditExceptions({ branchId, enabled: true });
  const pending = useMemo(() => items.filter((i) => i.status === 'pending'), [items]);
  const approved = useMemo(() => items.filter((i) => i.status === 'approved'), [items]);
  const exposure = trialCredit?.approvedCreditExposureNgn ?? approved.reduce((s, i) => s + (i.amountNgn || 0), 0);

  if (compact) {
    return (
      <FinanceSectionCard title="Delivery credit" icon={<CreditCard size={16} className="text-teal-700" />}>
        <p className="text-sm text-slate-600">
          {trialCredit?.pendingCreditExceptionsCount ?? 0} pending · {formatNgn(exposure)} exposure
        </p>
        <FinanceActionButton variant="link" to="/accounting">
          Open credit exceptions →
        </FinanceActionButton>
      </FinanceSectionCard>
    );
  }

  return (
    <>
      <FinanceSectionCard
        title="Delivery credit exceptions"
        icon={<CreditCard size={16} className="text-teal-700" />}
        action={
          <div className="flex flex-wrap gap-2">
            {canRequestCredit(roleKey) ? (
              <FinanceActionButton
                variant="primary"
                onClick={() => {
                  const q = window.prompt('Quotation reference for credit request (e.g. QT-KD-26-0001)');
                  if (q?.trim()) {
                    setRequestQuote(q.trim());
                    setRequestOpen(true);
                  }
                }}
              >
                Request credit exception
              </FinanceActionButton>
            ) : null}
            <FinanceActionButton variant="secondary" onClick={() => reload()}>
              Refresh
            </FinanceActionButton>
          </div>
        }
      >
        <p className="mb-4 text-sm font-medium text-slate-600">
          Approved credit allows delivery while receivable stays outstanding. Use Review before approve/reject.
        </p>
        {policy?.policyNote ? (
          <p className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            {policy.policyNote}
          </p>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FinanceKpiCard label="Pending requests" value={trialCredit?.pendingCreditExceptionsCount ?? pending.length} tone="amber" />
          <FinanceKpiCard label="Approved exposure" value={formatNgn(exposure)} tone="teal" />
          <FinanceKpiCard label="Overdue credit" value={trialCredit?.overdueApprovedCreditCount ?? '—'} tone="amber" />
          <FinanceKpiCard label="Deliveries without credit" value={trialCredit?.deliveriesWarningNoCreditCount ?? '—'} />
        </div>

        <FinanceTabs tabs={SUB_TABS} active={subTab} onChange={setSubTab} />

        {subTab === 'reports' ? <CreditExceptionReports branchId={branchId} /> : null}

        {subTab === 'queue' ? (
          <>
            {error ? (
              <FinanceEmptyState
                title="Could not load"
                description={error}
                action={
                  <FinanceActionButton variant="primary" onClick={() => reload()}>
                    Retry
                  </FinanceActionButton>
                }
              />
            ) : loading && !items.length ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : pending.length ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Pending approval</h3>
                {pending.slice(0, 12).map((item) => (
                  <CreditExceptionApprovalCard
                    key={item.id}
                    item={item}
                    canApprove={canApproveCredit(roleKey)}
                    canRevoke={canRevokeCredit(roleKey)}
                    onDone={reload}
                  />
                ))}
              </div>
            ) : (
              <FinanceEmptyState
                title="No pending credit requests"
                description="Use Request credit exception when a quotation needs delivery before full payment."
              />
            )}
            {approved.length ? (
              <div className="mt-6 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Approved (active)</h3>
                {approved.slice(0, 6).map((item) => (
                  <CreditExceptionApprovalCard
                    key={item.id}
                    item={item}
                    canRevoke={canRevokeCredit(roleKey)}
                    onDone={reload}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </FinanceSectionCard>

      <CreditExceptionRequestModal
        open={requestOpen}
        quotationRef={requestQuote}
        onClose={() => setRequestOpen(false)}
        onSubmitted={reload}
      />
    </>
  );
}
