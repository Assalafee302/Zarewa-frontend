import React from 'react';
import { ListEmptyState } from '../../ui/ListEmptyState';

function formatActivityWhen(iso) {
  if (!iso) return '';
  try {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return String(iso);
    const diff = Date.now() - t;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(t).toLocaleDateString();
  } catch {
    return String(iso);
  }
}

/**
 * Activity feed — mentions, assignments, SLA, system events.
 */
export default function ActivityFeed({
  events = [],
  loading,
  onOpenEvent,
  onMarkRead,
  priorityBanner = null,
}) {
  return (
    <div className="space-y-3" role="region" aria-label="Workspace activity">
      {priorityBanner ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Priority</p>
          <p className="mt-1 text-sm font-semibold text-amber-950">{priorityBanner.title}</p>
          {priorityBanner.subtitle ? (
            <p className="mt-0.5 text-xs text-amber-900">{priorityBanner.subtitle}</p>
          ) : null}
          {priorityBanner.onOpen ? (
            <button
              type="button"
              onClick={priorityBanner.onOpen}
              aria-label={`Open priority item: ${priorityBanner.title || 'Action'}`}
              className="mt-2 text-xs font-semibold text-teal-900 underline"
            >
              Open
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
        {onMarkRead ? (
          <button
            type="button"
            onClick={onMarkRead}
            disabled={!events.length}
            aria-label="Mark all activity as read"
            className="text-xs font-semibold text-teal-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark all read
          </button>
        ) : null}
      </div>
      {loading ? (
        <p className="text-sm text-slate-500" role="status" aria-live="polite">
          Loading activity…
        </p>
      ) : events.length === 0 ? (
        <ListEmptyState
          title="No activity yet"
          description="Mentions, assignments, and SLA alerts will appear here."
          className="py-8"
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {events.map((ev, idx) => {
            const summary = ev.summaryText || ev.summary || ev.title || 'Activity event';
            const when = formatActivityWhen(ev.createdAtIso || ev.at);
            const meta = [ev.eventKind || ev.kind, when].filter(Boolean).join(' · ');
            const unread = ev.read === false;
            return (
              <li key={ev.id || `activity-${idx}`}>
                <button
                  type="button"
                  onClick={() => onOpenEvent?.(ev)}
                  aria-label={`${summary}${unread ? ', unread' : ''}`}
                  title={ev.createdAtIso || undefined}
                  className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-600"
                >
                  {unread ? (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                  ) : (
                    <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{summary}</span>
                    {meta ? <span className="mt-0.5 block text-xs text-slate-500">{meta}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
