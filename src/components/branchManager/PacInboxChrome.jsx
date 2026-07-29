import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  MANAGER_STATUS_TONES,
  managerRowAgeHours,
  managerSlaMeta,
} from '../../lib/managerDashboardCore';

export const PAC_INBOX_ROW_CLASS =
  'group w-full text-left flex items-center gap-2 sm:gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zarewa-teal/25';

export function PacKindPill({ label, tone = 'pending' }) {
  return (
    <span
      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-ui-xs font-black uppercase ${
        MANAGER_STATUS_TONES[tone] || MANAGER_STATUS_TONES.pending
      }`}
    >
      {label}
    </span>
  );
}

export function PacSlaChip({ kind, row }) {
  const age = managerRowAgeHours(row);
  const meta = managerSlaMeta(kind, age, { compact: true });
  if (!meta) return null;
  return (
    <span
      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-ui-xs font-bold tabular-nums ${
        MANAGER_STATUS_TONES[meta.tone] || MANAGER_STATUS_TONES.info
      }`}
      title={managerSlaMeta(kind, age)?.label}
    >
      {meta.label}
    </span>
  );
}

export function PacEmptyState({
  icon = <Sparkles size={36} className="mb-3 text-teal-600 opacity-25" />,
  title = 'Nothing in this queue',
  detail = 'Queue clear — check your daily checklist or Branch Operations next.',
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center text-slate-400">
      {icon}
      <p className="text-sm font-bold text-slate-600">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-500">{detail}</p>
    </div>
  );
}
