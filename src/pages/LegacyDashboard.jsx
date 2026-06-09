import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { PageShell } from '../components/layout';
import { OfficeRecordComposeDrawer } from '../components/office/OfficeRecordComposeDrawer';
import { OfficeThreadConversationDrawer } from '../components/office/OfficeThreadConversationDrawer';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiFetch } from '../lib/apiBase';
import UnifiedWorkItemsPanel from '../components/workspace/UnifiedWorkItemsPanel';
import GmailStyleWorkspace from '../components/workspace/GmailStyleWorkspace';
import { PlanAgOnboardingCard } from '../components/dashboard/PlanAgOnboardingCard';
import { useToast } from '../context/ToastContext';

export default function LegacyDashboard() {
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
  const canOffice = Boolean(ws?.canAccessModule?.('office'));

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

  const handleWorkspaceAiContext = useCallback((ctx) => {
    try {
      sessionStorage.setItem('zarewa.workspace.pageContext', JSON.stringify(ctx || {}));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <PageShell>
      <div className="min-w-0 space-y-4 px-1 pb-8">
        <PlanAgOnboardingCard
          snapshotPrefs={ws?.snapshot?.dashboardPrefs}
          showToast={showToast}
          onWorkspaceRefresh={() => void ws.refresh?.()}
          hasFinance={ws.hasPermission('finance.view')}
          hasReports={ws.hasPermission('reports.view')}
        />
        {!canOffice ? (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Link
              to="/manager"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ShieldCheck size={14} aria-hidden />
              Management view
            </Link>
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
        ) : (
          <UnifiedWorkItemsPanel hideFooter view={workItemsView} onOpenMailReader={setMailThreadId} />
        )}
      </div>
      <OfficeRecordComposeDrawer
        isOpen={officialDrawerOpen}
        onDismiss={() => setOfficialDrawerOpen(false)}
        presentation={canOffice ? 'modal' : 'drawer'}
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
}
