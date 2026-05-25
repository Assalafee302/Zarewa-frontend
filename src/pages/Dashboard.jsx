import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Pen, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { PageShell } from '../components/layout';
import { BranchWorkspaceBar } from '../components/layout/BranchWorkspaceBar';
import { AiAskButton } from '../components/AiAskButton';
import { OfficeRecordComposeDrawer } from '../components/office/OfficeRecordComposeDrawer';
import { OfficeThreadConversationDrawer } from '../components/office/OfficeThreadConversationDrawer';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import { WorkspaceIntelligencePanel } from '../components/dashboard/WorkspaceIntelligencePanel';
import UnifiedWorkItemsPanel from '../components/workspace/UnifiedWorkItemsPanel';
import GmailStyleWorkspace from '../components/workspace/GmailStyleWorkspace';
import { WorkspaceExpenseQuickActions } from '../components/workspace/WorkspaceExpenseQuickActions';
import { PlanAgOnboardingCard } from '../components/dashboard/PlanAgOnboardingCard';
import { useToast } from '../context/ToastContext';
import { workItemShowsOnWorkspaceUnifiedInbox } from '../lib/workItemPersonalInbox';
import { computeWorkspaceIntelligence } from '../lib/workspaceIntelligence';
import { buildWorkspaceAiContext } from '../lib/workspaceAiContext';

function formatLastRefreshed(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}

const Dashboard = () => {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [officeSummary, setOfficeSummary] = useState(null);
  const [officialDrawerOpen, setOfficialDrawerOpen] = useState(false);
  const [workItemsView, setWorkItemsView] = useState('needs_action');
  const [inboxListMode, setInboxListMode] = useState('registry');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [mailThreadId, setMailThreadId] = useState(null);
  const [refreshingIntel, setRefreshingIntel] = useState(false);
  const [serverCounts, setServerCounts] = useState(null);
  const canOffice = Boolean(ws?.canAccessModule?.('office'));

  const userId = String(ws?.session?.user?.id || '').trim();
  const roleKey = ws?.session?.user?.roleKey;

  const visibleWorkItems = useMemo(() => {
    const raw = Array.isArray(ws?.snapshot?.unifiedWorkItems) ? ws.snapshot.unifiedWorkItems : [];
    const inboxCtx = { userId, roleKey, permissions: ws?.permissions ?? [] };
    return raw.filter((item) => workItemShowsOnWorkspaceUnifiedInbox(item, inboxCtx));
  }, [ws?.snapshot?.unifiedWorkItems, userId, roleKey, ws?.permissions]);

  const intelligence = useMemo(() => {
    const client = computeWorkspaceIntelligence({
      items: visibleWorkItems,
      userId,
      inboxCtx: { userId, roleKey, permissions: ws?.permissions ?? [] },
      officeSummary,
      canMonitor: roleKey === 'admin' || roleKey === 'ceo' || roleKey === 'md' || roleKey === 'sales_manager',
    });
    if (serverCounts?.counts) {
      return { ...client, counts: { ...client.counts, ...serverCounts.counts } };
    }
    return client;
  }, [visibleWorkItems, userId, roleKey, ws?.permissions, officeSummary, serverCounts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/workspace/counts');
      if (!cancelled && ok && data?.ok) setServerCounts(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [ws?.refreshEpoch]);

  useEffect(() => {
    const st = location.state;
    if (!st || typeof st !== 'object') return;
    let consumed = false;
    if (st.openCompose === true) {
      setOfficialDrawerOpen(true);
      consumed = true;
    }
    if (st.selectedThreadId) {
      setMailThreadId(String(st.selectedThreadId));
      consumed = true;
    }
    if (consumed) navigate('.', { replace: true, state: {} });
  }, [location.state, navigate]);

  useEffect(() => {
    if (!canOffice) {
      setOfficeSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/office/summary');
      if (cancelled) return;
      if (ok && data?.ok) setOfficeSummary(data);
      else setOfficeSummary(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [canOffice, ws?.refreshEpoch]);

  const handleIntelRefresh = async () => {
    setRefreshingIntel(true);
    try {
      await ws.refresh?.();
      const countsRes = await apiFetch('/api/workspace/counts');
      if (countsRes.ok && countsRes.data?.ok) setServerCounts(countsRes.data);
      if (canOffice) {
        const { ok, data } = await apiFetch('/api/office/summary');
        if (ok && data?.ok) setOfficeSummary(data);
      }
    } finally {
      setRefreshingIntel(false);
    }
  };

  const handleNavigateView = ({ view, category }) => {
    if (view === 'memos') {
      setInboxListMode('memos');
      setWorkItemsView('all');
    } else if (view) {
      setInboxListMode('registry');
      setWorkItemsView(view);
    }
    if (category) setCategoryFilter(category);
  };

  const [workspacePageContext, setWorkspacePageContext] = useState(null);

  const handleWorkspaceAiContext = useCallback((ctx) => {
    setWorkspacePageContext(ctx);
    try {
      sessionStorage.setItem('zarewa.workspace.pageContext', JSON.stringify(ctx || {}));
    } catch {
      /* ignore */
    }
  }, []);

  const aiPageContext = useMemo(
    () =>
      buildWorkspaceAiContext({
        folder: workItemsView,
        category: categoryFilter,
        userRole: roleKey,
        branchScope: ws?.branchScope,
        viewAllBranches: ws?.session?.viewAllBranches,
        permissions: ws?.permissions,
        canOffice,
        canMutate: ws?.canMutate,
        degraded: ws?.usingCachedData,
        intelligence,
        ...(workspacePageContext || {}),
      }),
    [workItemsView, categoryFilter, roleKey, ws, canOffice, intelligence, workspacePageContext]
  );

  const pendingCoilRequests = Array.isArray(ws?.snapshot?.coilRequests)
    ? ws.snapshot.coilRequests.filter((r) => r.status === 'pending')
    : [];

  const lastRefreshedLabel = formatLastRefreshed(ws?.snapshot?.generatedAtIso);

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('zarewa:open-command-palette'));
  };

  return (
    <PageShell>
      <div className="min-w-0 space-y-6 px-1 pb-10">
        {/* Command center header */}
        <header className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Command center</p>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">Workspace</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Your operational inbox, memos, approvals, and branch activity.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canOffice ? (
                <button
                  type="button"
                  onClick={() => setOfficialDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-900"
                >
                  <Pen size={16} aria-hidden />
                  Compose Memo
                </button>
              ) : null}
              <AiAskButton
                mode="search"
                prompt="What needs my attention today across the workspace, and where should I go first?"
                pageContext={{
                  ...aiPageContext,
                  source: 'dashboard-page',
                  pendingCoilRequestCount: pendingCoilRequests.length,
                }}
                resetConversation
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-teal-900 hover:bg-teal-50"
              >
                Ask Runa
              </AiAskButton>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <BranchWorkspaceBar />
            <div className="flex flex-wrap items-center gap-2">
              {lastRefreshedLabel ? (
                <span className="text-[11px] text-slate-500">Last refreshed {lastRefreshedLabel}</span>
              ) : null}
              <button
                type="button"
                disabled={refreshingIntel}
                onClick={() => void handleIntelRefresh()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                aria-label="Refresh workspace"
              >
                <RefreshCw size={14} className={refreshingIntel ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openCommandPalette}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                aria-label="Open workspace search"
              >
                <Search size={14} aria-hidden />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline">
                  Ctrl+K
                </kbd>
              </button>
            </div>
          </div>

          {ws?.usingCachedData ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Workspace is using a cached snapshot. Reconnect for live counts and actions.
            </p>
          ) : null}
        </header>

        <PlanAgOnboardingCard
          snapshotPrefs={ws?.snapshot?.dashboardPrefs}
          showToast={showToast}
          onWorkspaceRefresh={() => void ws.refresh?.()}
          hasFinance={ws.hasPermission('finance.view')}
          hasReports={ws.hasPermission('reports.view')}
        />

        {!canOffice ? (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/manager"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ShieldCheck size={14} aria-hidden />
                Management view
              </Link>
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {[
                ['needs_action', 'Action Inbox'],
                ['all', 'Work Tray'],
                ['file', 'Filed'],
                ['unfiled', 'Unfiled'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setWorkItemsView(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    workItemsView === key ? 'bg-white text-teal-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {canOffice ? (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <div className="min-h-0 min-w-0">
              <GmailStyleWorkspace
                officeSummary={officeSummary}
                workItemsView={workItemsView}
                onWorkItemsViewChange={setWorkItemsView}
                listMode={inboxListMode}
                onListModeChange={setInboxListMode}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                mailThreadId={mailThreadId}
                onMailThreadIdChange={setMailThreadId}
                onCompose={() => setOfficialDrawerOpen(true)}
                onAiContextChange={handleWorkspaceAiContext}
              />
            </div>
            <div className="min-h-0 min-w-0 lg:sticky lg:top-4 lg:self-start">
              <WorkspaceIntelligencePanel
                intelligence={intelligence}
                officeSummary={officeSummary}
                canOffice={canOffice}
                onCompose={() => setOfficialDrawerOpen(true)}
                onNavigateView={handleNavigateView}
                onRefresh={() => void handleIntelRefresh()}
                refreshing={refreshingIntel}
                degraded={Boolean(ws?.usingCachedData)}
                lastRefreshedLabel={lastRefreshedLabel}
                belowAccent={<WorkspaceExpenseQuickActions />}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <div className="min-h-0 min-w-0">
              <UnifiedWorkItemsPanel hideFooter view={workItemsView} onOpenMailReader={setMailThreadId} />
            </div>
            <div className="min-h-0 min-w-0 space-y-6 lg:sticky lg:top-4 lg:self-start">
              <WorkspaceIntelligencePanel
                intelligence={intelligence}
                officeSummary={officeSummary}
                canOffice={canOffice}
                onRefresh={() => void handleIntelRefresh()}
                refreshing={refreshingIntel}
                degraded={Boolean(ws?.usingCachedData)}
                lastRefreshedLabel={lastRefreshedLabel}
              />
              <WorkspaceExpenseQuickActions />
            </div>
          </div>
        )}
      </div>

      <OfficeRecordComposeDrawer
        isOpen={officialDrawerOpen}
        onDismiss={() => setOfficialDrawerOpen(false)}
        presentation={canOffice ? 'floating' : 'drawer'}
        onSent={(threadId) => {
          if (threadId) setMailThreadId(String(threadId));
        }}
      />
      {!canOffice ? (
        <OfficeThreadConversationDrawer
          threadId={mailThreadId || ''}
          isOpen={Boolean(mailThreadId)}
          onDismiss={() => setMailThreadId(null)}
        />
      ) : null}
    </PageShell>
  );
};
export default Dashboard;
