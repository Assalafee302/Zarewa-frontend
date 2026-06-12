import React from 'react';
import { formatNgn } from '../../lib/hrFormat';

/**
 * Human-readable summary of an HR request payload.
 * @param {{ request: object; compact?: boolean }} props
 */
export function HrRequestPayloadSummary({ request, compact = false }) {
  const p = request?.payload || {};
  const kind = request?.kind;

  if (kind === 'leave') {
    const rows = [
      ['Leave type', p.leaveType],
      ['Dates', p.startDateIso && p.endDateIso ? `${p.startDateIso} → ${p.endDateIso}` : null],
      ['Days', p.daysRequested],
      ['Handover', p.handoverTo],
      ['Contact', p.contactDuringLeave],
    ].filter(([, v]) => v != null && v !== '');
    return <PayloadGrid rows={rows} compact={compact} />;
  }

  if (kind === 'loan') {
    const rows = [
      ['Amount', p.amountNgn != null ? formatNgn(p.amountNgn) : null],
      ['Repayment', p.repaymentMonths ? `${p.repaymentMonths} month(s)` : null],
      ['Monthly deduction', p.deductionPerMonthNgn != null ? formatNgn(p.deductionPerMonthNgn) : null],
      ['Purpose', p.purpose],
      ['Exceptional', p.exceptionalLoan ? 'Yes' : null],
    ].filter(([, v]) => v != null && v !== '');
    return <PayloadGrid rows={rows} compact={compact} />;
  }

  if (kind === 'profile_change') {
    const field = p.field || 'field';
    const rv = p.requestedValue;
    let valueLabel = '';
    if (typeof rv === 'string' || typeof rv === 'number') valueLabel = String(rv);
    else if (rv && typeof rv === 'object') {
      valueLabel = Object.entries(rv)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
    }
    const rows = [
      ['Field', field],
      ['Requested', valueLabel || null],
      ['Reason', request?.body],
    ].filter(([, v]) => v != null && v !== '');
    return <PayloadGrid rows={rows} compact={compact} />;
  }

  if (request?.body) {
    return <p className="text-xs text-slate-600">{request.body}</p>;
  }
  return null;
}

function PayloadGrid({ rows, compact }) {
  if (!rows.length) return null;
  return (
    <dl className={`grid gap-2 ${compact ? 'grid-cols-1 text-xs' : 'sm:grid-cols-2 text-sm'}`}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Approval chain labels for request status. */
export function hrRequestApprovalChain(status) {
  const chain = ['Draft', 'Branch manager', 'HR review', 'GM HR', 'Approved'];
  const idx =
    status === 'draft' ? 0
    : status === 'branch_manager_review' ? 1
    : status === 'hr_review' ? 2
    : status === 'gm_hr_review' ? 3
    : ['approved', 'rejected', 'hr_rejected', 'gm_rejected'].includes(status) ? 4
    : 1;
  return { chain, currentIdx: idx, status };
}
