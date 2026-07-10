import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilePlus, LifeBuoy, RefreshCw, Search } from 'lucide-react';
import { PageShell } from '../components/layout';
import { BranchWorkspaceBar } from '../components/layout/BranchWorkspaceBar';
import { useWorkspace } from '../context/WorkspaceContext';
import { useHelpChat } from '../context/HelpChatContext';
import { HELP_BOT_NAME } from '../lib/helpBotBrand';
import { getWorkspaceDeskNav } from '../lib/workspaceDeskNav';
import { workItemShowsOnWorkspaceUnifiedInbox } from '../lib/workItemPersonalInbox';
import { buildWorkspaceAiContext } from '../lib/workspaceAiContext';
import { computeWorkspaceIntelligence } from '../lib/workspaceIntelligence';
import TodayWorkCards, { useTodayWorkCounts } from '../components/workspace/TodayWorkCards';
import OfficeDeskShell from '../components/workspace/OfficeDeskShell';
import CreateOfficeRecordWizard from '../components/workspace/CreateOfficeRecordWizard';
import MyHrWorkspaceCard from '../components/hr/MyHrWorkspaceCard';
import { WorkspaceExpenseQuickActions } from '../components/workspace/WorkspaceExpenseQuickActions';
import { suggestForumOfficeRecord } from '../lib/suggestForumOfficeRecord';

export default function WorkspaceDesk() {
  const ws = useWorkspace();
  const helpChat = useHelpChat();
  const location = useLocation();
  const navigate = useNavigate();

  const userId = String(ws?.session?.user?.id || '').trim();
  const roleKey = ws?.session?.user?.roleKey;
  const inboxCtx = useMemo(
    () => ({ userId, roleKey, permissions: ws?.permissions ?? [] }),
    [userId, roleKey, ws?.permissions]
  );

  const deskNav = useMemo(
    () => getWorkspaceDeskNav({ roleKey, permissions: ws?.permissions }),
    [roleKey, ws?.permissions]
  );

  const [sectionId, setSectionId] = useState('desk');
  const [taskTab, setTaskTab] = useState('needs_action');
  const [selectedItem, setSelectedItem] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const visibleWorkItems = useMemo(() => {
    const raw = Array.isArray(ws?.snapshot?.unifiedWorkItems) ? ws.snapshot.unifiedWorkItems : [];
    return raw.filter((item) => workItemShowsOnWorkspaceUnifiedInbox(item, inboxCtx));
  }, [ws?.snapshot?.unifiedWorkItems, inboxCtx]);

  const taskCounts = useTodayWorkCounts(visibleWorkItems, inboxCtx);

  const intelligence = useMemo(
    () =>
      computeWorkspaceIntelligence({
        items: visibleWorkItems,
        userId,
        inboxCtx,
        officeSummary: null,
        canMonitor: ['admin', 'ceo', 'md', 'sales_manager'].includes(String(roleKey || '')),
      }),
    [visibleWorkItems, userId, inboxCtx, roleKey]
  );

  useEffect(() => {
    const st = location.state;
    if (st?.openCompose && !ws?.blocksBranchScopedCreate) setCreateOpen(true);
    if (st?.sectionId) setSectionId(String(st.sectionId));
    if (st?.taskTab) setTaskTab(String(st.taskTab));
    if (st?.selectedThreadId && ws?.getUnifiedWorkItemById) {
      const item = ws.getUnifiedWorkItemById(st.selectedThreadId);
      if (item) setSelectedItem(item);
    }
    if (st && (st.openCompose || st.sectionId || st.selectedThreadId)) {
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate, ws]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await ws.refresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const handleNavigateToday = (section, tab) => {
    setSectionId(section || 'tasks');
    setTaskTab(tab || 'needs_action');
    setSelectedItem(null);
  };

  const blocksCreate = Boolean(ws?.blocksBranchScopedCreate);

  const aiContext = useMemo(
    () =>
      buildWorkspaceAiContext({
        deskSection: sectionId,
        taskTab,
        userRole: roleKey,
        branchScope: ws?.branchScope,
        viewAllBranches: ws?.session?.viewAllBranches,
        permissions: ws?.permissions,
        canMutate: ws?.canMutate,
        degraded: ws?.usingCachedData,
        intelligence,
      }),
    [sectionId, taskTab, roleKey, ws, intelligence]
  );

  return (
    <PageShell>
      <div className="min-w-0 space-y-4 px-1 pb-10 md:space-y-6">
        <header className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zarewa Online Office</p>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{deskNav.title}</h1>
              <p className="mt-1 text-sm text-slate-600">Tasks, office records, approvals, and branch activity.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={blocksCreate}
                title={blocksCreate ? ws?.branchScopedCreateMessage : undefined}
                onClick={() => {
                  if (blocksCreate) return;
                  setCreateOpen(true);
                }}
                className={`inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-900${
                  blocksCreate ? ' cursor-not-allowed opacity-50' : ''
                }`}
              >
                <FilePlus size={16} aria-hidden />
                Create Office Record
              </button>
              <button
                type="button"
                onClick={() =>
                  helpChat?.openZare?.({
                    prompt: 'What should I do next on my desk?',
                    pageContext: { ...aiContext, source: 'workspace-desk' },
                    autoSend: true,
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-teal-900 hover:bg-teal-50"
              >
                <LifeBuoy size={14} />
                Ask {HELP_BOT_NAME}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <BranchWorkspaceBar />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void handleRefresh()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('zarewa:open-command-palette'))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                <Search size={14} />
                Search
              </button>
            </div>
          </div>
          {ws?.usingCachedData ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Read-only snapshot — reconnect for live actions.
            </p>
          ) : null}
        </header>

        {(sectionId === 'desk' || sectionId === 'today') && !selectedItem ? (
          <>
            <MyHrWorkspaceCard />
            <TodayWorkCards counts={taskCounts} onNavigate={handleNavigateToday} />
          </>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Workspace desk" className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <ul className="space-y-0.5">
              {deskNav.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSectionId(item.id);
                      setSelectedItem(null);
                      if (item.id === 'tasks') setTaskTab('needs_action');
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${
                      sectionId === item.id ? 'bg-teal-50 text-teal-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <main className="min-w-0">
            <OfficeDeskShell
              sectionId={sectionId}
              items={visibleWorkItems}
              inboxCtx={inboxCtx}
              taskTab={taskTab}
              onTaskTabChange={setTaskTab}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
              onClearSelection={() => setSelectedItem(null)}
              onRefresh={handleRefresh}
              onForumToOfficeRecord={(topic) => {
                if (blocksCreate) return;
                setCreatePrefill(suggestForumOfficeRecord(topic));
                setCreateOpen(true);
              }}
            />
          </main>
        </div>

        <WorkspaceExpenseQuickActions />
      </div>

      <CreateOfficeRecordWizard
        open={createOpen}
        initialPrefill={createPrefill}
        onClose={() => {
          setCreateOpen(false);
          setCreatePrefill(null);
        }}
        onCreated={() => {
          setCreatePrefill(null);
          setSectionId('tasks');
          setTaskTab('needs_action');
        }}
      />
    </PageShell>
  );
}
