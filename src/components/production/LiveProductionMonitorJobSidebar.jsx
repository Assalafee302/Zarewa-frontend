import React from 'react';
import { formatMeters, statusTone } from '../../lib/liveProductionMonitorUi';
import { productionCoilSyncSummary } from '../../lib/productionRegisterIssues';

/**
 * Production register queue — sticky sidebar listing jobs on the line.
 */
export function LiveProductionMonitorJobSidebar({
  sortedJobs,
  selectedJobId,
  coilAllocationCountByJob,
  unsavedCoilDraftCount,
  onSelectJob,
}) {
  return (
    <aside className="space-y-1 lg:sticky lg:top-2 lg:self-start">
      <div className="flex items-center justify-between gap-2">
        <p className="text-ui-xs font-bold uppercase tracking-wider text-slate-500">Queue</p>
        <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-ui-xs font-bold text-slate-600">
          {sortedJobs.length}
        </span>
      </div>
      <div className="flex max-h-[min(58vh,22rem)] flex-col gap-1 overflow-y-auto pr-0.5 custom-scrollbar">
        {sortedJobs.map((job) => {
          const active = selectedJobId === job.jobID;
          const allocN = coilAllocationCountByJob.get(job.jobID) || 0;
          return (
            <button
              key={job.jobID}
              type="button"
              data-testid={`production-queue-job-${job.jobID}`}
              onClick={() => onSelectJob(job.jobID)}
              className={`w-full rounded-lg border p-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 ${
                active
                  ? 'border-zarewa-teal/40 bg-white shadow-sm ring-1 ring-zarewa-teal/15'
                  : 'border-slate-200/90 bg-white/80 hover:border-teal-300/60 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-mono text-xs font-bold text-zarewa-teal">
                  {job.cuttingListId || job.jobID}
                </p>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-ui-xs font-bold uppercase ${statusTone(job.status)}`}
                >
                  {job.status === 'Running'
                    ? 'Run'
                    : job.status === 'Planned'
                      ? 'Plan'
                      : job.status === 'Cancelled'
                        ? 'Off'
                        : 'Done'}
                </span>
              </div>
              <p className="mt-0.5 truncate text-ui-xs font-semibold text-slate-700">{job.customerName || '—'}</p>
              <p className="truncate text-ui-xs text-slate-500">{job.productName || job.productID || '—'}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-xs text-slate-500">
                <span className="tabular-nums">{formatMeters(job.plannedMeters)} plan</span>
                {job.quotationRef ? <span className="text-slate-400">· {job.quotationRef}</span> : null}
              </div>
              {job.status === 'Planned' || job.status === 'Running' ? (
                (() => {
                  const sync = productionCoilSyncSummary({
                    savedCoilCount: allocN,
                    unsavedCoilDraftCount: active ? unsavedCoilDraftCount : 0,
                    isActiveJob: active,
                  });
                  return (
                    <p
                      className={`mt-1 text-ui-xs font-semibold ${
                        sync.tone === 'amber' ? 'text-amber-700' : 'text-slate-500'
                      }`}
                    >
                      {sync.label}
                    </p>
                  );
                })()
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
