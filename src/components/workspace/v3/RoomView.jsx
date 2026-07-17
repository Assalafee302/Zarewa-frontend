import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowDown,
  BellOff,
  Copy,
  Download,
  FileText,
  Pencil,
  Reply,
  Trash2,
} from 'lucide-react';
import MessageComposer from './MessageComposer';
import WorkCard from './WorkCard';
import PresenceAvatar from './PresenceAvatar';
import { ListEmptyState } from '../../ui/ListEmptyState';

function formatBubbleTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function dayLabel(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** Group consecutive messages from the same author within 5 minutes (Teams-style). */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function MessageAttachments({ attachments, mine }) {
  if (!attachments?.length) return null;
  return (
    <div className={`mt-1.5 flex flex-wrap gap-1.5 ${mine ? 'justify-end' : ''}`}>
      {attachments.map((a, i) =>
        a.isImage || String(a.mime || '').startsWith('image/') ? (
          <a
            key={`${a.name}-${i}`}
            href={a.dataUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open image ${a.name}`}
            className="block overflow-hidden rounded-lg border border-slate-200"
          >
            <img
              src={a.dataUrl}
              alt={a.name || 'Image attachment'}
              loading="lazy"
              className="max-h-56 max-w-[16rem] object-contain"
            />
          </a>
        ) : (
          <a
            key={`${a.name}-${i}`}
            href={a.dataUrl}
            download={a.name || 'attachment'}
            aria-label={`Download ${a.name}`}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
              mine
                ? 'border-teal-700 bg-teal-700/40 text-white hover:bg-teal-700/60'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText size={14} aria-hidden />
            <span className="max-w-[10rem] truncate">{a.name || 'Attachment'}</span>
            <Download size={12} aria-hidden />
          </a>
        )
      )}
    </div>
  );
}

const NEAR_BOTTOM_PX = 120;

/**
 * Teams-style chat: own messages right in teal bubbles, others left with
 * avatars, day separators, grouped consecutive messages, inline images.
 * Autoscrolls only when the reader is near the bottom.
 */
export default function RoomView({
  room,
  messages = [],
  pinnedCards = [],
  loading,
  sending,
  onSend,
  onPromote,
  onOpenCard,
  onBack,
  presenceByUser = {},
  currentUserId = '',
  composerDisabled = false,
  composerDisabledReason,
  deskProfile = 'staff',
  hasMore = false,
  loadingEarlier = false,
  onLoadEarlier,
  onMuteRoom,
  onArchiveRoom,
  onEditMessage,
  onDeleteMessage,
  directory = [],
}) {
  const scrollRef = useRef(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setHasNewBelow(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    setPinnedToBottom(nearBottom);
    if (nearBottom) setHasNewBelow(false);
  }, []);

  // Instant jump on room change; conditional scroll on new messages.
  useEffect(() => {
    scrollToBottom('auto');
    setPinnedToBottom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  useEffect(() => {
    if (pinnedToBottom) scrollToBottom('smooth');
    else if (messages.length) setHasNewBelow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const uid = String(currentUserId || '');

  /** Precompute day separators and grouping flags. */
  const rendered = useMemo(() => {
    const out = [];
    let prev = null;
    for (const m of messages) {
      const showDay = !prev || !sameDay(prev.createdAtIso, m.createdAtIso);
      const grouped =
        !showDay &&
        prev &&
        String(prev.authorUserId || '') === String(m.authorUserId || '') &&
        Math.abs(new Date(m.createdAtIso) - new Date(prev.createdAtIso)) < GROUP_WINDOW_MS;
      out.push({ message: m, showDay, grouped });
      prev = m;
    }
    return out;
  }, [messages]);

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <ListEmptyState
          title="Select a chat"
          description="Choose a person or channel to start talking."
          className="py-4"
        />
      </div>
    );
  }

  const isDm = room.scopeKind === 'dm' || room.kind === 'dm';
  const headerPresence = isDm && room.peerUserId ? presenceByUser[room.peerUserId]?.status : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to chat list"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <ArrowLeft size={18} aria-hidden />
            </button>
          ) : null}
          {isDm ? (
            <PresenceAvatar
              displayName={room.name || room.slug}
              status={headerPresence || 'offline'}
              size={32}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-slate-900">
              {room.name || `#${room.slug}`}
            </h2>
            {isDm && headerPresence ? (
              <p className="mt-0.5 text-xs capitalize text-slate-500">{headerPresence}</p>
            ) : room.description ? (
              <p className="mt-0.5 text-xs text-slate-500">{room.description}</p>
            ) : null}
          </div>
          {onMuteRoom ? (
            <button
              type="button"
              onClick={() => onMuteRoom(room, !room.muted)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label={room.muted ? 'Unmute room' : 'Mute room for 8 hours'}
              title={room.muted ? 'Unmute' : 'Mute 8 hours'}
            >
              <BellOff size={16} aria-hidden />
            </button>
          ) : null}
          {!isDm && onArchiveRoom ? (
            <button
              type="button"
              onClick={() => onArchiveRoom(room)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Archive channel"
              title="Archive channel"
            >
              <Archive size={16} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
      {pinnedCards.length ? (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50 px-3 py-2">
          {pinnedCards.map((card) => (
            <div key={card.id} className="min-w-[14rem] max-w-[18rem] shrink-0">
              <WorkCard
                pinned
                title={card.title}
                subtitle={card.subtitle}
                kind={card.kind}
                status={card.status}
                onOpen={() => onOpenCard?.(card)}
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role="log"
          aria-label={`Messages in ${room.name || room.slug}`}
          aria-live="polite"
          className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-3"
        >
          {loading ? (
            <p className="text-sm text-slate-500" role="status">
              Loading messages…
            </p>
          ) : null}
          {!loading && hasMore ? (
            <div className="mb-3 text-center">
              <button
                type="button"
                disabled={loadingEarlier}
                onClick={onLoadEarlier}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingEarlier ? 'Loading earlier messages...' : 'Load earlier'}
              </button>
            </div>
          ) : null}
          {!loading && messages.length === 0 ? (
            <ListEmptyState
              title="No messages yet"
              description={isDm ? 'Say hi — this is the start of your conversation.' : 'Send the first message to start the conversation.'}
              className="py-6"
            />
          ) : null}
          {rendered.map(({ message: m, showDay, grouped }, idx) => {
            const mine = uid && String(m.authorUserId || '') === uid;
            const name = m.authorDisplayName || m.authorName || m.authorUserId || 'Someone';
            const status = presenceByUser[m.authorUserId]?.status || 'offline';
            const hasBody = Boolean(String(m.body || '').trim());
            return (
              <React.Fragment key={m.id || `msg-${idx}-${m.createdAtIso || ''}`}>
                {showDay ? (
                  <div className="my-3 flex items-center gap-3" role="separator" aria-label={dayLabel(m.createdAtIso)}>
                    <span className="h-px flex-1 bg-slate-200" aria-hidden />
                    <span className="text-xs font-semibold text-slate-500">{dayLabel(m.createdAtIso)}</span>
                    <span className="h-px flex-1 bg-slate-200" aria-hidden />
                  </div>
                ) : null}
                <div
                  className={`group flex gap-2 ${mine ? 'justify-end' : ''} ${grouped ? 'mt-0.5' : 'mt-2.5'}`}
                >
                  {!mine ? (
                    grouped ? (
                      <span className="w-7 shrink-0" aria-hidden />
                    ) : (
                      <PresenceAvatar displayName={name} status={status} size={28} />
                    )
                  ) : null}
                  <div className={`min-w-0 max-w-[78%] ${mine ? 'items-end text-right' : ''}`}>
                    {!mine && !grouped ? (
                      <div className="mb-0.5 flex items-baseline gap-2 text-left">
                        <span className="text-xs font-semibold text-slate-700">{name}</span>
                        <time className="text-[10px] text-slate-400" dateTime={m.createdAtIso || undefined}>
                          {formatBubbleTime(m.createdAtIso)}
                        </time>
                      </div>
                    ) : null}
                    <div className={`inline-block text-left ${mine ? 'ml-auto' : ''}`}>
                      {!m.deleted ? (
                        <div className={`mb-1 hidden items-center gap-0.5 group-hover:flex group-focus-within:flex ${mine ? 'justify-end' : ''}`}>
                          <button type="button" onClick={() => setReplyTo(m)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Reply">
                            <Reply size={13} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard?.writeText?.(m.body || '')}
                            className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                            aria-label="Copy message"
                          >
                            <Copy size={13} aria-hidden />
                          </button>
                          {mine && onEditMessage ? (
                            <button type="button" onClick={() => onEditMessage(m)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Edit message">
                              <Pencil size={13} aria-hidden />
                            </button>
                          ) : null}
                          {mine && onDeleteMessage ? (
                            <button type="button" onClick={() => onDeleteMessage(m)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-700" aria-label="Delete message">
                              <Trash2 size={13} aria-hidden />
                            </button>
                          ) : null}
                          {onPromote && hasBody ? (
                            <button
                              type="button"
                              onClick={() => onPromote('work_item', m.body, m.id)}
                              className="rounded px-1.5 py-1 text-[10px] font-semibold text-slate-500 hover:bg-white hover:text-teal-800"
                            >
                              Promote
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      {m.parentMessageId ? (
                        <p className="mb-1 max-w-xs truncate rounded border-l-2 border-slate-300 bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
                          Reply to {m.parentMessageId}
                        </p>
                      ) : null}
                      {hasBody ? (
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            mine
                              ? 'rounded-br-md bg-teal-800 text-white'
                              : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          <p className={`whitespace-pre-wrap break-words ${m.deleted ? 'italic opacity-70' : ''}`}>{m.body}</p>
                          {m.editedAtIso && !m.deleted ? <span className="mt-1 block text-[10px] opacity-70">edited</span> : null}
                        </div>
                      ) : null}
                      <MessageAttachments attachments={m.attachments} mine={mine} />
                      {mine && !grouped ? (
                        <div className="mt-0.5 text-right">
                          <time className="text-[10px] text-slate-400" dateTime={m.createdAtIso || undefined}>
                            {formatBubbleTime(m.createdAtIso)}
                          </time>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
        {hasNewBelow ? (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            aria-label="Jump to latest messages"
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-teal-900"
          >
            <ArrowDown size={14} aria-hidden />
            New messages
          </button>
        ) : null}
      </div>
      <MessageComposer
        onSend={onSend}
        sending={sending}
        disabled={composerDisabled}
        disabledReason={composerDisabledReason}
        onPromote={onPromote}
        showPromote
        deskProfile={deskProfile}
        placeholder={isDm ? `Message ${room.name || ''}…` : 'Message this channel…'}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        directory={directory}
      />
    </div>
  );
}
