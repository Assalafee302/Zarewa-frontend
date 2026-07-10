import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { hrRequestKindLabel } from '../../lib/hrFormat';
import { HrStatusBadge } from './HrStatusBadge';
import { HR_TIME_ABSENCE, hrTabPath } from '../../lib/hrRoutes';
import { hrRequestQueuePath } from '../../lib/hrDashboardUi';

const CARD_ROW =
  'group relative flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-slate-200/90 bg-white/80 px-3 py-3 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-zarewa-teal/25 hover:shadow-md sm:px-4';

const REVIEWABLE_STATUSES = new Set(['hr_review', 'branch_manager_review', 'gm_hr_review']);

function slaBadge(request) {
  if (request.slaState === 'overdue') {
    return { label: 'Overdue SLA', cls: 'border-red-200 bg-red-50 text-red-800' };
  }
  if (REVIEWABLE_STATUSES.has(request.status)) {
    const days = Number(request.daysOpen ?? 0);
    if (days >= 2) return { label: `${days}d open`, cls: 'border-amber-200 bg-amber-50 text-amber-900' };
    return { label: 'On track', cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
  }
  return null;
}

function assigneeLabel(request) {
  const s = String(request.status || '');
  if (s === 'hr_review') return 'HR officer';
  if (s === 'branch_manager_review') return 'Branch manager';
  if (s === 'gm_hr_review') return 'GM HR';
  return request.nextStepLabel?.replace(/_/g, ' ') || '—';
}

/**
 * Unified actionable HR inbox — queues, SLA, and one-click preview.
 */
export function HrUnifiedInboxPanel({
  recentRequests = [],
  queueLines = [],
  counts = {},
  onPreview,
}) {
  const actionable = useMemo(
    () =>
      (recentRequests || []).filter((r) => REVIEWABLE_STATUSES.has(String(r.status || ''))).slice(0, 12),
    [recentRequests]
  );

  const overdue = Number(counts.overdueRequests ?? 0);
  const totalQueue = queueLines.reduce((sum, line) => sum + Number(line.count || 0), 0);

  if (!actionable.length && !totalQueue) return null;

  return (
    <section className="rounded-2xl border border-zarewa-teal/15 bg-gradient-to-br from-teal-50/70 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-zarewa-teal">HR inbox</h2>
          <p className="mt-1 text-xs text-slate-600">
            {totalQueue} item{totalQueue !== 1 ? 's' : ''} in your queues
            {overdue > 0 ? ` · ${overdue} past SLA` : ''}
          </p>
        </div>
        <Link to={hrTabPath(HR_TIME_ABSENCE, 'approvals')} className="text-xs font-bold uppercase text-zarewa-teal hover:underline">
          Full approval queue →
        </Link>
      </div>

      {queueLines.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {queueLines.map((line) => (
            <Link
              key={line.label}
              to={line.href}
              className="inline-flex items-center gap-2 rounded-xl border border-white bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 no-underline hover:border-zarewa-teal/25"
            >
              <span className="tabular-nums text-lg font-black text-amber-800">{line.count}</span>
              {line.label}
            </Link>
          ))}
        </div>
      ) : null}

      {actionable.length ? (
        <div className="mt-4 space-y-2">
          <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400">Action now</p>
          {actionable.map((r) => {
            const sla = slaBadge(r);
            return (
              <button
                key={r.id}
                type="button"
                className={`${CARD_ROW} w-full text-left`}
                onClick={() => onPreview?.(r)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-400">{hrRequestKindLabel(r.kind)}</p>
                  <p className="truncate text-sm font-bold text-slate-900">{r.staffDisplayName || r.userId || 'Employee'}</p>
                  <p className="text-ui-xs text-slate-500">
                    {assigneeLabel(r)}
                    {r.submittedAtIso ? ` · submitted ${r.submittedAtIso.slice(0, 10)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <HrStatusBadge status={r.status} variant="request" />
                  {sla ? (
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-ui-xs font-bold uppercase ${sla.cls}`}>
                      {sla.label}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          No requests awaiting your stage — check{' '}
          <Link to={hrRequestQueuePath('hr_queue')} className="font-bold text-zarewa-teal hover:underline">
            approval queues
          </Link>
          .
        </p>
      )}
    </section>
  );
}
