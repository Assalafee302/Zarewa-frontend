import React, { useMemo, useState } from 'react';
import { CreditCard, FileSpreadsheet, Plus, RefreshCw } from 'lucide-react';
import { formatNgn } from '../../Data/mockData';
import { downloadFinanceCsv } from '../../lib/exportFinanceCsv';
import { useCreditExceptions } from '../../hooks/useCreditExceptions';
import { FinanceEmptyState } from './FinanceEmptyState';
import { CreditExceptionApprovalCard } from './CreditExceptionApprovalCard';
import { CreditExceptionRequestModal } from './CreditExceptionRequestModal';
import {
  canApproveCreditExceptionItem,
  canRequestCreditException,
  canRevokeCreditException,
} from '../../lib/creditExceptionAccess';
import { AccountingDeskKpiCard, AccountingDeskNotice } from './accounting/AccountingDeskUi';
import { AccountingRegisterHeader } from './accounting/AccountingRegisterLayout';

/**
 * @param {{ branchId?: string | null; roleKey?: string; compact?: boolean }} props
 */
export function CreditExceptionPanel({ branchId, roleKey, compact = false }) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestQuote, setRequestQuote] = useState('');
  const { items, policy, loading, error, reload } = useCreditExceptions({ branchId, enabled: true });
  const pending = useMemo(() => items.filter((i) => i.status === 'pending'), [items]);
  const approved = useMemo(() => items.filter((i) => i.status === 'approved'), [items]);
  const exposure = approved.reduce((s, i) => s + (i.amountNgn || 0), 0);
  const overdueCount = useMemo(
    () => approved.filter((i) => i.dueDateIso && i.dueDateIso < new Date().toISOString().slice(0, 10)).length,
    [approved]
  );

  const exportList = () => {
    downloadFinanceCsv(
      'delivery-credit-exceptions',
      ['quotationRef', 'customer', 'status', 'amountNgn', 'branchId', 'dueDateIso'],
      items.map((i) => ({
        quotationRef: i.quotationRef,
        customer: i.customerName || i.customerId,
        status: i.status,
        amountNgn: i.amountNgn,
        branchId: i.branchId,
        dueDateIso: i.dueDateIso,
      }))
    );
  };

  if (compact) {
    return (
      <p className="text-xs text-slate-600">
        {pending.length} pending · {formatNgn(exposure)} exposure
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4 min-w-0">
        <AccountingRegisterHeader
          title="Delivery credit approval"
          subtitle="Approve delivery before full payment. Receivable remains outstanding until settled."
          totalLabel="Approved exposure"
          totalValue={formatNgn(exposure)}
          compact
          actions={
            <>
              {canRequestCreditException(roleKey) ? (
                <button
                  type="button"
                  onClick={() => {
                    const q = window.prompt('Quotation reference (e.g. QT-KD-26-0001)');
                    if (q?.trim()) {
                      setRequestQuote(q.trim());
                      setRequestOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-zarewa-teal text-white px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider shadow-sm hover:brightness-105"
                >
                  <Plus size={12} /> Request
                </button>
              ) : null}
              <button
                type="button"
                onClick={exportList}
                disabled={!items.length}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider text-zarewa-teal hover:bg-slate-50 disabled:opacity-40"
              >
                <FileSpreadsheet size={12} /> Export
              </button>
              <button
                type="button"
                onClick={() => reload()}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider text-zarewa-teal hover:bg-slate-50"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </>
          }
        />

        {policy?.policyNote ? <AccountingDeskNotice tone="warn">{policy.policyNote}</AccountingDeskNotice> : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AccountingDeskKpiCard icon={<CreditCard size={12} />} label="Pending" value={pending.length} tone="amber" />
          <AccountingDeskKpiCard label="Approved exposure" value={formatNgn(exposure)} tone="teal" />
          <AccountingDeskKpiCard label="Overdue" value={overdueCount} tone={overdueCount ? 'amber' : 'default'} />
          <AccountingDeskKpiCard label="Active approvals" value={approved.length} />
        </div>

        {error ? (
          <FinanceEmptyState
            title="Could not load"
            description={error}
            action={
              <button
                type="button"
                onClick={() => reload()}
                className="rounded-lg bg-zarewa-teal text-white px-3 py-1.5 text-ui-xs font-semibold uppercase tracking-wider"
              >
                Retry
              </button>
            }
          />
        ) : loading && !items.length ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-6">
            <section>
              <h3 className="text-ui-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Pending approval ({pending.length})
              </h3>
              {pending.length ? (
                <div className="space-y-2">
                  {pending.map((item) => (
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
                <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                  No pending requests.
                </p>
              )}
            </section>

            {approved.length ? (
              <section>
                <h3 className="text-ui-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Active approvals ({approved.length})
                </h3>
                <div className="space-y-2">
                  {approved.map((item) => (
                    <CreditExceptionApprovalCard
                      key={item.id}
                      item={item}
                      canRevoke={canRevokeCreditException(roleKey)}
                      onDone={reload}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
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
