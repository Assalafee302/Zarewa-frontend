import React from 'react';
import { Link } from 'react-router-dom';
import { hrTimeAbsenceQueuePath, hrTimeAbsencePath } from '../../lib/hrRoutes';

/**
 * Points leave admins to the Time & Absence approval workspace.
 */
export function HrLeaveRequestsLinkPanel() {
  return (
    <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5">
      <h3 className="text-sm font-bold text-slate-800">Leave approval queue</h3>
      <p className="mt-2 text-sm text-slate-600 max-w-2xl">
        Leave, profile change, and attendance exception approvals live under{' '}
        <strong>Time &amp; Absence</strong> — HR review, branch endorsements, and GM final approval in one queue.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={hrTimeAbsenceQueuePath('hr_queue')}
          className="rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39] no-underline"
        >
          HR review queue
        </Link>
        <Link
          to={hrTimeAbsencePath('approvals', { kind: 'leave' })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50 no-underline"
        >
          All leave requests
        </Link>
      </div>
    </div>
  );
}
