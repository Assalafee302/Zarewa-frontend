import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock,
  FileText,
  Pen,
  RefreshCw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WS_SECTION_LABEL } from '../../lib/workspaceUiTokens';

function IntelCard({ title, icon, children, action }) {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className={`flex items-center gap-1.5 ${WS_SECTION_LABEL}`}>
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function WorkspaceIntelligencePanel({
  intelligence = null,
  officeSummary = null,
  canOffice = false,
  onCompose,
  onNavigateView,
  onRefresh,
  refreshing = false,
  belowAccent = null,
  degraded = false,
  lastRefreshedLabel = '',
}) {
  const ws = useWorkspace();
  const roleKey = ws?.session?.user?.roleKey;
  const counts = intelligence?.counts || {};
  const suggestions = intelligence?.suggestions || [];
  const priorities = intelligence?.priorities?.actionRequired || [];

  const canFinance = ws?.hasPermission?.('finance.view');
  const canSales = ws?.canAccessModule?.('sales');
  const canProcurement = ws?.canAccessModule?.('procurement');
  const canOperations = ws?.canAccessModule?.('operations');
  const canMonitor =
    roleKey === 'admin' || roleKey === 'ceo' || roleKey === 'md' || roleKey === 'sales_manager';

  return (
    <aside className="space-y-4" aria-label="Workspace intelligence">
      {belowAccent ? (
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">{belowAccent}</div>
      ) : null}

      <IntelCard
        title="Today's priorities"
        icon={<Clock size={13} className="text-teal-700" aria-hidden />}
        action={
          <button
            type="button"
            disabled={refreshing}
            onClick={onRefresh}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Refresh priorities"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Action required" value={counts.actionRequired ?? 0} tone="teal" />
          <StatCard label="Overdue" value={counts.overdue ?? 0} tone={counts.overdue > 0 ? 'rose' : 'slate'} />
          <StatCard label="Pending approvals" value={counts.pendingApprovals ?? 0} tone="amber" />
          <StatCard label="Unread memos" value={officeSummary?.unreadApprox ?? counts.unreadMemos ?? 0} tone="slate" />
        </div>

        {priorities.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {priorities.slice(0, 4).map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs text-slate-700"
              >
                <p className="line-clamp-1 font-semibold text-slate-900">{item.title}</p>
                <p className="mt-0.5 line-clamp-1 text-slate-500">
                  {item.referenceNo} · {item.categoryLabel}
                  {item.actionLabel ? ` · ${item.actionLabel}` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-xs text-emerald-900">
            You&apos;re all caught up. No items require your action right now.
          </p>
        )}

        {priorities.length > 4 ? (
          <button
            type="button"
            onClick={() => onNavigateView?.({ view: 'needs_action' })}
            className="mt-2 text-[11px] font-semibold text-teal-800 hover:underline"
          >
            View all priorities
          </button>
        ) : null}
      </IntelCard>

      {suggestions.length > 0 ? (
        <IntelCard title="Smart suggestions" icon={<Sparkles size={13} className="text-teal-700" aria-hidden />}>
          <ul className="space-y-2">
            {suggestions.slice(0, 5).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onNavigateView?.({ view: s.view, category: s.category })}
                  className="flex w-full items-start gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 text-left text-xs hover:border-teal-200 hover:bg-teal-50/30"
                >
                  <ArrowRight size={14} className="mt-0.5 shrink-0 text-teal-700" aria-hidden />
                  <span>
                    <span className="font-semibold text-slate-900">{s.label}</span>
                    <span className="mt-0.5 block text-slate-500">{s.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </IntelCard>
      ) : null}

      <IntelCard title="Quick actions" icon={<Pen size={13} className="text-teal-700" aria-hidden />}>
        <div className="flex flex-wrap gap-2">
          {canOffice ? <QuickAction icon={<Pen size={14} />} label="Compose Memo" onClick={onCompose} /> : null}
          {canMonitor ? (
            <QuickAction icon={<BarChart3 size={14} />} label="HQ Monitoring" to="/workspace/monitoring" />
          ) : null}
          {canFinance ? <QuickAction icon={<Wallet size={14} />} label="Open Refunds" to="/accounts" /> : null}
          {canSales ? <QuickAction icon={<FileText size={14} />} label="Sales" to="/sales" /> : null}
          {canProcurement ? (
            <QuickAction icon={<AlertTriangle size={14} />} label="Procurement" to="/procurement" />
          ) : null}
          {canOperations ? <QuickAction icon={<Clock size={14} />} label="Production" to="/operations" /> : null}
        </div>
      </IntelCard>

      <IntelCard title="System status" icon={<RefreshCw size={13} className="text-slate-500" aria-hidden />}>
        <dl className="space-y-1.5 text-xs text-slate-600">
          {lastRefreshedLabel ? (
            <div className="flex justify-between gap-2">
              <dt>Last refreshed</dt>
              <dd className="font-medium text-slate-800">{lastRefreshedLabel}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt>Data mode</dt>
            <dd className={`font-medium ${degraded ? 'text-amber-800' : 'text-emerald-800'}`}>
              {degraded ? 'Cached snapshot' : 'Live sync'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Unfiled records</dt>
            <dd className="font-medium tabular-nums text-slate-800">{counts.unfiled ?? 0}</dd>
          </div>
        </dl>
        {degraded ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900">
            Reconnect for live counts and actions.
          </p>
        ) : null}
      </IntelCard>
    </aside>
  );
}

function StatCard({ label, value, tone = 'slate' }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-900 ring-teal-100',
    rose: 'bg-rose-50 text-rose-900 ring-rose-100',
    amber: 'bg-amber-50 text-amber-900 ring-amber-100',
    slate: 'bg-slate-50 text-slate-800 ring-slate-100',
  };
  return (
    <div className={`rounded-lg px-3 py-2 ring-1 ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick, to }) {
  const cls =
    'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50/50';
  if (to) {
    return (
      <Link to={to} className={cls}>
        {icon}
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  );
}

/** @deprecated Use WorkspaceIntelligencePanel */
export function WorkspaceUpdatesPanel(props) {
  return <WorkspaceIntelligencePanel {...props} />;
}
