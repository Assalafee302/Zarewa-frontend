import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { hrRequestStatusClass } from '../../lib/hrFormat';
import { HR_ATTENDANCE, HR_DEVELOPMENT, HR_DISCIPLINE_EXIT, HR_DOCUMENTS, HR_EMPLOYEES, HR_PAYROLL, HR_REQUESTS, hrTabPath } from '../../lib/hrRoutes';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HrKpiCard } from '../../components/hr/HrKpiCard';
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
    key: 'overtimeAwaitingApproval',
    icon: '⏱',
    title: 'Overtime — Awaiting Approval',
    borderCls: 'border-blue-400',
    badgeCls: 'bg-blue-100 text-blue-900',
    linkTo: hrTabPath(HR_ATTENDANCE, 'overtime'),
    countLabel: (n) => `${n} overtime request${n !== 1 ? 's' : ''} pending approval`,
    renderItem: (item, i) => (
      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0">
        <span><strong>{item.staffDisplayName || item.displayName || 'Staff'}</strong></span>
        <span className="font-mono text-slate-500">{item.overtimeDateIso?.slice(0, 10) || item.status}</span>
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
  const [obs, setObs] = useState(null);
  const [inbox, setInbox] = useState(null);
  const [staffCounts, setStaffCounts] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [alerts, setAlerts] = useState(null);

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
      return { error: dashRes.data?.error || 'Could not load HR dashboard.', hasData: false };
    }
    setObs(dashRes.data.observability);
    setInbox(dashRes.data.inbox);
    setStaffCounts(dashRes.data.staffCounts);
    setRecentRequests(dashRes.data.recentRequests || []);
    if (alertsRes.ok && alertsRes.data?.ok) {
      setAlerts(alertsRes.data.alerts || alertsRes.data);
    } else {
      setAlerts({});
    }
    return { hasData: true };
  }, []);

  if (loading && !obs) {
    return <p className="text-sm text-slate-600">Loading HR dashboard…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
    );
  }

  const summary = obs?.summary || {};
  const counts = inbox?.counts || {};
  const staff = staffCounts || {};

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Overview</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link to={HR_EMPLOYEES} className="block"><HrKpiCard label="Active staff" value={staff.active ?? summary.activeStaff ?? '—'} tone="teal" /></Link>
          <Link to={HR_EMPLOYEES} className="block">
            <HrKpiCard
              label="On probation"
              value={staff.onProbation ?? alerts?.probationEnding?.length ?? 0}
              tone={Number(staff.onProbation ?? alerts?.probationEnding?.length ?? 0) > 0 ? 'amber' : 'default'}
            />
          </Link>
          <Link to={HR_REQUESTS} className="block">
            <HrKpiCard
              label="Pending requests"
              value={counts.pendingHrReview ?? summary.pendingHrReview ?? 0}
              tone={Number(counts.pendingHrReview ?? summary.pendingHrReview) > 0 ? 'amber' : 'default'}
            />
          </Link>
          <Link to="/hr/discipline-exit?tab=incidents" className="block">
            <HrKpiCard
              label="Open incidents"
              value={summary.openIncidents ?? 0}
              tone={Number(summary.openIncidents) > 0 ? 'amber' : 'default'}
            />
          </Link>
        </div>
        <p className="mt-2 text-xs text-slate-500 tabular-nums">
          {staff.total ?? '—'} total staff · {staff.inactive ?? 0} inactive
        </p>
      </section>

      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Today&apos;s HR actions</h2>
        <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700 shadow-sm">
          <ul className="space-y-2">
            <li>
              <span className="font-semibold text-[#134e4a]">HR queue:</span>{' '}
              {counts.pendingHrReview ?? 0} awaiting HR review
            </li>
            <li>
              <span className="font-semibold text-[#134e4a]">Branch endorsements:</span>{' '}
              {counts.pendingBranchEndorse ?? summary.pendingBranchEndorse ?? 0}
            </li>
            <li>
              <span className="font-semibold text-[#134e4a]">GM HR final:</span>{' '}
              {counts.pendingGmHrReview ?? summary.pendingGmHrReview ?? 0}
            </li>
            <li>
              <span className="font-semibold text-[#134e4a]">Draft payroll runs:</span>{' '}
              {counts.draftPayrollRuns ?? 0}
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`${HR_EMPLOYEES}?tab=directory&register=1`}
              className="rounded-lg border border-[#134e4a]/20 bg-[#134e4a] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d39]"
            >
              Register employee
            </Link>
            <Link
              to={HR_REQUESTS}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
            >
              Review requests
            </Link>
            <Link
              to={HR_PAYROLL}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
            >
              Create payroll run
            </Link>
            <Link
              to={hrTabPath(HR_DOCUMENTS, 'reports')}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
            >
              Open reports
            </Link>
          </div>
        </div>
      </section>

      {alerts !== null ? (
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Action required</h2>
          <div className="mt-3 space-y-2">
            {ACTION_ALERT_CONFIGS.every((cfg) => !((alerts[cfg.key] || []).length)) ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <span aria-hidden>✓</span> No pending Phase 2 workflow actions
              </div>
            ) : (
              ACTION_ALERT_CONFIGS.map((cfg) => (
                <ActionAlertCard key={cfg.key} cfg={cfg} items={alerts[cfg.key] || []} />
              ))
            )}
          </div>
        </section>
      ) : null}

      {alerts !== null ? (
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Alerts &amp; Reminders</h2>
          <div className="mt-3 space-y-2">
            {ALERT_CONFIGS.every((cfg) => !((alerts[cfg.key] || []).length)) ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <span aria-hidden>✓</span> No calendar alerts today
              </div>
            ) : (
              ALERT_CONFIGS.map((cfg) => (
                <AlertCard key={cfg.key} cfg={cfg} items={alerts[cfg.key] || []} />
              ))
            )}
          </div>
        </section>
      ) : null}

      {recentRequests.length > 0 ? (
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Recent requests</h2>
          <div className="mt-3 overflow-x-auto">
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
        </section>
      ) : null}

      <p className="text-xs text-slate-500">
        HQ payroll is prepared centrally. Branch salary contributions are tracked for MD review and do not block payroll
        payment.
      </p>
    </div>
  );
}
