import React from 'react';
import { Link } from 'react-router-dom';
import { hrFinancePayrollPath } from '../../lib/hrRoutes';

const STEPS = ['Prepare', 'Approve', 'Lock', 'Pay'];

/**
 * Role-aware "do this next" guidance on a payroll run detail panel.
 */
export function HrPayrollNextStepBanner({
  run,
  canPrepare,
  canGm,
  canMd,
  canPay,
  heldLineCount = 0,
  payeAlertCount = 0,
  missingBankCount = null,
}) {
  if (!run) return null;

  const status = String(run.status || '').toLowerCase();
  let tone = 'info';
  /** @type {React.ReactNode} */
  let title = '';
  /** @type {React.ReactNode} */
  let body = null;
  /** @type {{ label: string; href?: string; onClick?: () => void } | null} */
  let action = null;

  if (status === 'draft') {
    if (canPrepare) {
      title = 'Next: prepare this run';
      const blockers = [];
      if (payeAlertCount > 0) blockers.push(`${payeAlertCount} staff missing PAYE on profile`);
      if (heldLineCount > 0) blockers.push(`${heldLineCount} salary line${heldLineCount !== 1 ? 's' : ''} on hold`);
      body = (
        <>
          Recompute from current profiles, then resolve blockers before sending for approval.
          {blockers.length ? (
            <span className="mt-1 block font-semibold text-amber-900">{blockers.join(' · ')}</span>
          ) : null}
        </>
      );
      action = { label: 'Recompute payroll' };
    } else if (canGm || canMd) {
      title = 'Waiting on HR preparation';
      body = 'Payroll is still in draft. HR must recompute and submit for approval.';
    }
  } else if (status === 'pending' || (!run.gmApprovedAtIso && status !== 'locked' && status !== 'paid')) {
    if (canGm && !run.gmApprovedAtIso) {
      title = 'Next: GM HR approval';
      body = 'Review totals and line deductions, then approve for MD sign-off.';
      action = { label: 'Approve as GM HR' };
    } else if (canMd && run.gmApprovedAtIso && !run.mdApprovedAtIso) {
      title = 'Next: MD approval';
      body = 'Confirm net payable and statutory totals before lock.';
      action = { label: 'Approve as MD' };
    } else if (canPrepare) {
      title = 'Awaiting approvals';
      body = `GM HR: ${run.gmApprovedAtIso ? 'Done' : 'Pending'} · MD: ${run.mdApprovedAtIso ? 'Done' : 'Pending'}`;
    }
  } else if (status === 'locked') {
    title = 'Next: finance bank payment';
    body = (
      <>
        Payroll is locked. Finance downloads the bank file and marks the run paid in Accounting.
        {missingBankCount > 0 ? (
          <span className="mt-1 block font-semibold text-red-800">
            {missingBankCount} staff missing bank details — fix before payment.
          </span>
        ) : null}
      </>
    );
    action = { label: 'Open bank payments', href: hrFinancePayrollPath(run.id) };
    tone = 'success';
  } else if (status === 'paid') {
    title = 'Payroll complete';
    body = 'Staff can view payslips in My HR after amounts are unlocked. Statutory remittance can be posted from Accounting.';
    tone = 'success';
  }

  if (!title) return null;

  const toneCls =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-950'
        : 'border-sky-200 bg-sky-50 text-sky-950';

  const workflowStep =
    status === 'paid' ? 4 : status === 'locked' ? 3 : run.gmApprovedAtIso || run.mdApprovedAtIso ? 2 : 1;

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneCls}`}>
      <p className="text-sm font-bold">{title}</p>
      {body ? <p className="mt-1 text-xs leading-relaxed opacity-90">{body}</p> : null}
      <ol className="mt-3 flex flex-wrap gap-2" aria-label="Payroll workflow">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const active = workflowStep === step;
          const done = workflowStep > step;
          return (
            <li
              key={label}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                done ? 'bg-emerald-100 text-emerald-800' : active ? 'bg-white/90 text-slate-900 ring-1 ring-slate-300' : 'bg-black/5 text-slate-600'
              }`}
            >
              {label}
            </li>
          );
        })}
      </ol>
      {action?.href ? (
        <Link to={action.href} className="mt-3 inline-block text-xs font-semibold text-zarewa-teal hover:underline">
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}
