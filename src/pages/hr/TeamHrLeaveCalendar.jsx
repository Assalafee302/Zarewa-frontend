import React, { useMemo, useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { fetchHrLeaveCalendar } from '../../lib/hrExtended';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

function monthRange() {
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 2, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function TeamHrLeaveCalendar() {
  const [{ from, to }, setRange] = useState(monthRange);
  const [entries, setEntries] = useState([]);

  const { loading, error } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrLeaveCalendar(from, to);
    if (!ok || !data?.ok) {
      setEntries([]);
      return { error: data?.error || 'Could not load leave calendar.', hasData: false };
    }
    setEntries(data.entries || []);
    return { hasData: true };
  }, [from, to]);

  const byStaff = useMemo(() => {
    const map = {};
    for (const e of entries) {
      map[e.userId] = map[e.userId] || { name: e.displayName, items: [] };
      map[e.userId].items.push(e);
    }
    return Object.values(map);
  }, [entries]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Approved leave for your branch — plan team coverage.</p>
      <div className="flex flex-wrap gap-3">
        <label className="text-xs font-semibold text-slate-600">
          From
          <input type="date" className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" value={from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          To
          <input type="date" className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" value={to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </label>
      </div>
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <AppTableWrap>
        <AppTable>
          <AppTableThead>
            <AppTableTr>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>Leave type</AppTableTh>
              <AppTableTh>From</AppTableTh>
              <AppTableTh>To</AppTableTh>
              <AppTableTh align="right">Days</AppTableTh>
            </AppTableTr>
          </AppTableThead>
          <AppTableBody>
            {entries.map((e) => (
              <AppTableTr key={e.requestId}>
                <AppTableTd className="font-semibold">{e.displayName}</AppTableTd>
                <AppTableTd>{e.leaveType}</AppTableTd>
                <AppTableTd>{e.startDateIso}</AppTableTd>
                <AppTableTd>{e.endDateIso}</AppTableTd>
                <AppTableTd align="right">{e.daysRequested}</AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      {!loading && !entries.length ? <p className="text-sm text-slate-500">No approved leave in this range.</p> : null}
      {byStaff.length > 0 ? (
        <p className="text-xs text-slate-500">{byStaff.length} staff with leave in range.</p>
      ) : null}
    </div>
  );
}
