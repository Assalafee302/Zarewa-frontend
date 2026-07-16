import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, ArrowDown } from 'lucide-react';
import MessageComposer from './MessageComposer';
import WorkCard from './WorkCard';
import PresenceAvatar from './PresenceAvatar';
import { ListEmptyState } from '../../ui/ListEmptyState';

/** Compact: time only for today's messages, date + time otherwise. */
function formatMessageTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

const NEAR_BOTTOM_PX = 120;

/**
 * Room conversation view. Autoscrolls only when the reader is already near
 * the bottom; otherwise shows a "jump to latest" affordance.
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
  composerDisabled = false,
  composerDisabledReason,
}) {
  const scrollRef = useRef(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);

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

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <ListEmptyState
          title="Select a room"
          description="Choose a channel or DM to collaborate."
          className="py-4"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to room list"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <ArrowLeft size={18} aria-hidden />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-slate-900">{room.name || `#${room.slug}`}</h2>
            {room.description ? <p className="mt-0.5 text-xs text-slate-500">{room.description}</p> : null}
          </div>
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
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
        >
          {loading ? (
            <p className="text-sm text-slate-500" role="status">
              Loading messages…
            </p>
          ) : null}
          {!loading && messages.length === 0 ? (
            <ListEmptyState
              title="No messages yet"
              description="Send the first message to start the conversation."
              className="py-6"
            />
          ) : null}
          {messages.map((m, idx) => {
            const name = m.authorDisplayName || m.authorName || m.authorUserId || 'Someone';
            const status = presenceByUser[m.authorUserId]?.status || 'offline';
            return (
              <div key={m.id || `msg-${idx}-${m.createdAtIso || ''}`} className="flex gap-2">
                <PresenceAvatar displayName={name} status={status} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-900">{name}</span>
                    <time className="text-xs text-slate-400" dateTime={m.createdAtIso || undefined}>
                      {formatMessageTime(m.createdAtIso)}
                    </time>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-800">{m.body}</p>
                </div>
              </div>
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
      />
    </div>
  );
}
