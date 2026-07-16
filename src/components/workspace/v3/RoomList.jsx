import React, { useState, useRef, useEffect } from 'react';
import { Hash, MessageCircle, Search, Plus, X } from 'lucide-react';
import { ListEmptyState } from '../../ui/ListEmptyState';

function RoomRow({ room, activeRoomId, onSelectRoom }) {
  const unread = Number(room.unreadCount || 0);
  const active = activeRoomId === room.id;
  const isDm = room.scopeKind === 'dm' || room.kind === 'dm';
  const Icon = isDm ? MessageCircle : Hash;
  const label = room.name || `#${room.slug}`;

  return (
    <button
      type="button"
      aria-label={`${label}${unread > 0 ? `, ${unread} unread` : ''}`}
      aria-current={active ? 'location' : undefined}
      onClick={() => onSelectRoom?.(room)}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
        active ? 'bg-teal-50 text-teal-900' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon size={16} className="shrink-0 text-slate-400" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {unread > 0 ? (
        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold leading-none text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </button>
  );
}

/** Inline "start a DM" picker fed by the office directory. */
function NewDmPicker({ directory, onPick, onClose, creating }) {
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
    <div className="border-b border-slate-100 p-2" role="dialog" aria-label="Start a direct message">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Who do you want to message?"
          aria-label="Search people for direct message"
          disabled={creating}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel new message"
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
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-900" aria-hidden>
                  {String(u.displayName || u.username || '?').charAt(0).toUpperCase()}
                </span>
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
 * Room list — channels + DMs with search and New DM.
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
}) {
  const [dmOpen, setDmOpen] = useState(false);
  const channels = rooms.filter((r) => r.scopeKind !== 'dm' && r.kind !== 'dm');
  const dms = rooms.filter((r) => r.scopeKind === 'dm' || r.kind === 'dm');
  const hasQuery = Boolean(String(searchQuery || '').trim());

  if (loading) {
    return <p className="p-3 text-sm text-slate-500" role="status">Loading rooms…</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {onSearchQueryChange ? (
        <div className="flex shrink-0 items-center gap-1 border-b border-slate-100 p-2">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search rooms</span>
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search rooms…"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
            />
          </label>
          {onStartDm ? (
            <button
              type="button"
              onClick={() => setDmOpen((o) => !o)}
              aria-label="Start a direct message"
              aria-expanded={dmOpen}
              title="New direct message"
              className={`shrink-0 rounded-lg p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 ${
                dmOpen ? 'bg-teal-50 text-teal-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Plus size={16} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
      {dmOpen && onStartDm ? (
        <NewDmPicker
          directory={dmDirectory}
          creating={dmCreating}
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
              title={hasQuery ? 'No matching rooms' : 'No rooms yet'}
              description={
                hasQuery
                  ? 'Try a different name or channel slug.'
                  : 'Default branch channels appear once the rooms service is reachable.'
              }
              className="py-8"
            />
            {!hasQuery && onRetry ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Retry loading rooms
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {channels.length ? (
              <div>
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Channels</p>
                <ul className="mt-1 space-y-0.5">
                  {channels.map((r) => (
                    <li key={r.id}>
                      <RoomRow room={r} activeRoomId={activeRoomId} onSelectRoom={onSelectRoom} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {dms.length ? (
              <div>
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Direct</p>
                <ul className="mt-1 space-y-0.5">
                  {dms.map((r) => (
                    <li key={r.id}>
                      <RoomRow room={r} activeRoomId={activeRoomId} onSelectRoom={onSelectRoom} />
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
