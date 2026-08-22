import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Package,
  Users,
  Wrench,
} from 'lucide-react';
import { MANAGER_AGED_QUEUE_HOURS, MANAGER_OPEN_WO_SLA_HOURS } from '../../lib/managerDashboardCore';
import { TEAM_HR_ATTENDANCE_PATH } from '../../lib/managerPageTabs';
import { CommandMetricCard } from '../layout/CommandMetricCard';
import {
  COMMAND_METRIC_GRID,
  COMMAND_SECTION_INTRO,
  COMMAND_SECTION_EYEBROW,
  COMMAND_SECTION_SUB,
  COMMAND_SECTION_TITLE,
} from '../../lib/execPageUi';

/**
 * Floor now — machines, stock, people, aged queue on overview metric cards.
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
      warn: machinesDownAvailable && Number(machinesDown) > 0,
      badge: machinesDownAvailable && Number(machinesDown) > 0 ? 'Down' : null,
      icon: Wrench,
      iconTone: 'warn',
      onClick: machinesDownAvailable ? onOpenIssues : undefined,
      unavailable: !machinesDownAvailable,
    },
    {
      key: 'stock',
      label: 'Low stock',
      value: lowStockCount,
      meta: 'Ops inventory below threshold',
      warn: Number(lowStockCount) > 0,
      badge: Number(lowStockCount) > 0 ? `${lowStockCount}` : null,
      icon: Package,
      iconTone: 'tertiary',
      to: '/operations',
      linkState: { focusOpsTab: 'inventory' },
    },
    {
      key: 'absent',
      label: 'Staff absent',
      value: !absentAvailable ? '—' : absentToday,
      meta: !absentAvailable
        ? 'Attendance permission or roll unavailable'
        : 'Marked absent on today’s roll',
      warn: absentAvailable && Number(absentToday) > 0,
      badge: absentAvailable && Number(absentToday) > 0 ? 'Absent' : null,
      icon: Users,
      iconTone: 'secondary',
      to: absentAvailable ? TEAM_HR_ATTENDANCE_PATH : undefined,
      unavailable: !absentAvailable,
    },
    {
      key: 'aged',
      label: 'Aged approvals',
      value: agedApprovals,
      meta: `Older than ${MANAGER_AGED_QUEUE_HOURS}h`,
      warn: Number(agedApprovals) > 0,
      badge: Number(agedApprovals) > 0 ? 'Aged' : null,
      icon: Clock,
      iconTone: 'primary',
      onClick: onOpenAgedQueue,
    },
  ];

  return (
    <section aria-label="Branch operations strip">
      <div className={COMMAND_SECTION_INTRO}>
        <p className={COMMAND_SECTION_EYEBROW}>Floor now</p>
        <p className={COMMAND_SECTION_TITLE}>Operations status</p>
        <p className={COMMAND_SECTION_SUB}>
          Live counts from maintenance, inventory, attendance, and the approval queue.
        </p>
      </div>
      <div className={COMMAND_METRIC_GRID}>
        {tiles.map((t) => {
          const card = (
            <CommandMetricCard
              label={t.label}
              value={loading ? '…' : t.value}
              meta={t.meta}
              icon={t.icon}
              iconTone={t.warn ? 'warn' : t.iconTone}
              badge={t.badge}
              warn={t.warn}
              onClick={t.onClick}
              className={t.unavailable ? 'opacity-70' : ''}
            />
          );

          if (t.to) {
            return (
              <Link
                key={t.key}
                to={t.to}
                state={t.linkState}
                className="block no-underline text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 focus-visible:ring-offset-2 rounded-xl"
              >
                {card}
              </Link>
            );
          }

          return <React.Fragment key={t.key}>{card}</React.Fragment>;
        })}
      </div>
      {tiles.some((t) => t.warn) ? (
        <p className="mt-3 flex items-center gap-1.5 text-ui-xs text-amber-900">
          <AlertTriangle size={14} aria-hidden />
          One or more floor signals need attention.
        </p>
      ) : null}
    </section>
  );
}
