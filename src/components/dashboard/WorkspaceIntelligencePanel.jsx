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

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-teal-700 to-teal-500" aria-hidden />
      {belowAccent ? (
        <div className="border-b border-slate-100 bg-slate-50/40 px-4 py-4 md:px-5 md:py-5">{belowAccent}</div>
      ) : null}

      <div className="p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Command center</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Today&apos;s priorities</h2>
          </div>
          <button
            type="button"
            disabled={refreshing}
            onClick={onRefresh}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {degraded ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Workspace is using a cached snapshot. Reconnect for live counts and actions.
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Action required" value={counts.actionRequired ?? 0} tone="teal" />
          <StatCard label="Overdue" value={counts.overdue ?? 0} tone={counts.overdue > 0 ? 'rose' : 'slate'} />
          <StatCard label="Approvals" value={counts.pendingApprovals ?? 0} tone="amber" />
          <StatCard label="Unfiled" value={counts.unfiled ?? 0} tone="slate" />
        </div>

        {canOffice && officeSummary ? (
          <p className="mt-3 text-[11px] text-slate-600">
            Internal memos:{' '}
            <span className="font-semibold text-slate-800">
              {officeSummary.pendingActionApprox ?? 0} awaiting response · {officeSummary.unreadApprox ?? 0} unread
            </span>
          </p>
        ) : null}

        {priorities.length > 0 ? (
          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Needs attention</p>
            <ul className="mt-2 space-y-2">
              {priorities.slice(0, 5).map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-slate-200/90 bg-slate-50/50 px-3 py-2 text-xs text-slate-700"
                >
                  <p className="line-clamp-1 font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-slate-500">
                    {item.referenceNo} · {item.categoryLabel}
                    {item.actionLabel ? ` · ${item.actionLabel}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 px-3 py-3 text-xs text-emerald-900">
            No action required. You&apos;re all caught up.
          </div>
        )}

        <div className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <Sparkles size={12} />
            Smart suggestions
          </p>
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onNavigateView?.({ view: s.view, category: s.category })}
                  className="flex w-full items-start gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 text-left text-xs hover:border-teal-200 hover:bg-teal-50/30"
                >
                  <ArrowRight size={14} className="mt-0.5 shrink-0 text-teal-700" />
                  <span>
                    <span className="font-semibold text-slate-900">{s.label}</span>
                    <span className="mt-0.5 block text-slate-500">{s.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Quick actions</p>
          <div className="flex flex-wrap gap-2">
            {canOffice ? (
              <QuickAction icon={<Pen size={14} />} label="Compose Memo" onClick={onCompose} />
            ) : null}
            {roleKey === 'admin' || roleKey === 'ceo' || roleKey === 'md' || roleKey === 'sales_manager' ? (
              <QuickAction icon={<BarChart3 size={14} />} label="HQ Monitoring" to="/workspace/monitoring" />
            ) : null}
            {canFinance ? (
              <QuickAction icon={<Wallet size={14} />} label="Finance" to="/accounts" />
            ) : null}
            {canSales ? <QuickAction icon={<FileText size={14} />} label="Sales" to="/sales" /> : null}
            {canProcurement ? (
              <QuickAction icon={<AlertTriangle size={14} />} label="Procurement" to="/procurement" />
            ) : null}
            {canOperations ? (
              <QuickAction icon={<Clock size={14} />} label="Production" to="/operations" />
            ) : null}
          </div>
        </div>
      </div>
    </section>
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
    <div className={`rounded-xl px-3 py-2.5 ring-1 ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick, to }) {
  const cls =
    'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm hover:border-teal-200 hover:bg-teal-50/50';
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
