import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/layout';
import { useWorkspace } from '../context/WorkspaceContext';
import { useHelpChat } from '../context/HelpChatContext';
import { useOptionalToast } from '../context/ToastContext';
import {
  getWorkspaceZoneConfig,
  actionChipToTaskTab,
  isValidWorkspaceZone,
  isValidTaskQueueTab,
} from '../lib/workspaceZoneConfig';
import { workItemShowsOnWorkspaceUnifiedInbox } from '../lib/workItemPersonalInbox';
import { workItemMatchesTaskQueueTab } from '../lib/workspaceTaskQueue';
import { computeWorkspaceIntelligence } from '../lib/workspaceIntelligence';
import { buildWorkspaceAiContext } from '../lib/workspaceAiContext';
import { officeThreadIdFromWorkItem } from '../lib/officeThreadFromWorkItem';
import { useOfficeRecordActions } from '../lib/useOfficeRecordActions';
import { apiFetch } from '../lib/apiBase';
import CreateOfficeRecordWizard from '../components/workspace/CreateOfficeRecordWizard';
import WorkspaceCommandBar from '../components/workspace/v3/WorkspaceCommandBar';
import WorkspaceRail from '../components/workspace/v3/WorkspaceRail';
import ContextRail from '../components/workspace/v3/ContextRail';
import ActionInbox from '../components/workspace/v3/ActionInbox';
import RecordsZone from '../components/workspace/v3/RecordsZone';
import AppsGrid from '../components/workspace/v3/AppsGrid';
import ActivityFeed from '../components/workspace/v3/ActivityFeed';
import RoomList from '../components/workspace/v3/RoomList';
import RoomView from '../components/workspace/v3/RoomView';
import {
  fetchWorkspaceRooms,
  fetchRoomMessages,
  markRoomRead,
  sendRoomMessage,
  fetchWorkspaceActivity,
  markWorkspaceActivityRead,
  fetchWorkspacePresence,
  postPresenceHeartbeat,
  promoteRoomMessage,
  createWorkspaceDm,
  openWorkspaceRealtime,
} from '../lib/workspaceV3Api';

const CREATE_KIND_MAP = {
  memo: 'general_internal',
  expense: 'expense_support',
  material: 'procurement_request',
};

const ZONE_HOTKEYS = {
  '1': 'activity',
  '2': 'rooms',
  '3': 'action',
  '4': 'records',
  '5': 'apps',
};

const ROOMS_POLL_MS = 30000;
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
  const helpChat = useHelpChat();
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

  const [activeZone, setActiveZone] = useState(zoneConfig.defaultZone);
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

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomQuery, setRoomQuery] = useState('');
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedCards, setPinnedCards] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [dmDirectory, setDmDirectory] = useState(null);
  const [dmLoadFailed, setDmLoadFailed] = useState(false);
  const [dmCreating, setDmCreating] = useState(false);

  const [activityEvents, setActivityEvents] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [presence, setPresence] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState('polling');

  // Refs keep callbacks referentially stable so effects (SSE, initial load)
  // don't tear down and refire whenever work items or the toast change.
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const activeRoomIdRef = useRef(activeRoomId);
  activeRoomIdRef.current = activeRoomId;
  const activityFallbackToastShownRef = useRef(false);
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const activityEventsRef = useRef(activityEvents);
  activityEventsRef.current = activityEvents;
  const messagesReqIdRef = useRef(0);
  const messagesAbortRef = useRef(null);

  const visibleWorkItems = useMemo(() => {
    const raw = Array.isArray(ws?.snapshot?.unifiedWorkItems) ? ws.snapshot.unifiedWorkItems : [];
    return raw.filter((item) => workItemShowsOnWorkspaceUnifiedInbox(item, inboxCtx));
  }, [ws?.snapshot?.unifiedWorkItems, inboxCtx]);

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
  intelligenceRef.current = intelligence;

  const unread = useMemo(() => {
    // Action badge matches the "Needs my action" tab count exactly.
    const actionCount = visibleWorkItems.filter((i) =>
      workItemMatchesTaskQueueTab(i, 'needs_action', inboxCtx)
    ).length;
    const roomsUnread = rooms.reduce((n, r) => n + Number(r.unreadCount || 0), 0);
    // Own actions never count as unread for the actor.
    const activityUnread = activityEvents.filter(
      (e) => !e.read && String(e.actorUserId || '') !== userId
    ).length;
    return {
      activity: activityUnread,
      rooms: roomsUnread,
      action: actionCount,
      records: 0,
      apps: 0,
    };
  }, [visibleWorkItems, inboxCtx, rooms, activityEvents, userId]);

  const activeRoom = useMemo(() => rooms.find((r) => r.id === activeRoomId) || null, [rooms, activeRoomId]);

  const filteredRooms = useMemo(() => {
    const q = roomQuery.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => {
      const hay = `${r.name || ''} ${r.slug || ''} ${r.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rooms, roomQuery]);

  const presenceByUser = useMemo(() => {
    const map = {};
    for (const p of presence) map[p.userId] = p;
    return map;
  }, [presence]);

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

  const loadRooms = useCallback(async ({ silent } = {}) => {
    const isFirstLoad = roomsRef.current.length === 0;
    if (!silent || isFirstLoad) setRoomsLoading(true);
    try {
      const { rooms: list, error } = await fetchWorkspaceRooms();
      if (error) {
        if (isFirstLoad) setRooms([]);
      } else {
        setRooms(list);
        setActiveRoomId((prev) => {
          if (prev && list.some((r) => r.id === prev)) return prev;
          return prev || list[0]?.id || null;
        });
      }
    } finally {
      if (!silent || isFirstLoad) setRoomsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (roomId, { silent } = {}) => {
    if (!roomId) return;
    messagesAbortRef.current?.abort();
    const ac = new AbortController();
    messagesAbortRef.current = ac;
    const seq = ++messagesReqIdRef.current;
    if (!silent) setMessagesLoading(true);
    try {
      const { messages: msgs, pinned, error } = await fetchRoomMessages(roomId, { signal: ac.signal });
      if (seq !== messagesReqIdRef.current) return;
      if (!error) {
        setMessages(msgs);
        setPinnedCards(pinned || []);
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      throw err;
    } finally {
      if (seq === messagesReqIdRef.current && !silent) setMessagesLoading(false);
    }
  }, []);

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
    setActiveZone(zoneConfig.defaultZone);
    setActiveChip(null);
    setTaskTab((prev) => (isValidTaskQueueTab(prev) ? prev : 'needs_action'));
  }, [zoneConfig.profile, zoneConfig.defaultZone]);

  useEffect(() => {
    if (!selectedItem?.id) return;
    const id = String(selectedItem.id);
    const fresh = visibleWorkItems.find((item) => String(item.id) === id);
    if (fresh) {
      if (fresh !== selectedItem) setSelectedItem(fresh);
      return;
    }
    const fromSnapshot = ws?.getUnifiedWorkItemById?.(id);
    if (fromSnapshot) {
      setSelectedItem(fromSnapshot);
      return;
    }
    setSelectedItem(null);
  }, [visibleWorkItems, selectedItem?.id, ws]);

  useEffect(() => {
    void loadRooms();
    void loadActivity();
    void loadPresence();
  }, [loadRooms, loadActivity, loadPresence]);

  // Lazily fetch the office directory the first time Rooms is opened
  // (feeds the New DM picker).
  useEffect(() => {
    if (activeZone !== 'rooms' || Array.isArray(dmDirectory) || dmLoadFailed) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/office/directory');
      if (cancelled) return;
      if (ok && data?.ok && Array.isArray(data.users)) {
        setDmDirectory(data.users.filter((u) => String(u.id || '') !== userId));
        setDmLoadFailed(false);
      } else {
        setDmLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeZone, dmDirectory, dmLoadFailed, userId]);

  useEffect(() => {
    if (realtimeStatus !== 'polling') return undefined;
    const interval = activeZone === 'rooms' ? ROOMS_POLL_MS : IDLE_POLL_MS;
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void loadRooms({ silent: true });
      void loadActivity({ silent: true });
      void loadPresence();
      if (activeZone === 'rooms' && activeRoomIdRef.current) {
        void loadMessages(activeRoomIdRef.current, { silent: true });
      }
    }, interval);
    return () => clearInterval(t);
  }, [realtimeStatus, activeZone, loadRooms, loadActivity, loadPresence, loadMessages]);

  useEffect(() => {
    if (activeZone !== 'rooms') return;
    setMessages([]);
    setPinnedCards([]);
    if (activeRoomId) {
      void loadMessages(activeRoomId);
      // Clear the unread cursor for the viewed room, then refresh badges.
      void markRoomRead(activeRoomId).then((ok) => {
        if (ok) {
          setRooms((prev) =>
            prev.map((r) => (r.id === activeRoomId ? { ...r, unreadCount: 0 } : r))
          );
        }
      });
    }
  }, [activeZone, activeRoomId, loadMessages]);

  // Presence heartbeat pauses while the tab is hidden and reports away/online
  // transitions on visibility change.
  useEffect(() => {
    const beat = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void postPresenceHeartbeat({ status: 'online' });
    };
    const onVisibility = () => {
      void postPresenceHeartbeat({
        status: document.visibilityState === 'hidden' ? 'away' : 'online',
      });
    };
    const t = setInterval(beat, HEARTBEAT_MS);
    beat();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Single SSE connection for the life of the shell — room switches read
  // from the ref instead of tearing the socket down.
  useEffect(() => {
    const es = openWorkspaceRealtime({
      onOpen: () => setRealtimeStatus('connected'),
      onEvent: (payload) => {
        setRealtimeStatus('connected');
        if (payload?.type === 'message.created') {
          if (payload.roomId && payload.roomId === activeRoomIdRef.current) {
            void loadMessages(activeRoomIdRef.current, { silent: true });
            void markRoomRead(activeRoomIdRef.current);
          }
          void loadRooms({ silent: true });
        }
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
  }, [loadMessages, loadActivity, loadPresence, loadRooms]);

  useEffect(() => {
    const st = location.state;
    if (st?.openCompose && !ws?.blocksBranchScopedCreate && ws?.canMutate !== false && !ws?.usingCachedData) {
      setCreateOpen(true);
    }
    if (st?.zone && isValidWorkspaceZone(String(st.zone))) setActiveZone(String(st.zone));
    if (st?.taskTab && isValidTaskQueueTab(String(st.taskTab))) setTaskTab(String(st.taskTab));
    if (st && (st.openCompose || st.zone || st.taskTab)) {
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate, ws]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = String(e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
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
        if (activeZone === 'rooms' && activeRoomId && window.matchMedia('(max-width: 767px)').matches) {
          setActiveRoomId(null);
        }
        return;
      }
      // No zone jumps while a dialog or create menu is open.
      if (createOpen || createMenuOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const zone = ZONE_HOTKEYS[e.key];
      if (zone) {
        e.preventDefault();
        setActiveZone(zone);
        if (zone !== 'action') setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [createOpen, createMenuOpen, selectedItem, activeZone, activeRoomId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await ws.refresh?.();
      await loadRooms();
      await loadActivity();
      if (activeRoomId) await loadMessages(activeRoomId);
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
      return;
    }
    setCreatePrefill({ recordType: CREATE_KIND_MAP[kind] || kind });
    setCreateOpen(true);
  };

  /**
   * @param {{ body: string, attachments?: object[] } | string} payload
   * @returns {Promise<boolean>} false on failure so the composer keeps the draft.
   */
  const handleSend = async (payload) => {
    if (!activeRoomId) return false;
    setSending(true);
    try {
      const { message, error } = await sendRoomMessage(activeRoomId, payload);
      if (error) {
        showToast?.(error, { variant: 'error' });
        return false;
      }
      if (message) setMessages((prev) => [...prev, message]);
      else await loadMessages(activeRoomId);
      void loadRooms({ silent: true });
      return true;
    } finally {
      setSending(false);
    }
  };

  const handleStartDm = async (user) => {
    if (dmCreating) return false;
    setDmCreating(true);
    try {
      const { ok, room, error } = await createWorkspaceDm(user.id);
      if (!ok) {
        showToast?.(error || 'Could not start conversation', { variant: 'error' });
        return false;
      }
      await loadRooms();
      if (room?.id) setActiveRoomId(room.id);
      return true;
    } finally {
      setDmCreating(false);
    }
  };

  const handlePromote = async (kind, excerpt) => {
    if (!activeRoomId) return;
    if (!excerpt?.trim()) {
      showToast?.('Add message text before converting', { variant: 'warning' });
      return;
    }
    if (kind === 'memo' || kind === 'expense' || kind === 'material') {
      setCreatePrefill({
        recordType: CREATE_KIND_MAP[kind] || kind,
        body: excerpt,
        subject: String(excerpt).slice(0, 80),
      });
      setCreateOpen(true);
      return;
    }
    const { ok, error, result } = await promoteRoomMessage(activeRoomId, { kind, excerpt });
    if (!ok) {
      showToast?.(error || 'Promote failed', { variant: 'error' });
      return;
    }
    showToast?.('Work item created', { variant: 'success' });
    await ws.refresh?.();
    if (result?.workItemId) {
      const item =
        ws?.getUnifiedWorkItemById?.(result.workItemId) ||
        result?.item ||
        { id: result.workItemId };
      setSelectedItem(item);
      setActiveZone('action');
    }
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

  const aiContext = useMemo(
    () =>
      buildWorkspaceAiContext({
        deskSection: activeZone,
        taskTab,
        userRole: roleKey,
        branchScope: ws?.branchScope,
        viewAllBranches: ws?.session?.viewAllBranches,
        permissions: ws?.permissions,
        canMutate: ws?.canMutate,
        degraded: ws?.usingCachedData,
        intelligence,
      }),
    [activeZone, taskTab, roleKey, ws, intelligence]
  );

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
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-[28rem] flex-col bg-slate-50">
        <WorkspaceCommandBar
          title={zoneConfig.title}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onOpenSearch={() => window.dispatchEvent(new CustomEvent('zarewa:open-command-palette'))}
          onAskZare={() =>
            helpChat?.openZare?.({
              prompt: 'What should I do next in my workspace?',
              pageContext: { ...aiContext, source: 'workspace-v3', realtimeStatus },
              autoSend: true,
            })
          }
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

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-3 sm:p-4">
            {activeZone === 'activity' ? (
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
                    setActiveRoomId(ev.roomId);
                    setActiveZone('rooms');
                  } else {
                    setActiveZone('action');
                  }
                }}
              />
            ) : null}

            {activeZone === 'rooms' ? (
              <div className="flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden">
                <div
                  className={`w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white md:max-w-[18rem] ${
                    activeRoom ? 'hidden md:block' : 'block'
                  }`}
                >
                  <RoomList
                    rooms={filteredRooms}
                    activeRoomId={activeRoomId}
                    loading={roomsLoading && rooms.length === 0}
                    searchQuery={roomQuery}
                    onSearchQueryChange={setRoomQuery}
                    onSelectRoom={(r) => setActiveRoomId(r.id)}
                    onRetry={() => {
                      setDmLoadFailed(false);
                      void loadRooms();
                    }}
                    onStartDm={handleStartDm}
                    dmDirectory={dmDirectory}
                    dmCreating={dmCreating}
                    presenceByUser={presenceByUser}
                    currentUserId={userId}
                  />
                </div>
                <div
                  className={`min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white ${
                    activeRoom ? 'flex' : 'hidden md:flex'
                  }`}
                >
                  <RoomView
                    room={activeRoom}
                    messages={messages}
                    pinnedCards={pinnedCards}
                    loading={messagesLoading}
                    sending={sending}
                    onSend={handleSend}
                    onPromote={handlePromote}
                    presenceByUser={presenceByUser}
                    currentUserId={userId}
                    onBack={() => setActiveRoomId(null)}
                    composerDisabled={readOnly}
                    composerDisabledReason={
                      readOnly ? 'Read-only snapshot — reconnect to send messages.' : undefined
                    }
                    deskProfile={zoneConfig.profile}
                    onOpenCard={(card) => {
                      if (card.workItemId && ws?.getUnifiedWorkItemById) {
                        const item = ws.getUnifiedWorkItemById(card.workItemId);
                        if (item) {
                          setSelectedItem(item);
                          setActiveZone('action');
                        }
                      }
                    }}
                  />
                </div>
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
              />
            ) : null}

            {activeZone === 'records' ? (
              <RecordsZone
                subView={recordsSubView}
                onSubViewChange={setRecordsSubView}
                items={visibleWorkItems}
                inboxCtx={inboxCtx}
              />
            ) : null}

            {activeZone === 'apps' ? <AppsGrid apps={zoneConfig.apps} /> : null}
          </main>

          <div
            className={
              contextOpen && (selectedItem || (activeZone === 'rooms' && activeRoom))
                ? 'fixed inset-x-0 bottom-[3.25rem] z-40 max-h-[45vh] overflow-hidden rounded-t-xl shadow-2xl md:bottom-0 xl:static xl:max-h-none xl:rounded-none xl:shadow-none'
                : 'hidden xl:block'
            }
          >
            <ContextRail
              workItem={contextOpen ? selectedItem : null}
              room={contextOpen && activeZone === 'rooms' ? activeRoom : null}
              presence={presence}
              actionsBusy={recordActions.busy}
              fileBusy={filingBusy}
              onApprove={canContextApprove ? () => void recordActions.endorse() : undefined}
              onReject={canContextReject ? () => void recordActions.returnForInfo() : undefined}
              onFile={canContextFile ? () => void fileSelectedRecord() : undefined}
              onClose={() => {
                setContextOpen(false);
                if (window.matchMedia('(max-width: 1279px)').matches) setSelectedItem(null);
              }}
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
            return (
              <button
                key={tab.id}
                type="button"
                aria-label={`${tab.label}${count > 0 ? `, ${count} unread` : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setActiveZone(tab.id);
                  if (tab.id !== 'action') setSelectedItem(null);
                }}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-600 ${
                  active ? 'text-teal-900' : 'text-slate-500'
                }`}
              >
                <span className="truncate">{tab.label}</span>
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
