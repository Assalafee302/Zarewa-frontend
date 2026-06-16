import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { fetchDailyRoll } from '../../lib/hrIncidents';
import { HrCard } from './hrPageUi';

const STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
  leave: 'On leave',
};

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'present') return 'bg-emerald-100 text-emerald-800';
  if (s === 'late') return 'bg-amber-100 text-amber-900';
  if (s === 'absent') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

export default function HrCaseAttendancePanel({ branchId, dayIso, userIds = [] }) {
  const [roll, setRoll] = useState(null);
  const [staff, setStaff] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!branchId || !dayIso) return;
    setBusy(true);
    setErr('');
    const [{ ok, data }, staffRes] = await Promise.all([
      fetchDailyRoll(branchId, dayIso),
      apiFetch('/api/hr/staff'),
    ]);
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not load attendance for incident date.');
      setRoll(null);
    } else {
      setRoll(data?.roll || null);
    }
    if (staffRes.ok && staffRes.data?.ok) setStaff(staffRes.data.staff || []);
  }, [branchId, dayIso]);

  useEffect(() => {
    load();
  }, [load]);

  const staffNameById = useMemo(() => {
    const map = new Map();
    for (const s of staff) map.set(s.userId, s.displayName || s.userId);
    return map;
  }, [staff]);

  const filterSet = useMemo(() => new Set((userIds || []).filter(Boolean)), [userIds]);

  const rows = useMemo(() => {
    const raw = Array.isArray(roll?.rows) ? roll.rows : [];
    const filtered = filterSet.size ? raw.filter((r) => filterSet.has(r.userId)) : raw;
    return filtered.map((r) => ({
      ...r,
      displayName: staffNameById.get(r.userId) || r.userId,
      statusLabel: STATUS_LABELS[String(r.status || '').toLowerCase()] || r.status || 'Unknown',
    }));
  }, [roll, filterSet, staffNameById]);

  if (!branchId || !dayIso) return null;

  return (
    <HrCard title="Attendance on incident date" subtitle={`Branch ${branchId} · ${dayIso}`}>
      {busy ? <p className="text-sm text-slate-500">Loading attendance…</p> : null}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      {!busy && !err && !roll ? (
        <p className="text-sm text-slate-500">No daily roll call recorded for this date. Mark attendance in HR → Attendance if needed.</p>
      ) : null}
      {rows.length ? (
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-800">{r.displayName}</span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(r.status)}`}>
                {r.statusLabel}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {!busy && roll && !rows.length && filterSet.size ? (
        <p className="text-sm text-slate-500">No attendance rows found for the involved staff on this date.</p>
      ) : null}
    </HrCard>
  );
}
