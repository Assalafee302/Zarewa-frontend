import React from 'react';
import { Link } from 'react-router-dom';
import { MANAGER_AGED_QUEUE_HOURS, MANAGER_OPEN_WO_SLA_HOURS } from '../../lib/managerDashboardCore';
import { TEAM_HR_ATTENDANCE_PATH } from '../../lib/managerPageTabs';

/**
 * Truthful branch ops strip — server-backed counts only (no synthetic sparklines).
 * Each tile drills to Issues / Ops inventory / Team HR attendance / PAC Needs approval.
 */
export function ManagerOpsStrip({
  machinesDown = null,
  machinesDownAvailable = true,
  lowStockCount = 0,
  absentToday = null,
  absentAvailable = true,
  agedApprovals = 0,
  loading = false,
  onOpenIssues,
  onOpenAgedQueue,
}) {
  const tiles = [
    {
      key: 'machines',
      label: 'Machines down',
      value: !machinesDownAvailable ? '—' : machinesDown,
      meta: !machinesDownAvailable
        ? 'Work-order feed unavailable'
        : `machine_down or open ≥${MANAGER_OPEN_WO_SLA_HOURS}h`,
      tone: machinesDownAvailable && Number(machinesDown) > 0 ? 'rose' : 'teal',
      onClick: machinesDownAvailable ? onOpenIssues : undefined,
      unavailable: !machinesDownAvailable,
    },
    {
      key: 'stock',
      label: 'Low stock / stockouts',
      value: lowStockCount,
      meta: 'Ops inventory threshold (stockLevel < lowStockThreshold)',
      tone: Number(lowStockCount) > 0 ? 'amber' : 'teal',
      to: '/operations',
      linkState: { focusOpsTab: 'inventory' },
    },
    {
      key: 'absent',
      label: 'Staff absent today',
      value: !absentAvailable ? '—' : absentToday,
      meta: !absentAvailable
        ? 'Attendance permission or roll unavailable'
        : 'Marked absent on today’s daily roll (unmarked ≠ absent)',
      tone: absentAvailable && Number(absentToday) > 0 ? 'amber' : 'teal',
      to: absentAvailable ? TEAM_HR_ATTENDANCE_PATH : undefined,
      unavailable: !absentAvailable,
    },
    {
      key: 'aged',
      label: 'Aged approvals',
      value: agedApprovals,
      meta: `Needs approval older than ${MANAGER_AGED_QUEUE_HOURS}h (known timestamps only)`,
      tone: Number(agedApprovals) > 0 ? 'rose' : 'teal',
      onClick: onOpenAgedQueue,
    },
  ];

  return (
    <section className="mb-5" aria-label="Branch operations strip">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-ui-xs font-bold uppercase tracking-[0.12em] text-slate-500">Right now</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Live counts from maintenance, inventory, attendance, and the approval queue — click through to the list.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const valueClass =
            t.tone === 'rose'
              ? 'text-rose-800'
              : t.tone === 'amber'
                ? 'text-amber-800'
                : 'text-zarewa-teal';
          const body = (
            <>
              <p className="text-ui-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t.label}</p>
              <p className={`mt-1.5 text-2xl font-black tabular-nums tracking-tight ${valueClass}`}>
                {loading ? '…' : t.value}
              </p>
              <p className="mt-1 text-ui-xs text-slate-500 leading-snug">{t.meta}</p>
              {t.unavailable ? (
                <p className="mt-2 text-ui-xs font-semibold text-amber-800">Not approximated — data source unavailable</p>
              ) : (
                <p className="mt-2 text-ui-xs font-bold uppercase tracking-wide text-zarewa-teal/80">Open list →</p>
              )}
            </>
          );
          const className =
            'rounded-zarewa border border-slate-200/75 bg-white p-4 shadow-[var(--shadow-sequence)] text-left w-full transition-colors hover:border-zarewa-teal/40 focus:outline-none focus:ring-2 focus:ring-zarewa-teal/15 disabled:opacity-60 disabled:hover:border-slate-200/75';

          if (t.to) {
            return (
              <Link key={t.key} to={t.to} state={t.linkState} className={`${className} no-underline block`}>
                {body}
              </Link>
            );
          }

          return (
            <button
              key={t.key}
              type="button"
              className={className}
              disabled={!t.onClick}
              onClick={() => t.onClick?.()}
            >
              {body}
            </button>
          );
        })}
      </div>
    </section>
  );
}
