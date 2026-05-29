import React from 'react';
import { Link } from 'react-router-dom';

/**
 * @param {{
 *   lineManager?: { userId: string; displayName?: string; jobTitle?: string } | null;
 *   directReports?: { userId: string; displayName?: string; jobTitle?: string }[];
 *   staffLinkPrefix?: string;
 * }} props
 */
export function HrReportingSection({ lineManager, directReports = [], staffLinkPrefix = '/hr/staff' }) {
  const reports = directReports || [];
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reporting line</h3>
      <div>
        <p className="text-xs font-semibold text-slate-500">Line manager</p>
        {lineManager?.userId ? (
          <p className="mt-1 text-sm">
            <Link to={`${staffLinkPrefix}/${lineManager.userId}`} className="font-semibold text-[#134e4a] hover:underline">
              {lineManager.displayName || lineManager.userId}
            </Link>
            {lineManager.jobTitle ? <span className="text-slate-500"> · {lineManager.jobTitle}</span> : null}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-600">—</p>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">Direct reports ({reports.length})</p>
        {reports.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">None on file</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {reports.map((r) => (
              <li key={r.userId}>
                <Link to={`${staffLinkPrefix}/${r.userId}`} className="font-medium text-[#134e4a] hover:underline">
                  {r.displayName || r.userId}
                </Link>
                {r.jobTitle ? <span className="text-slate-500"> · {r.jobTitle}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
