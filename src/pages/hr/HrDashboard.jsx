import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { hrRequestStatusClass } from '../../lib/hrFormat';
import { canManageHrSettings, canViewHrReports } from '../../lib/hrAccess';
import {
  getHrDashboardIntro,
  getHrDashboardOverviewKpis,
  getHrDashboardQuickActions,
  getHrDashboardQueueLines,
} from '../../lib/hrDashboardUi';
import { HR_ATTENDANCE, HR_DEVELOPMENT, HR_DISCIPLINE_EXIT, HR_DOCUMENTS, HR_EMPLOYEES, HR_PAYROLL, HR_SETTINGS, hrTabPath } from '../../lib/hrRoutes';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HrKpiCard } from '../../components/hr/HrKpiCard';
import { HrOperationalReadinessPanel } from '../../components/hr/HrOperationalReadinessPanel';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { HrProfileWorkPanel } from '../../components/hr/HrProfileWorkPanel';
import {
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

const ALERT_CONFIGS = [
  {
    key: 'probationEnding',
    icon: '🕐',
    title: 'Probation Ending Soon',
    color: 'amber',
    borderCls: 'border-amber-400',
    badgeCls: 'bg-amber-100 text-amber-900',
    countLabel: (n) => `${n} staff member${n !== 1 ? 's' : ''}'s probation ends within 30 days`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span>
          <strong>{item.displayName}</strong>
          {item.jobTitle ? ` — ${item.jobTitle}` : ''}
          {item.branchId ? ` · ${item.branchId}` : ''}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-amber-700 font-mono">{item.probationEndIso}</span>
          {item.userId ? (
            <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="text-[#134e4a] font-bold hover:underline">Confirm →</Link>
          ) : null}
        </span>
      </li>
    ),
  },
  {
    key: 'contractsExpiring',
    icon: '📋',
    title: 'Contracts Expiring',
    color: 'orange',
    borderCls: 'border-orange-400',
    badgeCls: 'bg-orange-100 text-orange-900',
    countLabel: (n) => `${n} contract${n !== 1 ? 's' : ''} expiring within 60 days`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <strong>{item.displayName}</strong>
        <span className="text-orange-700 font-mono">{item.contractEndIso}</span>
      </li>
    ),
  },
  {
    key: 'birthdays',
    icon: '🎂',
    title: 'Birthdays This Week',
    color: 'rose',
    borderCls: 'border-rose-400',
    badgeCls: 'bg-rose-100 text-rose-900',
    countLabel: (n) => `${n} birthday${n !== 1 ? 's' : ''} this week`,
    renderItem: (item, i) => (
      <li key={i} className="text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <strong>{item.displayName}</strong>
      </li>
    ),
  },
  {
    key: 'anniversaries',
    icon: '🎉',
    title: 'Work Anniversaries',
    color: 'violet',
    borderCls: 'border-violet-400',
    badgeCls: 'bg-violet-100 text-violet-900',
    countLabel: (n) => `${n} work anniversar${n !== 1 ? 'ies' : 'y'} this week`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <strong>{item.displayName}</strong>
        {item.yearsCompleted != null ? <span className="text-violet-700 font-semibold">{item.yearsCompleted} yr{item.yearsCompleted !== 1 ? 's' : ''}</span> : null}
      </li>
    ),
  },
  {
    key: 'documentsExpiring',
    icon: '📄',
    title: 'Documents Expiring',
    color: 'red',
    borderCls: 'border-red-400',
    badgeCls: 'bg-red-100 text-red-900',
    countLabel: (n) => `${n} document${n !== 1 ? 's' : ''} expiring within 60 days`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span><strong>{item.displayName}</strong>{item.docType ? ` — ${item.docType}` : ''}</span>
        <span className="text-red-700 font-mono">{item.expiryIso}</span>
      </li>
    ),
  },
  {
    key: 'trainingExpiring',
    icon: '📚',
    title: 'Training Expiring',
    color: 'amber',
    borderCls: 'border-amber-500',
    badgeCls: 'bg-amber-100 text-amber-950',
    countLabel: (n) => `${n} training certification${n !== 1 ? 's' : ''} expiring within 60 days`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span><strong>{item.displayName}</strong>{item.courseName ? ` — ${item.courseName}` : ''}</span>
        <span className="text-amber-800 font-mono">{item.expiryIso}</span>
      </li>
    ),
  },
  {
    key: 'temporaryEmployees',
    icon: '⏳',
    title: 'Temporary / Contract Staff',
    color: 'teal',
    borderCls: 'border-teal-500',
    badgeCls: 'bg-teal-50 text-teal-900',
    countLabel: (n) => `${n} temporary staff alert${n !== 1 ? 's' : ''}`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span><strong>{item.displayName}</strong> — {String(item.alertType || '').replace(/_/g, ' ')}</span>
        {item.contractEndIso ? <span className="font-mono text-teal-800">{item.contractEndIso}</span> : null}
      </li>
    ),
  },
  {
    key: 'voluntaryTerminationRisk',
    icon: '⚠️',
    title: 'Absence — Termination Risk',
    color: 'red',
    borderCls: 'border-red-500',
    badgeCls: 'bg-red-100 text-red-900',
    countLabel: (n) => `${n} staff with 3-day no-show risk`,
    renderItem: (item, i) => (
      <li key={i} className="text-xs text-red-900 py-1 border-b border-slate-100 last:border-0">
        <strong>{item.displayName}</strong> — {item.consecutiveDays} consecutive absent days (HR action required)
      </li>
    ),
  },
];

const ACTION_ALERT_CONFIGS = [
  {
    key: 'absenceAwaitingReview',
    icon: '📋',
    title: 'Absence Reports — HR Review',
    borderCls: 'border-amber-500',
    badgeCls: 'bg-amber-100 text-amber-900',
    linkTo: hrTabPath(HR_ATTENDANCE, 'exceptions'),
    countLabel: (n) => `${n} absence report${n !== 1 ? 's' : ''} awaiting HR review`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span><strong>{item.staffDisplayName || item.displayName || 'Staff'}</strong> — {item.absenceType || 'absence'}</span>
        <span className="font-mono text-slate-500">{item.absenceStartIso?.slice(0, 10) || '—'}</span>
      </li>
    ),
  },
  {
    key: 'exitClearancePending',
    icon: '🚪',
    title: 'Exit Clearance Pending',
    borderCls: 'border-violet-400',
    badgeCls: 'bg-violet-100 text-violet-900',
    linkTo: hrTabPath(HR_DISCIPLINE_EXIT, 'exit-clearance'),
    countLabel: (n) => `${n} exit clearance${n !== 1 ? 's' : ''} in progress`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span><strong>{item.staffDisplayName || item.displayName || 'Staff'}</strong></span>
        <span className="text-[10px] font-bold uppercase text-violet-800">{item.status?.replace(/_/g, ' ')}</span>
      </li>
    ),
  },
  {
    key: 'promotionDue',
    icon: '📈',
    title: 'Staff Due for Promotion',
    borderCls: 'border-emerald-400',
    badgeCls: 'bg-emerald-100 text-emerald-900',
    linkTo: hrTabPath(HR_DEVELOPMENT, 'promotions'),
    countLabel: (n) => `${n} staff due for promotion review`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span><strong>{item.displayName || 'Staff'}</strong>{item.jobTitle ? ` — ${item.jobTitle}` : ''}</span>
        {item.dueDateIso ? <span className="font-mono text-emerald-800">{item.dueDateIso}</span> : null}
      </li>
    ),
  },
  {
    key: 'missingPolicyAck',
    icon: '📜',
    title: 'Missing Policy Acknowledgements',
    borderCls: 'border-slate-400',
    badgeCls: 'bg-slate-100 text-slate-900',
    linkTo: hrTabPath(HR_DOCUMENTS, 'policies'),
    countLabel: (n) => `${n} staff missing handbook or confidentiality acknowledgement`,
    renderItem: (item, i) => (
      <li key={i} className="text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <strong>{item.displayName || 'Staff'}</strong>
        {item.userId ? (
          <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="ml-2 text-[#134e4a] font-bold hover:underline">View →</Link>
        ) : null}
      </li>
    ),
  },
  {
    key: 'pendingTransfers',
    icon: '🔄',
    title: 'Transfer Requests Pending',
    borderCls: 'border-indigo-400',
    badgeCls: 'bg-indigo-100 text-indigo-900',
    linkTo: hrTabPath(HR_DISCIPLINE_EXIT, 'transfers'),
    countLabel: (n) => `${n} transfer request${n !== 1 ? 's' : ''} awaiting action`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span><strong>{item.staffDisplayName || 'Staff'}</strong> — {String(item.transferType || '').replace(/_/g, ' ')}</span>
        <span className="text-[10px] font-bold uppercase text-indigo-800">{item.status?.replace(/_/g, ' ')}</span>
      </li>
    ),
  },
  {
    key: 'expiredDocuments',
    icon: '⚠️',
    title: 'Expired / Missing Documents',
    borderCls: 'border-red-400',
    badgeCls: 'bg-red-100 text-red-900',
    linkTo: hrTabPath(HR_DOCUMENTS, 'reports'),
    preselectReport: 'document-expiry',
    countLabel: (n) => `${n} expired document record${n !== 1 ? 's' : ''}`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span><strong>{item.displayName || 'Staff'}</strong>{item.docKind ? ` — ${item.docKind}` : ''}</span>
        <span className="font-mono text-red-700">{item.expiryDateIso || '—'}</span>
      </li>
    ),
  },
  {
    key: 'actingRoleAlerts',
    icon: '🎭',
    title: 'Acting Roles — Review Required',
    borderCls: 'border-fuchsia-400',
    badgeCls: 'bg-fuchsia-100 text-fuchsia-900',
    countLabel: (n) => `${n} acting role${n !== 1 ? 's' : ''} expiring, overdue, or missing end date`,
    renderItem: (item, i) => {
      const label =
        item.alertType === 'acting_role_overdue'
          ? 'Overdue'
          : item.alertType === 'acting_role_missing_end'
            ? 'No end date'
            : item.daysRemaining != null
              ? `${item.daysRemaining} day${item.daysRemaining !== 1 ? 's' : ''} left`
              : 'Expiring soon';
      return (
        <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
          <span>
            <strong>{item.displayName || 'Staff'}</strong>
            {item.roleTitle ? ` — ${item.roleTitle}` : ''}
            {item.roleBranchId ? ` · ${item.roleBranchId}` : ''}
          </span>
          <span className="flex items-center gap-2">
            <span className={`font-mono ${item.alertType === 'acting_role_overdue' ? 'text-red-700 font-semibold' : 'text-fuchsia-800'}`}>
              {item.endDateIso || label}
            </span>
            {item.userId ? (
              <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="text-[#134e4a] font-bold hover:underline">
                Update →
              </Link>
            ) : null}
          </span>
        </li>
      );
    },
  },
  {
    key: 'compensationReviewDue',
    icon: '💰',
    title: 'Compensation Review Due',
    borderCls: 'border-yellow-500',
    badgeCls: 'bg-yellow-100 text-yellow-900',
    linkTo: hrTabPath(HR_PAYROLL, 'salary-matrix'),
    countLabel: (n) => `${n} above-matrix pay review${n !== 1 ? 's' : ''} due or overdue`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span>
          <strong>{item.displayName || 'Staff'}</strong>
          {item.varianceType ? ` — ${String(item.varianceType).replace(/_/g, ' ')}` : ''}
        </span>
        <span className="flex items-center gap-2">
          <span className={`font-mono ${item.daysRemaining != null && item.daysRemaining < 0 ? 'text-red-700 font-semibold' : 'text-yellow-800'}`}>
            {item.reviewDueIso || '—'}
          </span>
          {item.userId ? (
            <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="text-[#134e4a] font-bold hover:underline">
              Review →
            </Link>
          ) : null}
        </span>
      </li>
    ),
  },
  {
    key: 'undocumentedCompensationVariance',
    icon: '📝',
    title: 'Above-Matrix Pay — Undocumented',
    borderCls: 'border-orange-500',
    badgeCls: 'bg-orange-100 text-orange-900',
    linkTo: hrTabPath(HR_PAYROLL, 'salary-matrix'),
    countLabel: (n) => `${n} staff with pay above matrix but no variance documentation`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span>
          <strong>{item.displayName || 'Staff'}</strong>
          {item.jobTitle ? ` — ${item.jobTitle}` : ''}
        </span>
        <span className="flex items-center gap-2">
          {item.varianceNgn != null ? (
            <span className="font-mono text-orange-800">+₦{Number(item.varianceNgn).toLocaleString()}</span>
          ) : null}
          {item.userId ? (
            <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="text-[#134e4a] font-bold hover:underline">
              Document →
            </Link>
          ) : null}
        </span>
      </li>
    ),
  },
];

function AlertCard({ cfg, items }) {
  const [open, setOpen] = useState(false);
  const count = items.length;
  if (count === 0) return null;
  return (
    <div className={`rounded-xl border-l-4 ${cfg.borderCls} border border-slate-100 bg-white shadow-sm`}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="text-base" aria-hidden>{cfg.icon}</span>
        <span className="flex-1 text-sm font-semibold text-slate-800">{cfg.title}</span>
        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black ${cfg.badgeCls}`}>{count}</span>
        {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
      </button>
      {open ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-[11px] text-slate-500 mb-2">{cfg.countLabel(count)}</p>
          <ul className="space-y-0.5">
            {items.map((item, i) => cfg.renderItem(item, i))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ActionAlertCard({ cfg, items }) {
  const [open, setOpen] = useState(false);
  const count = items.length;
  if (count === 0) return null;
  return (
    <div className={`rounded-xl border-l-4 ${cfg.borderCls} border border-slate-100 bg-white shadow-sm`}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="text-base" aria-hidden>{cfg.icon}</span>
        <span className="flex-1 text-sm font-semibold text-slate-800">{cfg.title}</span>
        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black ${cfg.badgeCls}`}>{count}</span>
        {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
      </button>
      {open ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-[11px] text-slate-500 mb-2">{cfg.countLabel(count)}</p>
          <ul className="space-y-0.5">
            {items.map((item, i) => cfg.renderItem(item, i))}
          </ul>
          {cfg.linkTo ? (
            <Link
              to={cfg.linkTo}
              className="mt-3 inline-block text-xs font-bold text-[#134e4a] hover:underline"
              onClick={() => {
                if (cfg.preselectReport) sessionStorage.setItem('hrReportPreselect', cfg.preselectReport);
              }}
            >
              Review in module →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function HrDashboard() {
  const ws = useWorkspace();
  const permissions = ws?.permissions || [];
  const roleKey = ws?.session?.user?.roleKey;
  const [obs, setObs] = useState(null);
  const [inbox, setInbox] = useState(null);
  const [staffCounts, setStaffCounts] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [profileWorkQueue, setProfileWorkQueue] = useState(null);

  const { loading, error } = useHrListLoad(async () => {
    const [dashRes, alertsRes] = await Promise.all([
      apiFetch('/api/hr/dashboard'),
      apiFetch('/api/hr/dashboard/alerts'),
    ]);
    if (!dashRes.ok || !dashRes.data?.ok) {
      setObs(null);
      setInbox(null);
      setStaffCounts(null);
      setRecentRequests([]);
      setAlerts(null);
      setProfileWorkQueue(null);
      return { error: dashRes.data?.error || 'Could not load HR dashboard.', hasData: false };
    }
    setObs(dashRes.data.observability);
    setInbox(dashRes.data.inbox);
    setStaffCounts(dashRes.data.staffCounts);
    setRecentRequests(dashRes.data.recentRequests || []);
    setProfileWorkQueue(dashRes.data.profileWorkQueue || null);
    if (alertsRes.ok && alertsRes.data?.ok) {
      setAlerts(alertsRes.data.alerts || alertsRes.data);
    } else {
      setAlerts({});
    }
    return { hasData: true };
  }, []);

  if (loading && !obs) {
    return (
      <HrPageBody>
        <ProfileMetricSkeleton count={4} />
      </HrPageBody>
    );
  }

  if (error) {
    return (
      <HrPageBody>
        <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert>
      </HrPageBody>
    );
  }

  const summary = obs?.summary || {};
  const counts = inbox?.counts || {};
  const staff = staffCounts || {};
  const intro = getHrDashboardIntro(roleKey, permissions);
  const overviewKpis = getHrDashboardOverviewKpis({ counts, summary, staff, alerts, permissions });
  const queueLines = getHrDashboardQueueLines(counts, summary, permissions);
  const quickActions = getHrDashboardQuickActions(permissions);
  const showDataQuality = canManageHrSettings(permissions) || canViewHrReports(permissions);

  return (
    <HrPageBody>
      <HrPageIntro title={intro.title} description={intro.description} />

      {showDataQuality ? <HrOperationalReadinessPanel /> : null}

      <ProfileOverviewSection title="Overview" subtitle={`${staff.total ?? '—'} total staff · ${staff.inactive ?? 0} inactive`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overviewKpis.map((kpi) => (
            <Link key={kpi.label} to={kpi.href} className="block">
              <HrKpiCard label={kpi.label} value={kpi.value} tone={kpi.tone} />
            </Link>
          ))}
        </div>
      </ProfileOverviewSection>

      <ProfileOverviewSection title="Today's HR actions" subtitle="Queues and quick links for your role">
        <div className="text-sm text-slate-700">
          {queueLines.length ? (
            <ul className="space-y-2">
              {queueLines.map((line) => (
                <li key={line.label}>
                  <Link to={line.href} className="font-semibold text-[#134e4a] hover:underline">
                    {line.label}:
                  </Link>{' '}
                  {line.count} pending
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No approval queues assigned to your role.</p>
          )}
          {quickActions.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  className={
                    action.primary
                      ? 'rounded-lg border border-[#134e4a]/20 bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39]'
                      : 'rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50'
                  }
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </ProfileOverviewSection>

      <HrProfileWorkPanel queue={profileWorkQueue} />

      {alerts !== null ? (
        <ProfileOverviewSection title="Action required" subtitle="Workflow items needing HR attention">
          <div className="space-y-2">
            {ACTION_ALERT_CONFIGS.every((cfg) => !((alerts[cfg.key] || []).length)) ? (
              <ProfileInlineAlert variant="success">No pending workflow actions</ProfileInlineAlert>
            ) : (
              ACTION_ALERT_CONFIGS.map((cfg) => (
                <ActionAlertCard key={cfg.key} cfg={cfg} items={alerts[cfg.key] || []} />
              ))
            )}
          </div>
        </ProfileOverviewSection>
      ) : null}

      {alerts !== null ? (
        <ProfileOverviewSection title="Alerts & reminders" subtitle="Probation, contracts, birthdays, and document expiry">
          <div className="space-y-2">
            {ALERT_CONFIGS.every((cfg) => !((alerts[cfg.key] || []).length)) ? (
              <ProfileInlineAlert variant="success">No calendar alerts today</ProfileInlineAlert>
            ) : (
              ALERT_CONFIGS.map((cfg) => (
                <AlertCard key={cfg.key} cfg={cfg} items={alerts[cfg.key] || []} />
              ))
            )}
          </div>
        </ProfileOverviewSection>
      ) : null}

      {recentRequests.length > 0 ? (
        <ProfileOverviewSection title="Recent requests" subtitle="Latest employee requests across the org">
          <div className="overflow-x-auto">
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTh>Kind</AppTableTh>
                  <AppTableTh>Employee</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh>Updated</AppTableTh>
                </AppTableThead>
                <AppTableBody>
                  {recentRequests.map((r) => (
                    <AppTableTr key={r.id}>
                      <AppTableTd>{r.kind}</AppTableTd>
                      <AppTableTd>
                        {r.staffDisplayName ? (
                          <Link
                            to={`${HR_EMPLOYEES}/${encodeURIComponent(r.userId)}`}
                            className="font-semibold text-[#134e4a] hover:underline"
                          >
                            {r.staffDisplayName}
                          </Link>
                        ) : (
                          r.userId
                        )}
                      </AppTableTd>
                      <AppTableTd>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${hrRequestStatusClass(r.status)}`}
                        >
                          {r.status}
                        </span>
                      </AppTableTd>
                      <AppTableTd monospace>{r.updatedAtIso?.slice(0, 10) || '—'}</AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </div>
        </ProfileOverviewSection>
      ) : null}
    </HrPageBody>
  );
}
