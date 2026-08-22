import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageShell } from '../../components/layout';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useOptionalToast } from '../../context/ToastContext';
import {
  getWorkspaceZoneConfig,
  actionChipToTaskTab,
  isValidWorkspaceZone,
  isValidTaskQueueTab,
  WORKSPACE_ZONE_HOTKEYS,
  WORKSPACE_ZONE_HOTKEY_BY_ID,
} from '../../lib/workspaceZoneConfig';
import { workItemShowsOnWorkspaceUnifiedInbox } from '../../lib/workItemPersonalInbox';
import { workItemMatchesTaskQueueTab } from '../../lib/workspaceTaskQueue';
import { computeWorkspaceIntelligence } from '../../lib/workspaceIntelligence';
import { officeThreadIdFromWorkItem } from '../../lib/officeThreadFromWorkItem';
import { useOfficeRecordActions } from '../../lib/useOfficeRecordActions';
import { apiFetch } from '../../lib/apiBase';
import CreateOfficeRecordWizard from '../../components/workspace/CreateOfficeRecordWizard';
import TodayWorkCards, { useTodayWorkCounts } from '../../components/workspace/TodayWorkCards';
import MyHrWorkspaceCard from '../../components/hr/MyHrWorkspaceCard';
import { WorkspaceExpenseQuickActions } from '../../components/workspace/WorkspaceExpenseQuickActions';
import { HR_SELF_SERVICE_PATH } from '../../lib/hrSelfServiceRoutes';
import WorkspaceCommandBar from '../../components/workspace/v3/WorkspaceCommandBar';
import WorkspaceRail, { WORKSPACE_ZONE_ICONS } from '../../components/workspace/v3/WorkspaceRail';
import ContextRail from '../../components/workspace/v3/ContextRail';
import ActionInbox from '../../components/workspace/v3/ActionInbox';
import RecordsZone from '../../components/workspace/v3/RecordsZone';
import AppsGrid from '../../components/workspace/v3/AppsGrid';
import ActivityFeed from '../../components/workspace/v3/ActivityFeed';
import { openTeamChat } from '../../lib/teamChatEvents';
import {
  fetchWorkspaceActivity,
  markWorkspaceActivityRead,
  fetchWorkspacePresence,
  postPresenceHeartbeat,
  openWorkspaceRealtime,
} from '../../lib/workspaceV3Api';

const CREATE_KIND_MAP = {
  memo: 'general_internal',
  expense: 'expense_support',
  material: 'procurement_request',
  incident: 'operations_incident',
  fuel: 'fuel_diesel',
};

const LAST_ZONE_KEY = 'zarewa.workspace.v3.lastZone';

const IDLE_POLL_MS = 60000;
const HEARTBEAT_MS = 30000;

const MONITOR_ROLES = new Set([
  'branch_manager',
  'chairman',
  'ceo',
  'md',
  'admin',
  'sales_manager',
]);

export default function WorkspaceShell() {
  const ws = useWorkspace();
  const { show: showToast } = useOptionalToast();
  const location = useLocation();
  const navigate = useNavigate();

  const userId = String(ws?.session?.user?.id || '').trim();
  const roleKey = ws?.session?.user?.roleKey;
  const inboxCtx = useMemo(
    () => ({ userId, roleKey, permissions: ws?.permissions ?? [] }),
    [userId, roleKey, ws?.permissions]
  );

  const zoneConfig = useMemo(
    () => getWorkspaceZoneConfig({ roleKey, permissions: ws?.permissions }),
    [roleKey, ws?.permissions]
  );

  const [activeZone, setActiveZone] = useState(() => {
    try {
      const saved = sessionStorage.getItem(LAST_ZONE_KEY);
      return isValidWorkspaceZone(saved) ? saved : zoneConfig.defaultZone;
    } catch {
      return zoneConfig.defaultZone;
    }
  });
  const [taskTab, setTaskTab] = useState('needs_action');
  const [activeChip, setActiveChip] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [recordsSubView, setRecordsSubView] = useState('notices');
  const [createOpen, setCreateOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [filingBusy, setFilingBusy] = useState(false);
  const [noticeCompose, setNoticeCompose] = useState(false);

  const [activityEvents, setActivityEvents] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [presence, setPresence] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState('polling');

  // Refs keep callbacks referentially stable so effects (SSE, initial load)
  // don't tear down and refire whenever work items or the toast change.
  const wsRef = useRef(ws);
  const activityFallbackToastShownRef = useRef(false);
  const activityEventsRef = useRef(activityEvents);
  const showToastRef = useRef(showToast);
  const profileRef = useRef(null);

  const visibleWorkItems = useMemo(() => {
    const raw = Array.isArray(ws?.snapshot?.unifiedWorkItems) ? ws.snapshot.unifiedWorkItems : [];
    return raw.filter((item) => workItemShowsOnWorkspaceUnifiedInbox(item, inboxCtx));
  }, [ws?.snapshot?.unifiedWorkItems, inboxCtx]);
  const todayCounts = useTodayWorkCounts(visibleWorkItems, inboxCtx);

  const intelligence = useMemo(
    () =>
      computeWorkspaceIntelligence({
        items: visibleWorkItems,
        userId,
        inboxCtx,
        canMonitor: MONITOR_ROLES.has(String(roleKey || '').toLowerCase()),
      }),
    [visibleWorkItems, userId, inboxCtx, roleKey]
  );
  const intelligenceRef = useRef(intelligence);

  useEffect(() => {
    wsRef.current = ws;
    activityEventsRef.current = activityEvents;
    intelligenceRef.current = intelligence;
    showToastRef.current = showToast;
  }, [ws, activityEvents, intelligence, showToast]);

  const unread = useMemo(() => {
    // Action badge matches the "Needs my action" tab count exactly.
    const actionCount = visibleWorkItems.filter((i) =>
      workItemMatchesTaskQueueTab(i, 'needs_action', inboxCtx)
    ).length;
    // Own actions never count as unread for the actor.
    const activityUnread = activityEvents.filter(
      (e) => !e.read && String(e.actorUserId || '') !== userId
    ).length;
    return {
      activity: activityUnread,
      action: actionCount,
      records: 0,
      apps: 0,
    };
  }, [visibleWorkItems, inboxCtx, activityEvents, userId]);

  const selectedThreadId = officeThreadIdFromWorkItem(selectedItem);
  const recordActions = useOfficeRecordActions({
    workItem: selectedItem,
    threadId: selectedThreadId,
    onRefresh: () => void ws.refresh?.(),
  });

  const priorityBanner = useMemo(() => {
    const suggestions = intelligence?.suggestions || [];
    const high =
      suggestions.find((s) => s.priority === 'urgent') ||
      suggestions.find((s) => s.priority === 'high') ||
      null;
    if (!high) return null;
    const overdueItem = intelligence?.priorities?.overdue?.[0];
    return {
      title: high.label || high.title,
      subtitle: high.description,
      onOpen: () => {
        const targetId =
          high.workItemId ||
          overdueItem?.id ||
          overdueItem?.workItemId ||
          null;
        if (high.view && isValidTaskQueueTab(high.view)) {
          setTaskTab(high.view);
        } else {
          setTaskTab('needs_action');
        }
        if (targetId && wsRef.current?.getUnifiedWorkItemById) {
          const item = wsRef.current.getUnifiedWorkItemById(targetId);
          if (item) {
            setSelectedItem(item);
            setActiveZone('action');
            return;
          }
        }
        setActiveZone('action');
      },
    };
  }, [intelligence]);

  const loadActivity = useCallback(async ({ silent } = {}) => {
    const isFirstLoad = activityEventsRef.current.length === 0;
    if (!silent || isFirstLoad) setActivityLoading(true);
    try {
      const { events, error } = await fetchWorkspaceActivity();
      if (!error) {
        setActivityEvents(events);
      } else {
        if (!activityFallbackToastShownRef.current) {
          activityFallbackToastShownRef.current = true;
          showToast?.('Activity feed unavailable — showing desk insights', { variant: 'warning' });
        }
        const intel = intelligenceRef.current;
        const synth = [];
        for (const [i, s] of (intel?.suggestions || []).entries()) {
          synth.push({
            id: s.id || `intel-sug-${i}`,
            summaryText: s.label || s.title,
            eventKind: s.category || 'insight',
            createdAtIso: '',
            read: false,
            targetKind: s.workItemId ? 'work_item' : undefined,
            targetId: s.workItemId,
          });
        }
        for (const item of intel?.priorities?.overdue || []) {
          const itemId = item?.id || item?.workItemId;
          if (!itemId) continue;
          synth.push({
            id: `intel-overdue-${itemId}`,
            summaryText: item.title || `Overdue item`,
            eventKind: 'overdue',
            createdAtIso: item.dueAtIso || '',
            read: false,
            targetKind: 'work_item',
            targetId: itemId,
          });
        }
        setActivityEvents(synth);
      }
    } finally {
      if (!silent || isFirstLoad) setActivityLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPresence = useCallback(async () => {
    const { presence: list } = await fetchWorkspacePresence();
    setPresence(list);
  }, []);

  useEffect(() => {
    const prevProfile = profileRef.current;
    profileRef.current = zoneConfig.profile;
    // Only reset zone/chips when the desk profile actually changes — not on every mount refresh.
    if (!prevProfile || prevProfile === zoneConfig.profile) return;
    setActiveZone(zoneConfig.defaultZone);
    setActiveChip(null);
    setTaskTab((prev) => (isValidTaskQueueTab(prev) ? prev : 'needs_action'));
  }, [zoneConfig.profile, zoneConfig.defaultZone]);

  useEffect(() => {
    if (!isValidWorkspaceZone(activeZone)) return;
    try {
      sessionStorage.setItem(LAST_ZONE_KEY, activeZone);
    } catch {
      /* storage unavailable */
    }
  }, [activeZone]);

  useEffect(() => {
    if (!selectedItem?.id) return;
    const id = String(selectedItem.id);
    const fresh = visibleWorkItems.find((item) => String(item.id) === id);
    const candidate = fresh || wsRef.current?.getUnifiedWorkItemById?.(id);
    if (!candidate) {
      setSelectedItem(null);
      return;
    }
    const rev = (item) =>
      `${item.id}|${item.updatedAtIso || ''}|${item.status || ''}|${item.title || ''}`;
    if (rev(candidate) === rev(selectedItem)) return;
    setSelectedItem(candidate);
  }, [visibleWorkItems, selectedItem]);

  useEffect(() => {
    void loadActivity();
    void loadPresence();
  }, [loadActivity, loadPresence]);

  useEffect(() => {
    if (realtimeStatus !== 'polling') return undefined;
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void loadActivity({ silent: true });
      void loadPresence();
    }, IDLE_POLL_MS);
    return () => clearInterval(t);
  }, [realtimeStatus, loadActivity, loadPresence]);

  // Presence heartbeat pauses while the tab is hidden and reports away/online
  // transitions on visibility change.
  useEffect(() => {
    const beat = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void postPresenceHeartbeat({ status: 'online', deskKey: activeZone });
    };
    const onVisibility = () => {
      void postPresenceHeartbeat({
        status: document.visibilityState === 'hidden' ? 'away' : 'online',
        deskKey: activeZone,
      });
    };
    const t = setInterval(beat, HEARTBEAT_MS);
    beat();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeZone]);

  // Single SSE connection for the life of the shell — room switches read
  // from the ref instead of tearing the socket down.
  useEffect(() => {
    const es = openWorkspaceRealtime({
      onOpen: () => setRealtimeStatus('connected'),
      onEvent: (payload) => {
        setRealtimeStatus('connected');
        if (payload?.type === 'activity.created') void loadActivity({ silent: true });
        if (payload?.type === 'presence.changed') void loadPresence();
        if (payload?.type === 'work_item.updated') void wsRef.current?.refresh?.();
      },
      onError: () => setRealtimeStatus('polling'),
    });
    if (!es) setRealtimeStatus('polling');
    return () => {
      try {
        es?.close?.();
      } catch {
        /* ignore */
      }
    };
  }, [loadActivity, loadPresence]);

  useEffect(() => {
    const st = location.state;
    if (st?.openCompose && !ws?.blocksBranchScopedCreate && ws?.canMutate !== false && !ws?.usingCachedData) {
      setCreateOpen(true);
    }
    if (st?.zone && isValidWorkspaceZone(String(st.zone))) setActiveZone(String(st.zone));
    if (st?.taskTab && isValidTaskQueueTab(String(st.taskTab))) setTaskTab(String(st.taskTab));
    if (st?.roomId || st?.zone === 'rooms') {
      openTeamChat({ roomId: st.roomId ? String(st.roomId) : undefined });
    }
    if (st?.workItemId && ws?.getUnifiedWorkItemById) {
      const item = ws.getUnifiedWorkItemById(String(st.workItemId));
      if (item) {
        setSelectedItem(item);
        setActiveZone('action');
      }
    }
    if (st && (st.openCompose || st.zone || st.taskTab || st.roomId || st.workItemId)) {
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate, ws]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = String(e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
      if (e.target?.closest?.('[role="menu"], [role="dialog"], [role="listbox"]')) return;
      if (e.key === 'Escape') {
        if (createOpen) {
          setCreateOpen(false);
          setCreatePrefill(null);
          return;
        }
        if (selectedItem) {
          setSelectedItem(null);
          return;
        }
        return;
      }
      // No zone jumps while a dialog or create menu is open.
      if (createOpen || createMenuOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const zone = WORKSPACE_ZONE_HOTKEYS[e.key];
      if (zone) {
        e.preventDefault();
        setActiveZone(zone);
        if (zone !== 'action') setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [createOpen, createMenuOpen, selectedItem]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await ws.refresh?.();
      await loadActivity();
      showToast?.('Workspace refreshed', { variant: 'success' });
    } catch {
      showToast?.('Refresh failed — try again', { variant: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreate = (kind) => {
    if (ws?.blocksBranchScopedCreate || ws?.usingCachedData || ws?.canMutate === false) return;
    if (kind === 'notice') {
      // Official notices are published from Records, not the memo wizard.
      setActiveZone('records');
      setRecordsSubView('notices');
      setNoticeCompose(true);
      return;
    }
    if (kind === 'leave') {
      navigate(HR_SELF_SERVICE_PATH.timeOff);
      return;
    }
    setCreatePrefill({ recordType: CREATE_KIND_MAP[kind] || kind });
    setCreateOpen(true);
  };

  const fileSelectedRecord = async () => {
    if (ws?.usingCachedData || ws?.canMutate === false) {
      showToast?.('Reconnect before filing records.', { variant: 'warning' });
      return;
    }
    if (!selectedThreadId) {
      showToast?.('No office thread linked to file.', { variant: 'warning' });
      return;
    }
    setFilingBusy(true);
    try {
      const { ok, data } = await apiFetch(`/api/office/threads/${encodeURIComponent(selectedThreadId)}/file`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!ok || !data?.ok) {
        showToast?.(data?.error || 'Could not file record.', { variant: 'error' });
        return;
      }
      showToast?.(`Filed: ${data.filingNo}`, { variant: 'success' });
      await ws.refresh?.();
    } finally {
      setFilingBusy(false);
    }
  };

  const readOnly = Boolean(ws?.usingCachedData) || ws?.canMutate === false;
  const blocksCreate = Boolean(ws?.blocksBranchScopedCreate) || readOnly;
  const createBlockedMessage = readOnly
    ? 'Read-only snapshot — reconnect to create records.'
    : ws?.branchScopedCreateMessage;

  const mobileTabs = zoneConfig.zones.map((z) => ({
    id: z.id,
    label: z.shortLabel || z.label,
  }));

  const canContextApprove = Boolean(selectedItem && recordActions.canEndorse && !readOnly);
  const canContextReject = Boolean(selectedItem && recordActions.canReturn && !readOnly);
  const canContextFile = Boolean(
    selectedItem && selectedThreadId && ws?.canAccessModule?.('office') && !readOnly
  );

  return (
    <PageShell className="!p-0 !max-w-none">
      <div className="relative flex h-[calc(100dvh-3.5rem)] min-h-[28rem] flex-col bg-slate-50">
        <WorkspaceCommandBar
          title={zoneConfig.title}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onOpenSearch={() => window.dispatchEvent(new CustomEvent('zarewa:open-command-palette'))}
          onCreate={handleCreate}
          blocksCreate={blocksCreate}
          createBlockedMessage={createBlockedMessage}
          usingCachedData={ws?.usingCachedData}
          realtimeStatus={realtimeStatus}
          deskProfile={zoneConfig.profile}
          createMenuOpen={createMenuOpen}
          onCreateMenuOpenChange={setCreateMenuOpen}
        />

        <div className="flex min-h-0 flex-1">
          <WorkspaceRail
            className="hidden md:flex"
            zones={zoneConfig.zones}
            activeZone={activeZone}
            onZoneChange={(z) => {
              setActiveZone(z);
              if (z !== 'action') setSelectedItem(null);
            }}
            unread={unread}
          />

          <main
            className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden p-3 sm:p-4 ${
              activeZone === 'action' ? 'overflow-hidden' : 'overflow-y-auto'
            }`}
          >
            {activeZone === 'activity' ? (
              <div className="space-y-4">
                <TodayWorkCards
                  counts={todayCounts}
                  onNavigate={(_section, tab) => {
                    setTaskTab(tab);
                    setActiveZone('action');
                  }}
                />
                {zoneConfig.profile === 'staff' || zoneConfig.profile === 'office' ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    <MyHrWorkspaceCard />
                    <WorkspaceExpenseQuickActions />
                  </div>
                ) : null}
                <ActivityFeed
                events={activityEvents}
                loading={activityLoading && activityEvents.length === 0}
                priorityBanner={priorityBanner}
                onMarkRead={async () => {
                  const ok = await markWorkspaceActivityRead();
                  if (ok) {
                    setActivityEvents((prev) => prev.map((e) => ({ ...e, read: true })));
                  } else {
                    showToast?.('Could not mark activity as read', { variant: 'error' });
                  }
                }}
                onOpenEvent={(ev) => {
                  if (ev.targetKind === 'work_item' && ev.targetId && ws?.getUnifiedWorkItemById) {
                    const item = ws.getUnifiedWorkItemById(ev.targetId);
                    if (item) {
                      setSelectedItem(item);
                      setActiveZone('action');
                      return;
                    }
                  }
                  if (ev.roomId) {
                    openTeamChat({ roomId: ev.roomId });
                  } else {
                    setActiveZone('action');
                  }
                }}
                />
              </div>
            ) : null}

            {activeZone === 'action' ? (
              <ActionInbox
                items={visibleWorkItems}
                inboxCtx={inboxCtx}
                taskTab={taskTab}
                onTaskTabChange={setTaskTab}
                actionChips={zoneConfig.actionChips}
                activeChip={activeChip}
                onChipChange={(chip) => {
                  setActiveChip(chip);
                  if (chip) setTaskTab(actionChipToTaskTab(chip));
                }}
                selectedItem={selectedItem}
                onSelectItem={(item) => {
                  setSelectedItem(item);
                  setContextOpen(true);
                }}
                onClearSelection={() => setSelectedItem(null)}
                onRefresh={handleRefresh}
                recordActions={recordActions}
                onOpenSourceRoom={(roomId) => {
                  openTeamChat({ roomId });
                }}
              />
            ) : null}

            {activeZone === 'records' ? (
              <RecordsZone
                subView={recordsSubView}
                onSubViewChange={setRecordsSubView}
                items={visibleWorkItems}
                inboxCtx={inboxCtx}
                onOpenItem={(item) => {
                  setSelectedItem(item);
                  setActiveZone('action');
                  setContextOpen(true);
                }}
                noticeBlocked={blocksCreate}
                noticeBlockedMessage={createBlockedMessage}
                composeRequested={noticeCompose}
                onComposeConsumed={() => setNoticeCompose(false)}
                onCreateNotice={async ({ title, content } = {}) => {
                  if (blocksCreate) return createBlockedMessage || 'Cannot publish from this branch view.';
                  const noticeTitle = String(title || '').trim();
                  const noticeContent = String(content || '').trim();
                  if (!noticeTitle || !noticeContent) return 'Title and notice text are required.';
                  const { ok, data } = await apiFetch('/api/official-notices', {
                    method: 'POST',
                    body: JSON.stringify({ title: noticeTitle, content: noticeContent }),
                  });
                  if (!ok || !data?.ok) return data?.error || 'Could not publish notice.';
                  showToast?.('Official notice published', { variant: 'success' });
                  return true;
                }}
              />
            ) : null}

            {activeZone === 'apps' ? <AppsGrid apps={zoneConfig.apps} /> : null}
          </main>

          {/* xl+: context column. Phones use the action detail pane so the tab bar stays clear. */}
          <div className="hidden xl:block">
            <ContextRail
              workItem={contextOpen ? selectedItem : null}
              presence={presence}
              actionsBusy={recordActions.busy}
              fileBusy={filingBusy}
              onApprove={canContextApprove ? () => void recordActions.endorse() : undefined}
              onReject={canContextReject ? () => void recordActions.returnForInfo() : undefined}
              onFile={canContextFile ? () => void fileSelectedRecord() : undefined}
              onOpenOriginRoom={(roomId) => {
                openTeamChat({ roomId });
              }}
              onClose={() => setContextOpen(false)}
            />
          </div>
        </div>

        <nav
          aria-label="Workspace zones"
          className="flex shrink-0 border-t border-slate-200 bg-white md:hidden"
        >
          {mobileTabs.map((tab) => {
            const count = Number(unread[tab.id] || 0);
            const active = activeZone === tab.id;
            const Icon = WORKSPACE_ZONE_ICONS[tab.id];
            const hotkey = WORKSPACE_ZONE_HOTKEY_BY_ID[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                aria-label={`${tab.label}${count > 0 ? `, ${count} unread` : ''}${hotkey ? `, shortcut ${hotkey}` : ''}`}
                aria-keyshortcuts={hotkey || undefined}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setActiveZone(tab.id);
                  if (tab.id !== 'action') setSelectedItem(null);
                }}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 ${
                  active ? 'text-teal-900' : 'text-slate-500'
                }`}
              >
                {Icon ? <Icon size={18} aria-hidden /> : null}
                <span className="flex max-w-full items-center gap-1 truncate">
                  <span className="truncate">{tab.label}</span>
                  {hotkey ? (
                    <span className="shrink-0 tabular-nums text-ui-xs font-semibold text-slate-500" aria-hidden>
                      {hotkey}
                    </span>
                  ) : null}
                </span>
                {count > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-0.5 text-xs font-bold leading-none text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
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
          setActiveZone('action');
          setTaskTab('needs_action');
        }}
      />
    </PageShell>
  );
}
