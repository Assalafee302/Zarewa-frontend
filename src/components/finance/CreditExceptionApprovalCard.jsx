import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatNgn } from '../../Data/mockData';
import { CreditExceptionStatusChip } from './CreditExceptionStatusChip';
import { FinanceActionButton } from './FinanceActionButton';
import { CreditExceptionDecisionModal } from './CreditExceptionDecisionModal';

/**
 * @param {{ item: object; canApprove?: boolean; canRevoke?: boolean; onDone?: () => void }} props
 */
export function CreditExceptionApprovalCard({ item, canApprove = false, canRevoke = false, onDone }) {
  const [modal, setModal] = useState(null);

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-black text-slate-900">{item.quotationRef}</p>
            <p className="text-xs font-medium text-slate-500">Branch {item.branchId || '—'}</p>
          </div>
          <CreditExceptionStatusChip status={item.status} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-slate-500">Outstanding at request</dt>
            <dd className="font-bold tabular-nums">{formatNgn(item.outstandingNgnAtRequest)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Credit amount</dt>
            <dd className="font-bold tabular-nums text-teal-900">{formatNgn(item.amountNgn)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">Reason</dt>
            <dd className="font-medium text-slate-800">{item.reason || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Due date</dt>
            <dd className="font-semibold">{item.dueDateISO || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Terms</dt>
            <dd className="font-semibold">{item.creditTermsDays ? `${item.creditTermsDays} days` : '—'}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          <FinanceActionButton variant="link" to={`/sales?quotation=${encodeURIComponent(item.quotationRef)}`}>
            View quotation
          </FinanceActionButton>
          {item.customerId ? (
            <FinanceActionButton variant="link" to={`/customers/${encodeURIComponent(item.customerId)}`}>
              View customer
            </FinanceActionButton>
          ) : null}
          {canApprove && item.status === 'pending' ? (
            <FinanceActionButton variant="primary" onClick={() => setModal('review')}>
              Review credit
            </FinanceActionButton>
          ) : null}
          {canRevoke && item.status === 'approved' ? (
            <FinanceActionButton variant="danger" onClick={() => setModal('revoke')}>
              Revoke credit
            </FinanceActionButton>
          ) : null}
        </div>
      </div>
      <CreditExceptionDecisionModal
        open={modal === 'review'}
        onClose={() => setModal(null)}
        item={item}
        mode="review"
        onDone={onDone}
      />
      <CreditExceptionDecisionModal
        open={modal === 'revoke'}
        onClose={() => setModal(null)}
        item={item}
        mode="revoke"
        onDone={onDone}
      />
    </>
  );
}
