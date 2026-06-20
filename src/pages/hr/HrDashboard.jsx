import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  Cake,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  DoorOpen,
  FileText,
  FileWarning,
  PartyPopper,
  ScrollText,
  Timer,
  TrendingUp,
  UserCog,
  Wallet,
  FilePenLine,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { hrRequestStatusClass } from '../../lib/hrFormat';
import { canManageHrSettings, canViewHrReports } from '../../lib/hrAccess';
import {
  getHrDashboardAttentionCount,
  getHrDashboardIntro,
  getHrDashboardOverviewKpis,
  getHrDashboardQuickActions,
  getHrDashboardQueueLines,
} from '../../lib/hrDashboardUi';
import { HR_TIME_ABSENCE, HR_DEVELOPMENT, HR_DISCIPLINE_EXIT, HR_DOCUMENTS, HR_EMPLOYEES, HR_PAYROLL, hrTabPath } from '../../lib/hrRoutes';
import { HrKpiCard } from '../../components/hr/HrKpiCard';
import { HrOperationalReadinessPanel } from '../../components/hr/HrOperationalReadinessPanel';
import { HrProductionReadinessPanel } from '../../components/hr/HrProductionReadinessPanel';
import { HrPageBody } from '../../components/hr/hrPageUi';
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

const ACTION_ALERT_KEYS = [
  'absenceAwaitingReview',
  'exitClearancePending',
  'promotionDue',
  'missingPolicyAck',
  'pendingTransfers',
  'expiredDocuments',
  'actingRoleAlerts',
  'compensationReviewDue',
  'undocumentedCompensationVariance',
];

const CALENDAR_ALERT_KEYS = [
  'probationEnding',
  'contractsExpiring',
  'birthdays',
  'anniversaries',
  'documentsExpiring',
  'trainingExpiring',
  'temporaryEmployees',
  'voluntaryTerminationRisk',
];

const ALERT_CONFIGS = [
  {
    key: 'probationEnding',
    Icon: Clock,
    title: 'Probation ending soon',
    borderCls: 'border-amber-400',
    badgeCls: 'bg-amber-100 text-amber-900',
    countLabel: (n) => `${n} staff member${n !== 1 ? 's' : ''} with probation ending within 30 days`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.displayName}</strong>
          {item.jobTitle ? ` — ${item.jobTitle}` : ''}
          {item.branchId ? ` · ${item.branchId}` : ''}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-amber-700">{item.probationEndIso}</span>
          {item.userId ? (
            <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="font-bold text-[#134e4a] hover:underline">
              Confirm →
            </Link>
          ) : null}
        </span>
      </li>
    ),
  },
  {
    key: 'contractsExpiring',
    Icon: FileText,
    title: 'Contracts expiring',
    borderCls: 'border-orange-400',
    badgeCls: 'bg-orange-100 text-orange-900',
    countLabel: (n) => `${n} contract${n !== 1 ? 's' : ''} expiring within 60 days`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <strong>{item.displayName}</strong>
        <span className="font-mono text-orange-700">{item.contractEndIso}</span>
      </li>
    ),
  },
  {
    key: 'birthdays',
    Icon: Cake,
    title: 'Birthdays this week',
    borderCls: 'border-rose-400',
    badgeCls: 'bg-rose-100 text-rose-900',
    countLabel: (n) => `${n} birthday${n !== 1 ? 's' : ''} this week`,
    renderItem: (item, i) => (
      <li key={i} className="border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <strong>{item.displayName}</strong>
      </li>
    ),
  },
  {
    key: 'anniversaries',
    Icon: PartyPopper,
    title: 'Work anniversaries',
    borderCls: 'border-violet-400',
    badgeCls: 'bg-violet-100 text-violet-900',
    countLabel: (n) => `${n} work anniversar${n !== 1 ? 'ies' : 'y'} this week`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <strong>{item.displayName}</strong>
        {item.yearsCompleted != null ? (
          <span className="font-semibold text-violet-700">
            {item.yearsCompleted} yr{item.yearsCompleted !== 1 ? 's' : ''}
          </span>
        ) : null}
      </li>
    ),
  },
  {
    key: 'documentsExpiring',
    Icon: FileWarning,
    title: 'Documents expiring',
    borderCls: 'border-red-400',
    badgeCls: 'bg-red-100 text-red-900',
    countLabel: (n) => `${n} document${n !== 1 ? 's' : ''} expiring within 60 days`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.displayName}</strong>
          {item.docType ? ` — ${item.docType}` : ''}
        </span>
        <span className="font-mono text-red-700">{item.expiryIso}</span>
      </li>
    ),
  },
  {
    key: 'trainingExpiring',
    Icon: BookOpen,
    title: 'Training expiring',
    borderCls: 'border-amber-500',
    badgeCls: 'bg-amber-100 text-amber-950',
    countLabel: (n) => `${n} training certification${n !== 1 ? 's' : ''} expiring within 60 days`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.displayName}</strong>
          {item.courseName ? ` — ${item.courseName}` : ''}
        </span>
        <span className="font-mono text-amber-800">{item.expiryIso}</span>
      </li>
    ),
  },
  {
    key: 'temporaryEmployees',
    Icon: Timer,
    title: 'Temporary / contract staff',
    borderCls: 'border-teal-500',
    badgeCls: 'bg-teal-50 text-teal-900',
    countLabel: (n) => `${n} temporary staff alert${n !== 1 ? 's' : ''}`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.displayName}</strong> — {String(item.alertType || '').replace(/_/g, ' ')}
        </span>
        {item.contractEndIso ? <span className="font-mono text-teal-800">{item.contractEndIso}</span> : null}
      </li>
    ),
  },
  {
    key: 'voluntaryTerminationRisk',
    Icon: AlertTriangle,
    title: 'Absence — termination risk',
    borderCls: 'border-red-500',
    badgeCls: 'bg-red-100 text-red-900',
    countLabel: (n) => `${n} staff with 3-day no-show risk`,
    renderItem: (item, i) => (
      <li key={i} className="border-b border-slate-100 py-1 text-xs text-red-900 last:border-0">
        <strong>{item.displayName}</strong> — {item.consecutiveDays} consecutive absent days (HR action required)
      </li>
    ),
  },
];

const ACTION_ALERT_CONFIGS = [
  {
    key: 'absenceAwaitingReview',
    Icon: ClipboardList,
    title: 'Absence reports — HR review',
    borderCls: 'border-amber-500',
    badgeCls: 'bg-amber-100 text-amber-900',
    linkTo: hrTabPath(HR_TIME_ABSENCE, 'attendance', { section: 'exceptions' }),
    countLabel: (n) => `${n} absence report${n !== 1 ? 's' : ''} awaiting HR review`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.staffDisplayName || item.displayName || 'Staff'}</strong> — {item.absenceType || 'absence'}
        </span>
        <span className="font-mono text-slate-500">{item.absenceStartIso?.slice(0, 10) || '—'}</span>
      </li>
    ),
  },
  {
    key: 'exitClearancePending',
    Icon: DoorOpen,
    title: 'Exit clearance pending',
    borderCls: 'border-violet-400',
    badgeCls: 'bg-violet-100 text-violet-900',
    linkTo: hrTabPath(HR_DISCIPLINE_EXIT, 'exit-clearance'),
    countLabel: (n) => `${n} exit clearance${n !== 1 ? 's' : ''} in progress`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.staffDisplayName || item.displayName || 'Staff'}</strong>
        </span>
        <span className="text-[10px] font-bold uppercase text-violet-800">{item.status?.replace(/_/g, ' ')}</span>
      </li>
    ),
  },
  {
    key: 'promotionDue',
    Icon: TrendingUp,
    title: 'Staff due for promotion',
    borderCls: 'border-emerald-400',
    badgeCls: 'bg-emerald-100 text-emerald-900',
    linkTo: hrTabPath(HR_DEVELOPMENT, 'promotions'),
    countLabel: (n) => `${n} staff due for promotion review`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.displayName || 'Staff'}</strong>
          {item.jobTitle ? ` — ${item.jobTitle}` : ''}
        </span>
        {item.dueDateIso ? <span className="font-mono text-emerald-800">{item.dueDateIso}</span> : null}
      </li>
    ),
  },
  {
    key: 'missingPolicyAck',
    Icon: ScrollText,
    title: 'Missing policy acknowledgements',
    borderCls: 'border-slate-400',
    badgeCls: 'bg-slate-100 text-slate-900',
    linkTo: hrTabPath(HR_DOCUMENTS, 'policies'),
    countLabel: (n) => `${n} staff missing handbook or confidentiality acknowledgement`,
    renderItem: (item, i) => (
      <li key={i} className="border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <strong>{item.displayName || 'Staff'}</strong>
        {item.userId ? (
          <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="ml-2 font-bold text-[#134e4a] hover:underline">
            View →
          </Link>
        ) : null}
      </li>
    ),
  },
  {
    key: 'pendingTransfers',
    Icon: ArrowLeftRight,
    title: 'Transfer requests pending',
    borderCls: 'border-indigo-400',
    badgeCls: 'bg-indigo-100 text-indigo-900',
    linkTo: hrTabPath(HR_DISCIPLINE_EXIT, 'transfers'),
    countLabel: (n) => `${n} transfer request${n !== 1 ? 's' : ''} awaiting action`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.staffDisplayName || 'Staff'}</strong> — {String(item.transferType || '').replace(/_/g, ' ')}
        </span>
        <span className="text-[10px] font-bold uppercase text-indigo-800">{item.status?.replace(/_/g, ' ')}</span>
      </li>
    ),
  },
  {
    key: 'expiredDocuments',
    Icon: AlertCircle,
    title: 'Expired / missing documents',
    borderCls: 'border-red-400',
    badgeCls: 'bg-red-100 text-red-900',
    linkTo: hrTabPath(HR_DOCUMENTS, 'reports'),
    preselectReport: 'document-expiry',
    countLabel: (n) => `${n} expired document record${n !== 1 ? 's' : ''}`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.displayName || 'Staff'}</strong>
          {item.docKind ? ` — ${item.docKind}` : ''}
        </span>
        <span className="font-mono text-red-700">{item.expiryDateIso || '—'}</span>
      </li>
    ),
  },
  {
    key: 'actingRoleAlerts',
    Icon: UserCog,
    title: 'Acting roles — review required',
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
        <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
          <span>
            <strong>{item.displayName || 'Staff'}</strong>
            {item.roleTitle ? ` — ${item.roleTitle}` : ''}
            {item.roleBranchId ? ` · ${item.roleBranchId}` : ''}
          </span>
          <span className="flex items-center gap-2">
            <span className={`font-mono ${item.alertType === 'acting_role_overdue' ? 'font-semibold text-red-700' : 'text-fuchsia-800'}`}>
              {item.endDateIso || label}
            </span>
            {item.userId ? (
              <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="font-bold text-[#134e4a] hover:underline">
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
    Icon: Wallet,
    title: 'Compensation review due',
    borderCls: 'border-yellow-500',
    badgeCls: 'bg-yellow-100 text-yellow-900',
    linkTo: hrTabPath(HR_PAYROLL, 'salary-matrix'),
    countLabel: (n) => `${n} above-matrix pay review${n !== 1 ? 's' : ''} due or overdue`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.displayName || 'Staff'}</strong>
          {item.varianceType ? ` — ${String(item.varianceType).replace(/_/g, ' ')}` : ''}
        </span>
        <span className="flex items-center gap-2">
          <span className={`font-mono ${item.daysRemaining != null && item.daysRemaining < 0 ? 'font-semibold text-red-700' : 'text-yellow-800'}`}>
            {item.reviewDueIso || '—'}
          </span>
          {item.userId ? (
            <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="font-bold text-[#134e4a] hover:underline">
              Review →
            </Link>
          ) : null}
        </span>
      </li>
    ),
  },
  {
    key: 'undocumentedCompensationVariance',
    Icon: FilePenLine,
    title: 'Above-matrix pay — undocumented',
    borderCls: 'border-orange-500',
    badgeCls: 'bg-orange-100 text-orange-900',
    linkTo: hrTabPath(HR_PAYROLL, 'salary-matrix'),
    countLabel: (n) => `${n} staff with pay above matrix but no variance documentation`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-xs text-slate-700 last:border-0">
        <span>
          <strong>{item.displayName || 'Staff'}</strong>
          {item.jobTitle ? ` — ${item.jobTitle}` : ''}
        </span>
        <span className="flex items-center gap-2">
          {item.varianceNgn != null ? (
            <span className="font-mono text-orange-800">+₦{Number(item.varianceNgn).toLocaleString()}</span>
          ) : null}
          {item.userId ? (
            <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(item.userId)}`} className="font-bold text-[#134e4a] hover:underline">
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
  const Icon = cfg.Icon;
  if (count === 0) return null;
  return (
    <div className={`rounded-xl border border-slate-100 border-l-4 ${cfg.borderCls} bg-white shadow-sm`}>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Icon size={16} className="shrink-0 text-slate-500" aria-hidden />
        <span className="flex-1 text-sm font-semibold text-slate-800">{cfg.title}</span>
        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black ${cfg.badgeCls}`}>
          {count}
        </span>
        {open ? <ChevronDown size={14} className="shrink-0 text-slate-400" /> : <ChevronRight size={14} className="shrink-0 text-slate-400" />}
      </button>
      {open ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="mb-2 text-[11px] text-slate-500">{cfg.countLabel(count)}</p>
          <ul className="space-y-0.5">{items.map((item, i) => cfg.renderItem(item, i))}</ul>
        </div>
      ) : null}
    </div>
  );
}

function ActionAlertCard({ cfg, items }) {
  const [open, setOpen] = useState(false);
  const count = items.length;
  const Icon = cfg.Icon;
  if (count === 0) return null;
  return (
    <div className={`rounded-xl border border-slate-100 border-l-4 ${cfg.borderCls} bg-white shadow-sm`}>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Icon size={16} className="shrink-0 text-slate-500" aria-hidden />
        <span className="flex-1 text-sm font-semibold text-slate-800">{cfg.title}</span>
        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black ${cfg.badgeCls}`}>
          {count}
        </span>
        {open ? <ChevronDown size={14} className="shrink-0 text-slate-400" /> : <ChevronRight size={14} className="shrink-0 text-slate-400" />}
      </button>
      {open ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="mb-2 text-[11px] text-slate-500">{cfg.countLabel(count)}</p>
          <ul className="space-y-0.5">{items.map((item, i) => cfg.renderItem(item, i))}</ul>
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
  const [readiness, setReadiness] = useState(null);

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
      setReadiness(null);
      return { error: dashRes.data?.error || 'Could not load HR dashboard.', hasData: false };
    }
    setObs(dashRes.data.observability);
    setInbox(dashRes.data.inbox);
    setStaffCounts(dashRes.data.staffCounts);
    setRecentRequests(dashRes.data.recentRequests || []);
    setProfileWorkQueue(dashRes.data.profileWorkQueue || null);
    setReadiness(dashRes.data.readiness || null);
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
  const showAdminPanels = canManageHrSettings(permissions) || canViewHrReports(permissions);
  const attentionCount = getHrDashboardAttentionCount(alerts, ACTION_ALERT_KEYS, CALENDAR_ALERT_KEYS);
  const actionAlertCount = getHrDashboardAttentionCount(alerts, ACTION_ALERT_KEYS, []);
  const calendarAlertCount = getHrDashboardAttentionCount(alerts, [], CALENDAR_ALERT_KEYS);

  return (
    <HrPageBody>
      <header className="border-b border-slate-100 pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-600/90">Human Resources</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#134e4a] sm:text-3xl">{intro.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{intro.description}</p>
      </header>

      {attentionCount > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-bold text-amber-950">{attentionCount} item{attentionCount !== 1 ? 's' : ''} need attention</p>
          <p className="mt-1 text-xs text-amber-900/80">
            {actionAlertCount > 0 ? `${actionAlertCount} workflow action${actionAlertCount !== 1 ? 's' : ''}` : null}
            {actionAlertCount > 0 && calendarAlertCount > 0 ? ' · ' : null}
            {calendarAlertCount > 0 ? `${calendarAlertCount} calendar reminder${calendarAlertCount !== 1 ? 's' : ''}` : null}
          </p>
        </div>
      ) : (
        <ProfileInlineAlert variant="success">All clear — no workflow actions or calendar reminders right now.</ProfileInlineAlert>
      )}

      {showAdminPanels ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <HrProductionReadinessPanel readiness={readiness} />
          <HrOperationalReadinessPanel />
        </div>
      ) : null}

      <ProfileOverviewSection title="Overview" subtitle={`${staff.total ?? '—'} total staff · ${staff.inactive ?? 0} inactive`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {overviewKpis.map((kpi) => (
            <Link key={kpi.label} to={kpi.href} className="block no-underline">
              <HrKpiCard label={kpi.label} value={kpi.value} hint={kpi.hint} tone={kpi.tone} />
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
              ACTION_ALERT_CONFIGS.map((cfg) => <ActionAlertCard key={cfg.key} cfg={cfg} items={alerts[cfg.key] || []} />)
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
              ALERT_CONFIGS.map((cfg) => <AlertCard key={cfg.key} cfg={cfg} items={alerts[cfg.key] || []} />)
            )}
          </div>
        </ProfileOverviewSection>
      ) : null}

      <ProfileOverviewSection title="Recent requests" subtitle="Latest employee requests across the org">
        {recentRequests.length > 0 ? (
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
        ) : (
          <ProfileInlineAlert variant="success">No recent employee requests.</ProfileInlineAlert>
        )}
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
