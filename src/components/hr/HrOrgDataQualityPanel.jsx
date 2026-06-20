import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';

/**
 * @param {{
 *   dataQuality?: {
 *     noManager?: number;
 *     orphans?: number;
 *     rootCount?: number;
 *     multipleRoots?: boolean;
 *     cycleCount?: number;
 *     cycles?: Array<{ cycleId: string; members: Array<{ userId: string; displayName: string }> }>;
 *   };
 *   directoryFixPath: string;
 *   staffBasePath?: string;
 *   onScrollToOrphans?: () => void;
 * }} props
 */
export function HrOrgDataQualityPanel({ dataQuality, directoryFixPath, staffBasePath = '/hr/employees', onScrollToOrphans }) {
  if (!dataQuality) return null;

  const { noManager = 0, orphans = 0, rootCount = 0, multipleRoots, cycleCount = 0, cycles = [] } = dataQuality;
  const hasIssues = noManager > 0 || orphans > 0 || multipleRoots || cycleCount > 0;
  if (!hasIssues) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
        Reporting-line data looks complete — no missing managers, unlinked staff, or loops detected in scope.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-800">Reporting-line data quality</p>
            <p className="mt-1 text-xs text-amber-800/90">
              The organogram reflects line-manager assignments. Fix data issues in the directory for a cleaner tree.
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {noManager > 0 ? (
              <li>
                <Link
                  to={directoryFixPath}
                  className="flex items-center justify-between rounded-lg border border-amber-200/80 bg-white px-3 py-2 text-left text-xs transition hover:border-amber-300 hover:shadow-sm"
                >
                  <span>
                    <span className="font-bold tabular-nums text-amber-900">{noManager}</span>
                    <span className="text-amber-800"> no line manager</span>
                  </span>
                  <ChevronRight size={14} className="text-amber-600" aria-hidden />
                </Link>
              </li>
            ) : null}
            {orphans > 0 ? (
              <li>
                {onScrollToOrphans ? (
                  <button
                    type="button"
                    onClick={onScrollToOrphans}
                    className="flex w-full items-center justify-between rounded-lg border border-amber-200/80 bg-white px-3 py-2 text-left text-xs transition hover:border-amber-300 hover:shadow-sm"
                  >
                    <span>
                      <span className="font-bold tabular-nums text-amber-900">{orphans}</span>
                      <span className="text-amber-800"> unlinked in scope</span>
                    </span>
                    <ChevronRight size={14} className="text-amber-600" aria-hidden />
                  </button>
                ) : (
                  <div className="rounded-lg border border-amber-200/80 bg-white px-3 py-2 text-xs text-amber-800">
                    <span className="font-bold tabular-nums text-amber-900">{orphans}</span> unlinked in scope
                  </div>
                )}
              </li>
            ) : null}
            {multipleRoots ? (
              <li className="rounded-lg border border-amber-200/80 bg-white px-3 py-2 text-xs text-amber-800">
                <span className="font-bold tabular-nums text-amber-900">{rootCount}</span> top-level roots
                <span className="mt-0.5 block text-[10px] text-amber-700">Expected for some orgs; verify assignments</span>
              </li>
            ) : null}
            {cycleCount > 0 ? (
              <li className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                <span className="font-bold tabular-nums">{cycleCount}</span> reporting loop{cycleCount === 1 ? '' : 's'}
              </li>
            ) : null}
          </ul>
          {cycles.length ? (
            <ul className="space-y-1.5 text-xs text-red-900">
              {cycles.map((cycle) => (
                <li key={cycle.cycleId} className="rounded-lg border border-red-100 bg-white/80 px-3 py-2">
                  <span className="font-semibold">Loop: </span>
                  {cycle.members.map((m, i) => (
                    <React.Fragment key={m.userId}>
                      {i > 0 ? <span className="text-red-700"> → </span> : null}
                      <Link to={`${staffBasePath}/${m.userId}`} className="font-medium text-red-800 hover:underline">
                        {m.displayName || m.userId}
                      </Link>
                    </React.Fragment>
                  ))}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
