import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Clock,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react';
import { PageHeader, PageShell, PageTabs, MainPanel } from '../components/layout';
import { useWorkspace } from '../context/WorkspaceContext';
import { formatNgn } from '../Data/mockData';
import { OT_STATUS, OT_STATUS_LABELS } from '../lib/otConstants';
import { listOtRequests } from '../lib/otRequestsApi';
import {
  buildOtIntelFromRows,
  normalizeOtHubTab,
  OT_HUB_TABS,
  userMayAccessOtWorkspace,
} from '../lib/otWorkspaceAccess';
import { OpsOtRequestPanel } from '../components/operations/OpsOtRequestPanel';
import { ManagerOtApprovalsPanel } from '../components/branchManager/ManagerOtApprovalsPanel';
import { CashierOtPayPanel } from '../components/finance/CashierOtPayPanel';
import { OtStatusChip } from '../components/ot/OtStatusTimeline';

function KpiCard({ label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-900',
    amber: 'border-amber-200 bg-amber-50/80 text-amber-950',
    sky: 'border-sky-200 bg-sky-50/80 text-sky-950',
    teal: 'border-teal-200 bg-teal-50/70 text-teal-950',
    emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
    rose: 'border-rose-200 bg-rose-50/70 text-rose-950',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] font-medium opacity-70">{hint}</p> : null}
    </div>
  );
}

/**
 * Operations → Overtime hub — raise, approve, pay, and track branch OT pay.
 * Route: /operations/overtime  (?tab=overview|requests|approvals|pay|track)
 */
export default function OvertimeHub() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasPermission = ws?.hasPermission?.bind(ws) || (() => false);
  const canAccess = userMayAccessOtWorkspace(hasPermission);

  const canRequest = hasPermission('*') || hasPermission('ot.request');
  const canApprove = hasPermission('*') || hasPermission('ot.approve');
  const canPay = hasPermission('*') || hasPermission('ot.pay');

  const tabIds = useMemo(
    () =>
      OT_HUB_TABS.filter(
        (t) => hasPermission('*') || t.perms.some((p) => hasPermission(p))
      ).map((t) => ({
        id: t.id,
        label: t.label,
        icon:
          t.id === 'overview' ? (
            <LayoutDashboard size={16} />
          ) : t.id === 'requests' ? (
            <ClipboardList size={16} />
          ) : t.id === 'approvals' ? (
            <CheckCircle2 size={16} />
          ) : t.id === 'pay' ? (
            <Banknote size={16} />
          ) : (
            <Clock size={16} />
          ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hasPermission from session
    [ws?.permissions, ws?.session?.user?.id]
  );

  const activeTab = normalizeOtHubTab(searchParams.get('tab'), hasPermission);

  const setTab = useCallback(
    (id) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (!id || id === 'overview') p.delete('tab');
          else p.set('tab', id);
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [trackRows, setTrackRows] = useState([]);
  const [trackLoading, setTrackLoading] = useState(true);
  const [trackError, setTrackError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadTrack = useCallback(async () => {
    if (!canAccess) {
      setTrackRows([]);
      setTrackLoading(false);
      return;
    }
    setTrackLoading(true);
    setTrackError('');
    const params = { limit: 200 };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await listOtRequests(params).catch(() => ({ ok: false }));
    setTrackLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setTrackRows([]);
      setTrackError(res.data?.error || 'Could not load OT register.');
      return;
    }
    setTrackRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
  }, [canAccess, statusFilter, from, to]);

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'track') void loadTrack();
  }, [activeTab, loadTrack]);

  const intel = useMemo(() => buildOtIntelFromRows(trackRows), [trackRows]);

  if (!canAccess) {
    return (
      <PageShell>
        <PageHeader title="Overtime" subtitle="Branch OT pay" />
        <MainPanel className="max-w-lg mx-auto mt-8 p-6">
          <p className="text-sm text-slate-600">
            Your account does not include overtime pay access. Ask an administrator for{' '}
            <code className="text-xs">ot.request</code>, <code className="text-xs">ot.approve</code>, or{' '}
            <code className="text-xs">ot.pay</code>.
          </p>
          <button
            type="button"
            className="mt-4 text-sm font-bold text-zarewa-teal hover:underline"
            onClick={() => navigate(-1)}
          >
            Go back
          </button>
        </MainPanel>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Overtime"
        subtitle="Raise, approve, mark paid, and track branch OT pay."
        tabs={<PageTabs tabs={tabIds} value={activeTab} onChange={setTab} />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadTrack()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-ui-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={12} aria-hidden /> Refresh
            </button>
            <Link
              to="/operations"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-ui-xs font-bold uppercase text-slate-600 no-underline hover:bg-slate-50"
            >
              <ArrowLeft size={12} aria-hidden /> Operations floor
            </Link>
          </div>
        }
      />

      <div className="mx-auto w-full max-w-[1400px] space-y-5 px-3 pb-10 sm:px-5 lg:px-6">
        {activeTab === 'overview' ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 via-white to-slate-50 px-5 py-6 sm:px-8 sm:py-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zarewa-teal">
                Branch OT command space
              </p>
              <h2 className="mt-1 max-w-2xl text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                One place for overtime pay intel
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Store raises, branch manager approves with locked rate, cashier marks paid. Attendance hours stay
                on the manager <strong className="font-semibold">Attendance OT board</strong> — this hub is pay
                only.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {canRequest ? (
                  <button
                    type="button"
                    onClick={() => setTab('requests')}
                    className="rounded-xl bg-zarewa-teal px-4 py-2.5 text-ui-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-teal-800"
                  >
                    Raise OT request
                  </button>
                ) : null}
                {canApprove ? (
                  <button
                    type="button"
                    onClick={() => setTab('approvals')}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-ui-xs font-bold uppercase tracking-wide text-amber-950 hover:bg-amber-100"
                  >
                    Open approvals ({intel.pendingCount})
                  </button>
                ) : null}
                {canPay ? (
                  <button
                    type="button"
                    onClick={() => setTab('pay')}
                    className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-ui-xs font-bold uppercase tracking-wide text-sky-950 hover:bg-sky-100"
                  >
                    Pay queue ({intel.approvedCount})
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setTab('track')}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                >
                  Track all
                </button>
              </div>
            </div>

            {trackError ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {trackError}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Open pipeline" value={trackLoading ? '…' : intel.openPipeline} hint="Draft + pending + to pay" tone="teal" />
              <KpiCard label="Drafts" value={trackLoading ? '…' : intel.draftCount} tone="slate" />
              <KpiCard label="Awaiting BM" value={trackLoading ? '…' : intel.pendingCount} tone="amber" />
              <KpiCard label="Awaiting pay" value={trackLoading ? '…' : intel.approvedCount} tone="sky" />
              <KpiCard
                label="To pay (₦)"
                value={trackLoading ? '…' : formatNgn(intel.payableQueueNgn)}
                tone="sky"
              />
              <KpiCard
                label="Paid (listed)"
                value={trackLoading ? '…' : formatNgn(intel.paidNgn)}
                hint={`${intel.paidCount} requests`}
                tone="emerald"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <MainPanel className="!p-4 sm:!p-5">
                <h3 className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal">
                  Status mix
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {[
                    [OT_STATUS.DRAFT, intel.draftCount],
                    [OT_STATUS.PENDING_BM, intel.pendingCount],
                    [OT_STATUS.APPROVED, intel.approvedCount],
                    [OT_STATUS.PAID, intel.paidCount],
                    [OT_STATUS.REJECTED, intel.rejectedCount],
                  ].map(([st, n]) => (
                    <li key={st} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5">
                      <OtStatusChip status={st} />
                      <span className="font-black tabular-nums text-slate-800">{n}</span>
                    </li>
                  ))}
                </ul>
              </MainPanel>
              <MainPanel className="!p-4 sm:!p-5">
                <h3 className="text-ui-xs font-bold uppercase tracking-widest text-zarewa-teal">
                  Work types
                </h3>
                {Object.keys(intel.workTypeCounts).length === 0 ? (
                  <p className="mt-4 text-xs text-slate-500">No OT rows in the current register load.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {Object.entries(intel.workTypeCounts).map(([w, n]) => (
                      <li key={w} className="flex justify-between border-b border-slate-100 py-1.5">
                        <span className="font-semibold capitalize text-slate-700">{w}</span>
                        <span className="font-black tabular-nums">{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-[11px] text-slate-500">
                  Counts reflect branch-visible rows for your role (cashiers only see approved/paid).
                </p>
              </MainPanel>
            </div>
          </div>
        ) : null}

        {activeTab === 'requests' && canRequest ? (
          <MainPanel className="!p-4 sm:!p-6">
            <OpsOtRequestPanel />
          </MainPanel>
        ) : null}

        {activeTab === 'approvals' && canApprove ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 px-1">
              Same queue as Manager Today — full workspace here for focus.
            </p>
            <ManagerOtApprovalsPanel branchId={ws?.branchScope || ws?.session?.currentBranchId || ''} />
          </div>
        ) : null}

        {activeTab === 'pay' && canPay ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 px-1">
              Cashier queue also appears on Finance Desk. Payable is locked at BM approval.
            </p>
            <CashierOtPayPanel />
          </div>
        ) : null}

        {activeTab === 'track' ? (
          <MainPanel className="!p-0 overflow-hidden">
            <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-black text-zarewa-teal">OT pay register</h3>
                <p className="text-xs text-slate-500">Branch-scoped history and open items</p>
              </div>
              <div className="ml-auto flex flex-wrap items-end gap-2">
                <label className="text-ui-xs font-bold uppercase text-slate-500">
                  Status
                  <select
                    className="z-input mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All visible</option>
                    {Object.entries(OT_STATUS_LABELS).map(([k, lab]) => (
                      <option key={k} value={k}>
                        {lab}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-ui-xs font-bold uppercase text-slate-500">
                  From
                  <input
                    type="date"
                    className="z-input mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>
                <label className="text-ui-xs font-bold uppercase text-slate-500">
                  To
                  <input
                    type="date"
                    className="z-input mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
              </div>
            </div>
            {trackError ? (
              <p className="m-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {trackError}
              </p>
            ) : null}
            {trackLoading ? (
              <p className="px-4 py-10 text-center text-xs text-slate-500">Loading register…</p>
            ) : trackRows.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-slate-500">No OT pay rows for this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-ui-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-bold">ID</th>
                      <th className="px-3 py-2 font-bold">Date</th>
                      <th className="px-3 py-2 font-bold">Type</th>
                      <th className="px-3 py-2 font-bold">Status</th>
                      <th className="px-3 py-2 font-bold">Links</th>
                      <th className="px-3 py-2 font-bold text-right">Payable</th>
                      <th className="px-3 py-2 font-bold">Created by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-teal-50/30">
                        <td className="px-3 py-2 font-black text-slate-800">{row.id}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-700">{row.dayIso}</td>
                        <td className="px-3 py-2 capitalize text-slate-700">{row.workType}</td>
                        <td className="px-3 py-2">
                          <OtStatusChip status={row.status} />
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {[row.quotationRef, row.poId].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-800">
                          {row.totalPayableNgn ? formatNgn(row.totalPayableNgn) : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.createdByName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </MainPanel>
        ) : null}
      </div>
    </PageShell>
  );
}
