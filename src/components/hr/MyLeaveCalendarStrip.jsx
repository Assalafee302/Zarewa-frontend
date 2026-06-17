import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { leaveTypeLabel } from '../../lib/hrLeaveUi';
import { ProfileStatusChip } from '../profile/profileDesign';

function monthRange() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, 0));
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export function MyLeaveCalendarStrip() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const range = useMemo(() => monthRange(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const q = new URLSearchParams({ from: range.from, to: range.to });
      const { ok, data } = await apiFetch(`/api/hr/leave/calendar?${q}`);
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setError(data?.error || 'Could not load leave calendar.');
        setEntries([]);
      } else {
        setEntries(data.entries || []);
        setError('');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">{error}</p>;
  }

  if (!entries.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No approved leave in the next six months. When HR approves leave, it will appear here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li
          key={e.requestId || `${e.startDateIso}-${e.endDateIso}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:border-teal-100 hover:shadow-md"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{leaveTypeLabel(e.leaveType)}</p>
            <p className="text-xs text-slate-500">
              {e.startDateIso} → {e.endDateIso}
              {e.daysRequested ? ` · ${e.daysRequested} day${e.daysRequested === 1 ? '' : 's'}` : ''}
            </p>
          </div>
          <ProfileStatusChip variant="approved">Approved</ProfileStatusChip>
        </li>
      ))}
    </ul>
  );
}
