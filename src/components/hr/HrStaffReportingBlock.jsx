import React from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, Users } from 'lucide-react';
import { HrCard } from './hrPageUi';

/**
 * @param {{
 *   staff: {
 *     userId?: string;
 *     lineManager?: { userId: string; displayName?: string; jobTitle?: string | null } | null;
 *     lineManagerDisplayName?: string | null;
 *     lineManagerUserId?: string | null;
 *     directReports?: Array<{ userId: string; displayName?: string; jobTitle?: string | null }>;
 *   };
 *   staffBasePath?: string;
 *   organogramPath?: string;
 * }} props
 */
export function HrStaffReportingBlock({ staff, staffBasePath = '/hr/employees', organogramPath }) {
  const manager = staff?.lineManager;
  const managerId = manager?.userId || staff?.lineManagerUserId;
  const managerName =
    manager?.displayName || staff?.lineManagerDisplayName || (managerId && !manager ? managerId : null);
  const reports = Array.isArray(staff?.directReports) ? staff.directReports : [];
  const orgPath =
    organogramPath ||
    (staff?.userId ? `/hr/employees?tab=org-chart&focus=${encodeURIComponent(staff.userId)}` : '/hr/employees?tab=org-chart');

  return (
    <HrCard title="Reporting" subtitle="Line manager, direct reports, and place in the organogram">
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-ui-xs font-bold uppercase tracking-widest text-slate-400">Line manager</dt>
          <dd className="mt-1">
            {managerId && managerName ? (
              <Link to={`${staffBasePath}/${managerId}`} className="font-semibold text-zarewa-teal hover:underline">
                {managerName}
                {manager?.jobTitle ? <span className="font-normal text-slate-500"> · {manager.jobTitle}</span> : null}
              </Link>
            ) : (
              <span className="text-slate-500">No line manager assigned</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-ui-xs font-bold uppercase tracking-widest text-slate-400">
            <Users size={12} aria-hidden />
            Direct reports ({reports.length})
          </dt>
          <dd className="mt-1">
            {reports.length ? (
              <ul className="space-y-1">
                {reports.map((r) => (
                  <li key={r.userId}>
                    <Link to={`${staffBasePath}/${r.userId}`} className="text-zarewa-teal hover:underline">
                      {r.displayName || r.userId}
                      {r.jobTitle ? <span className="text-slate-500"> · {r.jobTitle}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-slate-500">No direct reports in scope</span>
            )}
          </dd>
        </div>
        <div>
          <Link
            to={orgPath}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zarewa-teal/20 bg-zarewa-teal/5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zarewa-teal hover:bg-zarewa-teal/10"
          >
            <GitBranch size={14} aria-hidden />
            View in organogram
          </Link>
        </div>
      </dl>
    </HrCard>
  );
}
