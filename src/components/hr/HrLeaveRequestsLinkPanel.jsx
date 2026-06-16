import React from 'react';
import { Link } from 'react-router-dom';
import { HR_REQUESTS } from '../../lib/hrRoutes';

/**
 * Points leave admins to the central Requests workspace (avoids a second leave-only queue UI).
 */
export function HrLeaveRequestsLinkPanel() {
  return (
    <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5">
      <h3 className="text-sm font-bold text-slate-800">Leave approval queue</h3>
      <p className="mt-2 text-sm text-slate-600 max-w-2xl">
        Leave and loan approvals are handled in one place — use <strong>Requests</strong> in the HR nav for HR
        review, branch endorsements, GM final approval, and bulk actions.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={`${HR_REQUESTS}?view=queue&scope=hr_queue`}
          className="rounded-lg bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39] no-underline"
        >
          HR review queue
        </Link>
        <Link
          to={`${HR_REQUESTS}?view=leave`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50 no-underline"
        >
          All leave requests
        </Link>
      </div>
    </div>
  );
}
