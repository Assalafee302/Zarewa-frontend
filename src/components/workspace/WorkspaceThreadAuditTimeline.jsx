import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';

/**
 * Thread or work-item audit timeline from backend.
 */
const TIMELINE_KIND_LABELS = {
  memo_created: 'Memo created',
  reply_added: 'Reply added',
  system_update: 'System update',
  attachment_uploaded: 'Attachment uploaded',
  status_changed: 'Status changed',
  converted: 'Converted',
  filed: 'Filed',
  created: 'Created',
  decision: 'Decision',
  audit: 'Audit',
};

export function WorkspaceThreadAuditTimeline({ threadId, workItemId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tid = String(threadId || '').trim();
    const wid = String(workItemId || '').trim();
    if (!tid && !wid) {
      setEvents([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
  (async () => {
      const path = tid
        ? `/api/office/threads/${encodeURIComponent(tid)}/timeline`
        : `/api/work-items/${encodeURIComponent(wid)}/timeline`;
      const { ok, data } = await apiFetch(path);
      if (cancelled) return;
      setLoading(false);
      if (ok && data?.ok && Array.isArray(data.events)) setEvents(data.events);
      else setEvents([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, workItemId]);

  if (loading) {
    return <p className="text-[11px] text-slate-500">Loading timeline…</p>;
  }
  if (!events.length) {
    return (
      <p className="text-[11px] text-slate-500">No audit events recorded yet for this item.</p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        <Clock size={12} />
        Audit timeline
      </p>
      <ol className="space-y-2 border-l-2 border-teal-200/80 pl-3">
        {events.map((ev) => (
          <li key={ev.id} className="relative text-[11px] text-slate-700">
            <span className="absolute -left-[13px] top-1.5 h-2 w-2 rounded-full bg-teal-600" />
            <p className="font-semibold text-slate-900">{TIMELINE_KIND_LABELS[ev.kind] || ev.label}</p>
            <p className="text-[10px] text-slate-500">
              {ev.atIso ? new Date(ev.atIso).toLocaleString() : '—'}
              {ev.actor ? ` · ${ev.actor}` : ''}
            </p>
            {ev.note ? <p className="mt-0.5 text-slate-600">{ev.note}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
