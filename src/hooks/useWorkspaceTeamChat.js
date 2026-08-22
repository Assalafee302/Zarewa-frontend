import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { useOptionalToast } from '../context/ToastContext';
import { apiFetch } from '../lib/apiBase';
import { HELP_BOT_NAME } from '../lib/helpBotBrand';
import { sanitizeZarePageContext } from '../lib/workspaceSanitize';
import {
  ZARE_CHAT_ROOM_ID,
  ZARE_CHAT_USER_ID,
  injectZareChatRoom,
  injectZareDirectory,
  isZareChatRoomId,
  isZareChatUserId,
  loadZareChatMessages,
  previewFromZareMessages,
  saveZareChatMessages,
  zareHelpHistoryFromMessages,
  zareIntroMessage,
} from '../lib/zareChatPerson';
import {
  fetchWorkspaceRooms,
  fetchRoomMessages,
  markRoomRead,
  sendRoomMessage,
  fetchWorkspacePresence,
  postPresenceHeartbeat,
  promoteRoomMessage,
  createWorkspaceDm,
  muteWorkspaceRoom,
  archiveWorkspaceRoom,
  editRoomMessage,
  deleteRoomMessage,
  openWorkspaceRealtime,
} from '../lib/workspaceV3Api';

const draftQueueKey = (roomId) => `zarewa.workspace.v3.messageDraft.${roomId}`;

/** Fallback poll when SSE is down — dock open (active conversation). */
const OPEN_POLL_MS = 4000;
/** Fallback poll when SSE is down — dock closed (unread badges only). */
const IDLE_POLL_MS = 10000;
/** Safety net while SSE reports connected (covers multi-instance / missed events). */
const LIVE_BACKUP_POLL_MS = 20000;
const HEARTBEAT_MS = 30000;

/**
 * Team chat state for the floating dock. Does not auto-select the first room.
 * @param {{ open?: boolean }} [opts]
 */
export function useWorkspaceTeamChat({ open = false } = {}) {
  const ws = useWorkspace();
  const location = useLocation();
  const { show: showToast } = useOptionalToast();
  const userId = String(ws?.session?.user?.id || '').trim();

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomQuery, setRoomQuery] = useState('');
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedCards, setPinnedCards] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasEarlierMessages, setHasEarlierMessages] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [dmDirectory, setDmDirectory] = useState(null);
  const [dmLoadFailed, setDmLoadFailed] = useState(false);
  const [dmCreating, setDmCreating] = useState(false);
  const [presence, setPresence] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState('polling');

  const wsRef = useRef(ws);
  const activeRoomIdRef = useRef(activeRoomId);
  const roomsRef = useRef(rooms);
  const showToastRef = useRef(showToast);
  const openRef = useRef(open);
  const messagesReqIdRef = useRef(0);
  const messagesAbortRef = useRef(null);
  const [zarePreview, setZarePreview] = useState(() => previewFromZareMessages([zareIntroMessage()]));

  useEffect(() => {
    wsRef.current = ws;
    activeRoomIdRef.current = activeRoomId;
    roomsRef.current = rooms;
    showToastRef.current = showToast;
    openRef.current = open;
  }, [ws, activeRoomId, rooms, showToast, open]);

  const roomsWithZare = useMemo(
    () => injectZareChatRoom(rooms, { lastMessage: zarePreview }),
    [rooms, zarePreview]
  );

  const unreadCount = useMemo(
    () => roomsWithZare.reduce((n, r) => n + Number(r.unreadCount || 0), 0),
    [roomsWithZare]
  );

  const activeRoom = useMemo(
    () => roomsWithZare.find((r) => r.id === activeRoomId) || null,
    [roomsWithZare, activeRoomId]
  );

  const filteredRooms = useMemo(() => {
    const q = roomQuery.trim().toLowerCase();
    if (!q) return roomsWithZare;
    return roomsWithZare.filter((r) => {
      const hay = `${r.name || ''} ${r.slug || ''} ${r.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [roomsWithZare, roomQuery]);

  const presenceByUser = useMemo(() => {
    const map = {};
    for (const p of presence) map[p.userId] = p;
    map[ZARE_CHAT_USER_ID] = {
      userId: ZARE_CHAT_USER_ID,
      displayName: HELP_BOT_NAME,
      status: 'online',
    };
    return map;
  }, [presence]);

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
          if (prev && (isZareChatRoomId(prev) || list.some((r) => r.id === prev))) return prev;
          return prev || null;
        });
      }
    } finally {
      if (!silent || isFirstLoad) setRoomsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (roomId, { silent, beforeIso } = {}) => {
    if (!roomId) return;
    if (isZareChatRoomId(roomId)) {
      messagesAbortRef.current?.abort();
      messagesReqIdRef.current += 1;
      const stored = loadZareChatMessages(userId);
      setMessages(stored);
      setPinnedCards([]);
      setHasEarlierMessages(false);
      setMessagesLoading(false);
      setZarePreview(previewFromZareMessages(stored));
      return;
    }
    messagesAbortRef.current?.abort();
    const ac = new AbortController();
    messagesAbortRef.current = ac;
    const seq = ++messagesReqIdRef.current;
    if (beforeIso) setLoadingEarlier(true);
    else if (!silent) setMessagesLoading(true);
    try {
      const { messages: msgs, pinned, hasMore, error } = await fetchRoomMessages(roomId, {
        signal: ac.signal,
        beforeIso,
      });
      if (seq !== messagesReqIdRef.current) return;
      if (!error) {
        setMessages((prev) => (beforeIso ? [...msgs, ...prev] : msgs));
        setPinnedCards(pinned || []);
        setHasEarlierMessages(Boolean(hasMore));
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      showToastRef.current?.('Could not load messages — try again', { variant: 'error' });
    } finally {
      if (seq === messagesReqIdRef.current) {
        if (beforeIso) setLoadingEarlier(false);
        else if (!silent) setMessagesLoading(false);
      }
    }
  }, [userId]);

  const loadPresence = useCallback(async () => {
    const { presence: list } = await fetchWorkspacePresence();
    setPresence(list);
  }, []);

  useEffect(() => {
    if (!userId) return;
    void loadRooms();
    setZarePreview(previewFromZareMessages(loadZareChatMessages(userId)));
  }, [userId, loadRooms]);

  useEffect(() => {
    const refreshUnread = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void loadRooms({ silent: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshUnread();
    };
    window.addEventListener('focus', refreshUnread);
    window.addEventListener('online', refreshUnread);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refreshUnread);
      window.removeEventListener('online', refreshUnread);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadRooms, userId]);

  useEffect(() => {
    if (!open || Array.isArray(dmDirectory) || dmLoadFailed) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/office/directory');
      if (cancelled) return;
      if (ok && data?.ok && Array.isArray(data.users)) {
        setDmDirectory(injectZareDirectory(data.users.filter((u) => String(u.id || '') !== userId)));
        setDmLoadFailed(false);
      } else {
        setDmDirectory(injectZareDirectory([]));
        setDmLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, dmDirectory, dmLoadFailed, userId]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setPinnedCards([]);
      setHasEarlierMessages(false);
      return;
    }
    if (!activeRoomId) {
      setMessages([]);
      setPinnedCards([]);
      setHasEarlierMessages(false);
      return;
    }
    void loadMessages(activeRoomId);
    if (isZareChatRoomId(activeRoomId)) return;
    void markRoomRead(activeRoomId).then((ok) => {
      if (ok) {
        setRooms((prev) =>
          prev.map((r) => (r.id === activeRoomId ? { ...r, unreadCount: 0 } : r))
        );
      }
    });
  }, [open, activeRoomId, loadMessages]);

  useEffect(() => {
    const interval =
      realtimeStatus === 'connected'
        ? LIVE_BACKUP_POLL_MS
        : open
          ? OPEN_POLL_MS
          : IDLE_POLL_MS;
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void loadRooms({ silent: true });
      if (open) void loadPresence();
      if (open && activeRoomIdRef.current && !isZareChatRoomId(activeRoomIdRef.current)) {
        void loadMessages(activeRoomIdRef.current, { silent: true });
      }
    }, interval);
    return () => clearInterval(t);
  }, [realtimeStatus, open, loadRooms, loadPresence, loadMessages]);

  useEffect(() => {
    if (!open) return undefined;
    const beat = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void postPresenceHeartbeat({ status: 'online', deskKey: 'chat' });
    };
    const onVisibility = () => {
      void postPresenceHeartbeat({
        status: document.visibilityState === 'hidden' ? 'away' : 'online',
        deskKey: 'chat',
      });
      if (document.visibilityState === 'visible') {
        void loadRooms({ silent: true });
        if (activeRoomIdRef.current && !isZareChatRoomId(activeRoomIdRef.current)) {
          void loadMessages(activeRoomIdRef.current, { silent: true });
        }
      }
    };
    const t = setInterval(beat, HEARTBEAT_MS);
    beat();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [open, loadRooms, loadMessages]);

  // Keep SSE for the whole session so unread + open threads update immediately,
  // not only while the floating dock is expanded.
  useEffect(() => {
    if (!userId) {
      setRealtimeStatus('polling');
      return undefined;
    }
    const es = openWorkspaceRealtime({
      onOpen: () => setRealtimeStatus('connected'),
      onEvent: (payload) => {
        setRealtimeStatus('connected');
        if (payload?.type === 'message.created') {
          const dockOpen = openRef.current;
          const roomOpen =
            dockOpen &&
            payload.roomId &&
            payload.roomId === activeRoomIdRef.current &&
            !isZareChatRoomId(payload.roomId);
          if (roomOpen) {
            void loadMessages(activeRoomIdRef.current, { silent: true });
            void markRoomRead(activeRoomIdRef.current);
          }
          void loadRooms({ silent: true });
        }
        if (payload?.type === 'presence.changed' && openRef.current) void loadPresence();
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
  }, [userId, loadMessages, loadPresence, loadRooms]);

  const handleSend = async (payload) => {
    if (!activeRoomId) return false;
    if (isZareChatRoomId(activeRoomId)) {
      const text = (typeof payload === 'string' ? payload : payload?.body || '').trim();
      if (!text) {
        showToast?.('Type a question for Zare', { variant: 'warning' });
        return false;
      }
      setSending(true);
      const userMsg = {
        id: `zare-u-${Date.now()}`,
        body: text,
        authorUserId: userId,
        authorDisplayName: ws?.session?.user?.displayName || ws?.session?.user?.name || 'You',
        createdAtIso: new Date().toISOString(),
      };
      const next = [...messages, userMsg];
      setMessages(next);
      saveZareChatMessages(userId, next);
      setZarePreview(previewFromZareMessages(next));
      const persist = (all) => {
        setMessages(all);
        saveZareChatMessages(userId, all);
        setZarePreview(previewFromZareMessages(all));
      };
      try {
        let pageContext = { pathname: location.pathname, source: 'team-chat' };
        try {
          const raw = sessionStorage.getItem('zarewa.workspace.pageContext');
          const base = raw ? JSON.parse(raw) : {};
          pageContext = { ...base, ...pageContext };
        } catch {
          /* ignore */
        }
        const { ok, data } = await apiFetch('/api/help/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: text,
            messages: zareHelpHistoryFromMessages(next),
            pathname: location.pathname,
            pageContext: sanitizeZarePageContext(pageContext, ws?.session?.user),
          }),
        });
        const linkLines = (Array.isArray(data?.links) ? data.links : [])
          .map((link) => String(link?.label || link?.to || '').trim())
          .filter(Boolean);
        const replyBody = [
          ok && data?.ok
            ? String(data.message || '').trim() ||
              'I could not answer that just now. Try sending the question again.'
            : String(data?.error || '').trim() ||
              'I could not reach the help service. Try again in a moment.',
          ...linkLines,
        ]
          .filter(Boolean)
          .join('\n');
        persist([
          ...next,
          {
            id: `zare-a-${Date.now()}`,
            body: replyBody,
            authorUserId: ZARE_CHAT_USER_ID,
            authorDisplayName: HELP_BOT_NAME,
            createdAtIso: new Date().toISOString(),
          },
        ]);
        if (!ok || !data?.ok) {
          showToast?.(data?.error || 'Zare could not reply', { variant: 'error' });
        }
        return true;
      } catch {
        persist([
          ...next,
          {
            id: `zare-a-${Date.now()}`,
            body: 'I could not reach the help service. Try again in a moment.',
            authorUserId: ZARE_CHAT_USER_ID,
            authorDisplayName: HELP_BOT_NAME,
            createdAtIso: new Date().toISOString(),
          },
        ]);
        showToast?.('Could not reach Zare — try again', { variant: 'error' });
        return true;
      } finally {
        setSending(false);
      }
    }
    setSending(true);
    try {
      const { message, error } = await sendRoomMessage(activeRoomId, payload);
      if (error) {
        const offline =
          ws?.usingCachedData ||
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          /network|offline|fetch/i.test(error);
        if (offline) {
          try {
            sessionStorage.setItem(draftQueueKey(activeRoomId), JSON.stringify(payload));
            showToast?.('Message queued and will retry when you reconnect', { variant: 'warning' });
            return true;
          } catch {
            /* keep composer draft */
          }
        }
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

  useEffect(() => {
    const retryQueued = async () => {
      if (
        !activeRoomId ||
        isZareChatRoomId(activeRoomId) ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      ) {
        return;
      }
      let payload;
      try {
        payload = JSON.parse(sessionStorage.getItem(draftQueueKey(activeRoomId)) || 'null');
      } catch {
        payload = null;
      }
      if (!payload) return;
      const { message, error } = await sendRoomMessage(activeRoomId, payload);
      if (error) return;
      try {
        sessionStorage.removeItem(draftQueueKey(activeRoomId));
      } catch {
        /* storage unavailable */
      }
      if (message) setMessages((prev) => [...prev, message]);
      else void loadMessages(activeRoomId);
      showToast?.('Queued message sent', { variant: 'success' });
    };
    window.addEventListener('online', retryQueued);
    void retryQueued();
    return () => window.removeEventListener('online', retryQueued);
  }, [activeRoomId, loadMessages, showToast]);

  const handleMuteRoom = async (room, shouldMute) => {
    if (room?.bot || isZareChatRoomId(room?.id)) return;
    const mutedUntilIso = shouldMute ? new Date(Date.now() + 8 * 3600000).toISOString() : null;
    const result = await muteWorkspaceRoom(room.id, { mutedUntilIso, unmute: !shouldMute });
    if (!result.ok) {
      showToast?.(result.error || 'Could not update mute', { variant: 'error' });
      return;
    }
    setRooms((prev) =>
      prev.map((entry) =>
        entry.id === room.id
          ? { ...entry, muted: result.muted, mutedUntilIso: result.mutedUntilIso }
          : entry
      )
    );
  };

  const handleArchiveRoom = async (room) => {
    if (room?.bot || isZareChatRoomId(room?.id)) return;
    if (room.scopeKind === 'dm' || room.kind === 'dm') return;
    if (!window.confirm(`Archive ${room.name || room.slug || 'this channel'}?`)) return;
    const result = await archiveWorkspaceRoom(room.id, { archived: true });
    if (!result.ok) {
      showToast?.(result.error || 'Could not archive channel', { variant: 'error' });
      return;
    }
    setRooms((prev) => prev.filter((entry) => entry.id !== room.id));
    setActiveRoomId((current) => (current === room.id ? null : current));
  };

  const handleEditMessage = async (message) => {
    if (isZareChatRoomId(activeRoomId)) return;
    const body = window.prompt('Edit message', message.body || '');
    if (body === null || !body.trim() || body.trim() === message.body) return;
    const result = await editRoomMessage(activeRoomId, message.id, { body });
    if (!result.ok) {
      showToast?.(result.error || 'Could not edit message', { variant: 'error' });
      return;
    }
    setMessages((prev) =>
      prev.map((entry) =>
        entry.id === message.id
          ? result.message || { ...entry, body: body.trim(), editedAtIso: new Date().toISOString() }
          : entry
      )
    );
  };

  const handleDeleteMessage = async (message) => {
    if (isZareChatRoomId(activeRoomId)) return;
    if (!window.confirm('Delete this message?')) return;
    const result = await deleteRoomMessage(activeRoomId, message.id);
    if (!result.ok) {
      showToast?.(result.error || 'Could not delete message', { variant: 'error' });
      return;
    }
    setMessages((prev) =>
      prev.map((entry) =>
        entry.id === message.id
          ? {
              ...entry,
              body: 'This message was deleted',
              deleted: true,
              deletedAtIso: new Date().toISOString(),
              attachments: [],
            }
          : entry
      )
    );
  };

  const handleStartDm = async (user) => {
    if (isZareChatUserId(user?.id)) {
      setActiveRoomId(ZARE_CHAT_ROOM_ID);
      return true;
    }
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

  const handlePromoteApi = async (kind, excerpt, messageId) => {
    if (!activeRoomId) return { ok: false };
    const { ok, error, result } = await promoteRoomMessage(activeRoomId, { kind, excerpt, messageId });
    if (!ok) {
      showToast?.(error || 'Promote failed', { variant: 'error' });
      return { ok: false };
    }
    showToast?.('Work item created', { variant: 'success' });
    await ws.refresh?.();
    return { ok: true, result };
  };

  const readOnly = Boolean(ws?.usingCachedData) || ws?.canMutate === false;

  return {
    userId,
    rooms: roomsWithZare,
    roomsLoading,
    roomQuery,
    setRoomQuery,
    filteredRooms,
    activeRoomId,
    setActiveRoomId,
    activeRoom,
    messages,
    pinnedCards,
    messagesLoading,
    sending,
    hasEarlierMessages,
    loadingEarlier,
    loadMessages,
    loadRooms,
    dmDirectory,
    dmLoadFailed,
    setDmLoadFailed,
    dmCreating,
    presenceByUser,
    unreadCount,
    realtimeStatus,
    readOnly,
    handleSend,
    handleMuteRoom,
    handleArchiveRoom,
    handleEditMessage,
    handleDeleteMessage,
    handleStartDm,
    handlePromoteApi,
  };
}
