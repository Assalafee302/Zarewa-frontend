import React from 'react';
import { FileText } from 'lucide-react';
import { ProfileKpiCard, ProfileStatusChip } from '../profile/profileDesign';
import { formatNgn } from '../../lib/hrFormat';
import { obligationStatementPdfUrl } from '../../lib/hrStaffObligations';

const STATUS_LABEL = {
  pending_disbursement: 'Awaiting payout',
  pending_approval: 'Awaiting approval',
  paid_off: 'Paid off',
  active: 'Repaying',
  repaying: 'Repaying',
};

/**
 * Single staff loan or purchase-credit balance with statement link.
 */
export function StaffObligationBalanceCard({ obligation }) {
  if (!obligation) return null;

  const {
    id,
    kindLabel,
    title,
    outstandingNgn,
    monthlyNgn,
    monthsPaid,
    termMonths,
    status,
    quotationRef,
    principalOriginalNgn,
  } = obligation;

  const original = principalOriginalNgn;
  const statusLabel = STATUS_LABEL[status] || (outstandingNgn > 0 ? 'Repaying' : status);
  const chipVariant = status === 'pending_approval' || status === 'pending_disbursement' ? 'pending' : outstandingNgn > 0 ? 'pending' : 'approved';

  return (
    <ProfileKpiCard label={title || kindLabel}>
      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        {original > 0 ? (
          <div>
            <dt className="text-slate-500">Original</dt>
            <dd className="font-bold tabular-nums text-slate-900">{formatNgn(original)}</dd>
          </div>
        ) : null}
        {monthlyNgn > 0 ? (
          <div>
            <dt className="text-slate-500">Monthly (payroll)</dt>
            <dd className="font-bold tabular-nums text-slate-900">{formatNgn(monthlyNgn)}</dd>
          </div>
        ) : null}
        {termMonths > 0 ? (
          <div>
            <dt className="text-slate-500">Term</dt>
            <dd className="font-bold tabular-nums text-slate-900">
              {monthsPaid > 0 ? `${monthsPaid}/${termMonths} mo` : `${termMonths} mo`}
            </dd>
          </div>
        ) : null}
        <div className={original > 0 && monthlyNgn > 0 ? '' : 'col-span-2'}>
          <dt className="text-slate-500">Outstanding</dt>
          <dd className="text-lg font-black tabular-nums text-[#134e4a]">{formatNgn(outstandingNgn)}</dd>
        </div>
      </dl>
      {quotationRef ? <p className="mt-1 text-xs text-slate-500">Quote {quotationRef}</p> : null}
      <ProfileStatusChip variant={chipVariant}>{statusLabel}</ProfileStatusChip>
      <a
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#134e4a] underline"
        href={obligationStatementPdfUrl(id)}
        target="_blank"
        rel="noreferrer"
      >
        <FileText size={12} aria-hidden />
        Statement PDF
      </a>
    </ProfileKpiCard>
  );
}
