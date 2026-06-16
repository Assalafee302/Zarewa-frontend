import React, { useMemo, useState } from 'react';
import { CreditCard, Plus, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { useCreditExceptions } from '../../hooks/useCreditExceptions';
import { PageTabs } from '../layout/PageTabs';
import { FinanceEmptyState } from './FinanceEmptyState';
import { CreditExceptionApprovalCard } from './CreditExceptionApprovalCard';
import { CreditExceptionRequestModal } from './CreditExceptionRequestModal';
import { CreditExceptionReports } from './CreditExceptionReports';
import {
  canApproveCreditExceptionItem,
  canRequestCreditException,
  canRevokeCreditException,
} from '../../lib/creditExceptionAccess';
import {
  AccountingDeskKpiCard,
  AccountingDeskNotice,
  AccountingDeskPageIntro,
  ACCOUNTING_CARD_ROW,
} from './accounting/AccountingDeskUi';

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
      <div className={`${ACCOUNTING_CARD_ROW} p-3`}>
        <p className="text-[11px] text-slate-600">
          {trialCredit?.pendingCreditExceptionsCount ?? 0} pending · {formatNgn(exposure)} exposure
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:gap-6 min-w-0">
        <AccountingDeskPageIntro
          title="Delivery credit exceptions"
          description="Approved credit allows delivery while receivable stays outstanding. Review before approve or reject."
          action={
            <>
              {canRequestCreditException(roleKey) ? (
                <button
                  type="button"
                  onClick={() => {
                    const q = window.prompt('Quotation reference for credit request (e.g. QT-KD-26-0001)');
                    if (q?.trim()) {
                      setRequestQuote(q.trim());
                      setRequestOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm hover:brightness-105"
                >
                  <Plus size={12} /> Request credit
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => reload()}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#134e4a] hover:bg-slate-50"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </>
          }
        />

        {policy?.policyNote ? (
          <AccountingDeskNotice tone="warn">{policy.policyNote}</AccountingDeskNotice>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AccountingDeskKpiCard
            icon={<CreditCard size={12} />}
            label="Pending requests"
            value={trialCredit?.pendingCreditExceptionsCount ?? pending.length}
            tone="amber"
          />
          <AccountingDeskKpiCard label="Approved exposure" value={formatNgn(exposure)} tone="teal" />
          <AccountingDeskKpiCard label="Overdue credit" value={trialCredit?.overdueApprovedCreditCount ?? '—'} tone="amber" />
          <AccountingDeskKpiCard label="Deliveries without credit" value={trialCredit?.deliveriesWarningNoCreditCount ?? '—'} />
        </div>

        <PageTabs tabs={SUB_TABS} value={subTab} onChange={setSubTab} />

        {subTab === 'reports' ? <CreditExceptionReports branchId={branchId} /> : null}

        {subTab === 'queue' ? (
          <div className="space-y-4">
            {error ? (
              <FinanceEmptyState
                title="Could not load"
                description={error}
                action={
                  <button
                    type="button"
                    onClick={() => reload()}
                    className="rounded-lg bg-[#134e4a] text-white px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
                  >
                    Retry
                  </button>
                }
              />
            ) : loading && !items.length ? (
              <p className="text-[11px] text-slate-500">Loading…</p>
            ) : pending.length ? (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pending approval</h3>
                {pending.slice(0, 12).map((item) => (
                  <CreditExceptionApprovalCard
                    key={item.id}
                    item={item}
                    canApprove={canApproveCreditExceptionItem(roleKey, item, policy)}
                    canRevoke={canRevokeCreditException(roleKey)}
                    onDone={reload}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-14 px-6 text-center">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  No pending credit requests
                </p>
              </div>
            )}
            {approved.length ? (
              <div className="space-y-2 pt-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Approved (active)</h3>
                {approved.slice(0, 6).map((item) => (
                  <CreditExceptionApprovalCard
                    key={item.id}
                    item={item}
                    canRevoke={canRevokeCreditException(roleKey)}
                    onDone={reload}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <CreditExceptionRequestModal
        open={requestOpen}
        quotationRef={requestQuote}
        onClose={() => setRequestOpen(false)}
        onSubmitted={reload}
      />
    </>
  );
}
