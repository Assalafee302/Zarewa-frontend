import React from 'react';
import { Link } from 'react-router-dom';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';

/**
 * Action-first banner on My HR overview — surfaces the most urgent employee task.
 * @param {{
 *   pendingRequests?: number;
 *   rejectedDocs?: number;
 *   pendingProfileRequests?: number;
 *   incompleteSections?: number;
 * }} props
 */
export function MyHrNextStepBanner({
  pendingRequests = 0,
  rejectedDocs = 0,
  pendingProfileRequests = 0,
  incompleteSections = 0,
}) {
  let headline = '';
  let detail = '';
  let href = HR_SELF_SERVICE_PATH.overview;
  let cta = 'View details';

  if (rejectedDocs > 0) {
    headline = `${rejectedDocs} document${rejectedDocs === 1 ? '' : 's'} need attention`;
    detail = 'HR rejected an upload — fix and resubmit so loans and profile updates can proceed.';
    href = HR_SELF_SERVICE_PATH.documents;
    cta = 'Fix documents';
  } else if (pendingProfileRequests > 0) {
    headline = `${pendingProfileRequests} profile update${pendingProfileRequests === 1 ? '' : 's'} in review`;
    detail = 'HR is reviewing changes you submitted. You can track status in My requests.';
    href = HR_SELF_SERVICE_PATH.requests;
    cta = 'Track requests';
  } else if (pendingRequests > 0) {
    headline = `${pendingRequests} request${pendingRequests === 1 ? '' : 's'} awaiting review`;
    detail = 'Leave, loan, or attendance requests are with HR or your manager.';
    href = HR_SELF_SERVICE_PATH.requests;
    cta = 'View my requests';
  } else if (incompleteSections > 0) {
    headline = 'Complete your HR profile';
    detail = `${incompleteSections} section${incompleteSections === 1 ? '' : 's'} still need attention before full self-service access.`;
    href = HR_SELF_SERVICE_PATH.employment;
    cta = 'Finish setup';
  } else {
    return null;
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
