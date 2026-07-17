import React, { useState, useRef, useEffect } from 'react';
import { Hash, Search, X, SquarePen } from 'lucide-react';
import PresenceAvatar from './PresenceAvatar';
import { ListEmptyState } from '../../ui/ListEmptyState';

function previewTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffDays = Math.round((now - d) / 86400000);
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/** Teams-style chat row: avatar + presence, name, last-message preview, time, unread. */
function ChatRow({ room, activeRoomId, onSelectRoom, presenceByUser, currentUserId }) {
  const unread = Number(room.unreadCount || 0);
  const active = activeRoomId === room.id;
  const label = room.name || `#${room.slug}`;
  const status = room.peerUserId ? presenceByUser?.[room.peerUserId]?.status || 'offline' : 'offline';
  const last = room.lastMessage;
  const mineLast = last && String(last.authorUserId || '') === String(currentUserId || '');
  const preview = last ? `${mineLast ? 'You: ' : ''}${last.preview}` : 'Start the conversation';

  return (
    <button
      type="button"
      aria-label={`Chat with ${label}${unread > 0 ? `, ${unread} unread` : ''}`}
      aria-current={active ? 'location' : undefined}
      onClick={() => onSelectRoom?.(room)}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
        active ? 'bg-teal-50' : 'hover:bg-slate-50'
      }`}
    >
      <PresenceAvatar displayName={label} status={status} size={36} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={`min-w-0 truncate text-sm ${
              unread > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
            }`}
          >
            {label}
          </span>
          {last?.createdAtIso ? (
            <span className={`shrink-0 text-[10px] ${unread > 0 ? 'font-semibold text-teal-800' : 'text-slate-400'}`}>
              {previewTime(last.createdAtIso)}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span
            className={`min-w-0 truncate text-xs ${
              unread > 0 ? 'font-semibold text-slate-700' : 'text-slate-500'
            }`}
          >
            {preview}
          </span>
          {unread > 0 ? (
            <span className="shrink-0 rounded-full bg-teal-700 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function ChannelRow({ room, activeRoomId, onSelectRoom }) {
  const unread = Number(room.unreadCount || 0);
  const active = activeRoomId === room.id;
  const label = room.name || `#${room.slug}`;
  const last = room.lastMessage;

  return (
    <button
      type="button"
      aria-label={`${label}${unread > 0 ? `, ${unread} unread` : ''}`}
      aria-current={active ? 'location' : undefined}
      onClick={() => onSelectRoom?.(room)}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
        active ? 'bg-teal-50 text-teal-900' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Hash size={16} className="shrink-0 text-slate-400" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${unread > 0 ? 'font-bold' : 'font-medium'}`}>{label}</span>
        {last ? (
          <span className="block truncate text-xs font-normal text-slate-400">{last.preview}</span>
        ) : null}
      </span>
      {unread > 0 ? (
        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold leading-none text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </button>
  );
}

/** Inline "start a chat" picker fed by the office directory. */
function NewDmPicker({ directory, onPick, onClose, creating, presenceByUser }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus?.();
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (directory || [])
    .filter((u) => {
      if (!q) return true;
      return `${u.displayName || ''} ${u.username || ''}`.toLowerCase().includes(q);
    })
    .slice(0, 8);

  return (
    <div className="border-b border-slate-100 p-2" role="dialog" aria-label="Start a new chat">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="To: type a name…"
          aria-label="Search people to chat with"
          disabled={creating}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel new chat"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      {directory === null ? (
        <p className="mt-2 px-1 text-xs text-slate-500" role="status">Loading directory…</p>
      ) : matches.length === 0 ? (
        <p className="mt-2 px-1 text-xs text-slate-500">No people match.</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {matches.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                disabled={creating}
                onClick={() => onPick?.(u)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-800 hover:bg-teal-50 disabled:opacity-50"
              >
                <PresenceAvatar
                  displayName={u.displayName || u.username}
                  status={presenceByUser?.[u.id]?.status || 'offline'}
                  size={28}
                />
                <span className="min-w-0 flex-1 truncate">{u.displayName || u.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Teams-style pane: Chats (people) first with previews, channels below.
 */
export default function RoomList({
  rooms = [],
  activeRoomId,
  onSelectRoom,
  loading,
  searchQuery = '',
  onSearchQueryChange,
  onRetry,
  onStartDm,
  dmDirectory,
  dmCreating = false,
  presenceByUser = {},
  currentUserId = '',
}) {
  const [dmOpen, setDmOpen] = useState(false);
  const channels = rooms.filter((r) => r.scopeKind !== 'dm' && r.kind !== 'dm');
  const dms = rooms
    .filter((r) => r.scopeKind === 'dm' || r.kind === 'dm')
    .sort((a, b) =>
      String(b.lastMessage?.createdAtIso || b.updatedAtIso || '').localeCompare(
        String(a.lastMessage?.createdAtIso || a.updatedAtIso || '')
      )
    );
  const hasQuery = Boolean(String(searchQuery || '').trim());

  if (loading) {
    return <p className="p-3 text-sm text-slate-500" role="status">Loading chats…</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {onSearchQueryChange ? (
        <div className="flex shrink-0 items-center gap-1 border-b border-slate-100 p-2">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search chats and channels</span>
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
            />
          </label>
          {onStartDm ? (
            <button
              type="button"
              onClick={() => setDmOpen((o) => !o)}
              aria-label="Start a new chat"
              aria-expanded={dmOpen}
              title="New chat"
              className={`shrink-0 rounded-lg p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 ${
                dmOpen ? 'bg-teal-50 text-teal-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <SquarePen size={16} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
      {dmOpen && onStartDm ? (
        <NewDmPicker
          directory={dmDirectory}
          creating={dmCreating}
          presenceByUser={presenceByUser}
          onClose={() => setDmOpen(false)}
          onPick={async (user) => {
            const ok = await onStartDm(user);
            if (ok !== false) setDmOpen(false);
          }}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
        {!rooms.length ? (
          <div>
            <ListEmptyState
              title={hasQuery ? 'No matching chats' : 'No chats yet'}
              description={
                hasQuery
                  ? 'Try a different name or channel.'
                  : 'Start a chat with a co-worker or wait for channels to load.'
              }
              className="py-8"
            />
            {!hasQuery ? (
              <div className="flex flex-col items-center gap-2">
                {onStartDm ? (
                  <button
                    type="button"
                    onClick={() => setDmOpen(true)}
                    className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900"
                  >
                    New chat
                  </button>
                ) : null}
                {onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Retry loading
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between px-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chat</p>
                {onStartDm && !dms.length ? (
                  <button
                    type="button"
                    onClick={() => setDmOpen(true)}
                    className="text-xs font-semibold text-teal-800 hover:underline"
                  >
                    New chat
                  </button>
                ) : null}
              </div>
              {dms.length ? (
                <ul className="mt-1 space-y-0.5">
                  {dms.map((r) => (
                    <li key={r.id}>
                      <ChatRow
                        room={r}
                        activeRoomId={activeRoomId}
                        onSelectRoom={onSelectRoom}
                        presenceByUser={presenceByUser}
                        currentUserId={currentUserId}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 px-2 text-xs text-slate-400">
                  No conversations yet — message a co-worker.
                </p>
              )}
            </div>
            {channels.length ? (
              <div>
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Channels</p>
                <ul className="mt-1 space-y-0.5">
                  {channels.map((r) => (
                    <li key={r.id}>
                      <ChannelRow room={r} activeRoomId={activeRoomId} onSelectRoom={onSelectRoom} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
