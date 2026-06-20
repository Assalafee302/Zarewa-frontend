import React from 'react';
import { Link } from 'react-router-dom';
import { teamHrTimeAbsencePath } from '../../lib/teamHrRoutes';

/**
 * Action-first banner for branch managers — what needs endorsement today.
 * @param {{ pendingLeave?: number; pendingLoan?: number; pendingTransfer?: number; openIncidents?: number }} props
 */
export function TeamHrNextStepBanner({
  pendingLeave = 0,
  pendingLoan = 0,
  pendingTransfer = 0,
  openIncidents = 0,
}) {
  const endorsementTotal = (pendingLeave || 0) + (pendingLoan || 0);
  const actionTotal = endorsementTotal + (pendingTransfer || 0) + (openIncidents || 0);
  if (actionTotal <= 0) return null;

  let headline = '';
  let detail = '';
  let href = teamHrTimeAbsencePath('endorsements');
  let cta = 'Review endorsements';

  if (endorsementTotal > 0) {
    const parts = [];
    if (pendingLeave > 0) parts.push(`${pendingLeave} leave`);
    if (pendingLoan > 0) parts.push(`${pendingLoan} loan`);
    headline = `${endorsementTotal} endorsement${endorsementTotal === 1 ? '' : 's'} waiting`;
    detail = parts.join(' · ');
  } else if (pendingTransfer > 0) {
    headline = `${pendingTransfer} transfer${pendingTransfer === 1 ? '' : 's'} need review`;
    detail = 'Branch transfer recommendations awaiting your input.';
    href = '/team-hr/transfers';
    cta = 'Review transfers';
  } else if (openIncidents > 0) {
    headline = `${openIncidents} open incident${openIncidents === 1 ? '' : 's'}`;
    detail = 'Follow up on incident memos for your team.';
    href = '/team-hr/incidents';
    cta = 'View incidents';
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-bold">{headline}</p>
          {detail ? <p className="mt-0.5 text-xs text-amber-900/90">{detail}</p> : null}
        </div>
        <Link
          to={href}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[#134e4a] px-4 py-2 text-xs font-semibold text-white no-underline hover:bg-[#0f3d3a]"
        >
          {cta} →
        </Link>
      </div>
    </div>
  );
}
