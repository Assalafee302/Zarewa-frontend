import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { hrRequestStatusClass } from '../../lib/hrFormat';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

function StatCard({ label, value, tone = 'slate', to }) {
  const tones = {
    slate: 'border-slate-100 bg-white text-slate-900',
    amber: 'border-amber-100 bg-amber-50/50 text-amber-950',
    emerald: 'border-emerald-100 bg-emerald-50/40 text-emerald-950',
    red: 'border-red-100 bg-red-50/40 text-red-950',
  };
  const inner = (
    <>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
    </>
  );
  const cls = `rounded-2xl border px-4 py-4 shadow-sm block ${tones[tone] || tones.slate} ${to ? 'hover:border-[#134e4a]/30 transition-colors' : ''}`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

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
            <Link to={`/hr/staff/${encodeURIComponent(item.userId)}`} className="text-[#134e4a] font-bold hover:underline">Confirm →</Link>
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
          <StatCard label="Active staff" value={staff.active ?? summary.activeStaff ?? '—'} to="/hr/staff" />
          <StatCard
            label="Incomplete profiles"
            value={staff.incompleteProfiles ?? 0}
            tone={Number(staff.incompleteProfiles) > 0 ? 'amber' : 'slate'}
            to="/hr/staff"
          />
          <StatCard
            label="Pending HR review"
            value={counts.pendingHrReview ?? summary.pendingHrReview ?? 0}
            tone={Number(counts.pendingHrReview ?? summary.pendingHrReview) > 0 ? 'amber' : 'slate'}
            to="/hr/requests"
          />
          <StatCard
            label="Overdue requests"
            value={counts.overdueRequests ?? summary.overdueRequests ?? 0}
            tone={Number(counts.overdueRequests ?? summary.overdueRequests) > 0 ? 'red' : 'emerald'}
            to="/hr/requests"
          />
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
              to="/hr/staff"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
            >
              Staff directory
            </Link>
            <Link
              to="/hr/requests"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
            >
              HR requests
            </Link>
            <Link
              to="/hr/payroll"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#134e4a] hover:bg-slate-50"
            >
              Payroll
            </Link>
          </div>
        </div>
      </section>

      {alerts !== null ? (
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Alerts &amp; Reminders</h2>
          <div className="mt-3 space-y-2">
            {ALERT_CONFIGS.every((cfg) => !((alerts[cfg.key] || []).length)) ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <span aria-hidden>✓</span> No alerts today
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
          <div className="mt-3">
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
                            to={`/hr/staff/${encodeURIComponent(r.userId)}`}
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
