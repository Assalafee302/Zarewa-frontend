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
      ['Chairman waiver', p.needsChairmanWaiver ? 'Required at final approval' : null],
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

  if (kind === 'scholarship_profile_update') {
    const rows = [
      ['School', p.schoolName],
      ['Class', p.classLevel],
      ['Session', p.academicSession || p.academicYear],
      ['Term', p.currentTerm || p.term],
      ['Term start', p.termStartIso],
      ['Term end', p.termEndIso],
      ['Notes', p.notes || request?.body],
    ].filter(([, v]) => v != null && v !== '');
    return <PayloadGrid rows={rows} compact={compact} />;
  }

  if (kind === 'scholarship_fee_request') {
    const rows = [
      ['Term', p.term],
      ['Session', p.academicSession || p.academicYear],
      ['Amount', p.amountRequestedNgn != null ? formatNgn(p.amountRequestedNgn) : null],
      ['Fee type', p.feeType],
      ['Notes', p.notes || request?.body],
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
          <dt className="text-ui-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Approval chain labels for request status. */
// eslint-disable-next-line react-refresh/only-export-components
export function hrRequestApprovalChain(status, kind) {
  const k = String(kind || '').toLowerCase();
  if (k === 'scholarship_profile_update' || k === 'scholarship_fee_request') {
    const chain = ['Draft', 'HR review', 'Approved'];
    const idx =
      status === 'draft'
        ? 0
        : status === 'hr_review'
          ? 1
          : ['approved', 'rejected', 'hr_rejected'].includes(status)
            ? 2
            : 1;
    return { chain, currentIdx: idx, status };
  }
  const chain = ['Draft', 'HR review', 'Branch manager', 'GM HR', 'Approved'];
  const rejected = ['rejected', 'hr_rejected', 'gm_rejected'].includes(status);
  const idx =
    status === 'draft'
      ? 0
      : status === 'hr_review'
        ? 1
        : status === 'branch_manager_review'
          ? 2
          : status === 'gm_hr_review'
            ? 3
            : status === 'approved' || rejected
              ? 4
              : 1;
  return { chain, currentIdx: idx, status, rejected };
}
