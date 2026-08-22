import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, UserX, Users } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatPersonName } from '../../lib/formatPersonName';
import { TEAM_HR_ATTENDANCE_PATH } from '../../lib/managerPageTabs';
import { teamHrTimeAbsencePath } from '../../lib/teamHrRoutes';
import { FinanceSequencePanel } from '../layout';
import { ymdLocal } from '../../lib/managerDashboardCore';

const TEAM_HR_INCIDENTS = '/team-hr/incidents';
const TEAM_HR_TRANSFERS = '/team-hr/transfers';
const TEAM_HR_CALENDAR = teamHrTimeAbsencePath('calendar');

function weekBoundsIso(fromDate = new Date()) {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(start), to: iso(end) };
}

function readStaffUserId(row) {
  return String(row?.userId || row?.user_id || row?.id || '').trim();
}

function staffName(row) {
  return formatPersonName(row?.displayName || row?.username || row?.name || 'Staff');
}

function GlanceRow({ to, title, meta, tone = 'slate' }) {
  const toneClass =
    tone === 'rose'
      ? 'border-l-rose-500'
      : tone === 'amber'
        ? 'border-l-amber-400'
        : 'border-l-slate-300';
  return (
    <Link
      to={to}
      className={`flex items-start gap-2 border-b border-slate-100 border-l-4 ${toneClass} px-3 py-2.5 last:border-b-0 no-underline hover:bg-slate-50/80`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-900 truncate">{title}</p>
        {meta ? <p className="mt-0.5 text-ui-xs text-slate-500 truncate">{meta}</p> : null}
      </div>
      <span className="shrink-0 text-ui-xs font-medium text-slate-600">Open</span>
    </Link>
  );
}

function SectionLabel({ icon: Icon, label, count, href }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
      <p className="flex items-center gap-1.5 text-ui-xs font-medium text-slate-500">
        {Icon ? <Icon size={12} className="text-zarewa-teal" aria-hidden /> : null}
        {label}
        {count != null ? <span className="tabular-nums text-slate-400">({count})</span> : null}
      </p>
      {href ? (
        <Link to={href} className="text-ui-xs font-medium text-slate-700 no-underline hover:underline">
          Team HR
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Manager glance — named absentees, leave this week, open incidents/transfers,
 * plus open maintenance WO counts per assigned technician.
 */
export function ManagerPeopleGlancePanel({
  branchId = '',
  available = true,
  refreshEpoch = 0,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [absentPeople, setAbsentPeople] = useState([]);
  const [leaveEntries, setLeaveEntries] = useState([]);
  const [leaveNamesRedacted, setLeaveNamesRedacted] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [workload, setWorkload] = useState([]);

  const load = useCallback(async () => {
    if (!available || !branchId) {
      setLoading(false);
      setAbsentPeople([]);
      setLeaveEntries([]);
      setIncidents([]);
      setTransfers([]);
      setWorkload([]);
      return;
    }
    setLoading(true);
    setError('');
    const dayIso = ymdLocal(new Date());
    const { from, to } = weekBoundsIso(new Date());

    const [staffQ, rollQ, leaveQ, memoQ, xferQ, woQ] = await Promise.all([
      apiFetch('/api/hr/staff?attendanceEligible=1').catch(() => ({ ok: false })),
      apiFetch(
        `/api/hr/attendance/daily-roll?branchId=${encodeURIComponent(branchId)}&dayIso=${encodeURIComponent(dayIso)}`
      ).catch(() => ({ ok: false })),
      apiFetch(`/api/hr/leave/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).catch(() => ({
        ok: false,
      })),
      apiFetch('/api/hr/incident-memos').catch(() => ({ ok: false })),
      apiFetch('/api/hr/transfer-requests?pending=1').catch(() => ({ ok: false })),
      apiFetch('/api/maintenance/work-orders?openOnly=1').catch(() => ({ ok: false })),
    ]);

    const staff = Array.isArray(staffQ.data?.staff) ? staffQ.data.staff : [];
    const nameById = new Map();
    for (const s of staff) {
      const id = readStaffUserId(s);
      if (id) nameById.set(id, staffName(s));
    }

    const rollRows =
      rollQ.ok && rollQ.data?.ok && Array.isArray(rollQ.data.roll?.rows) ? rollQ.data.roll.rows : [];
    const absent = rollRows
      .filter((r) => String(r.status || '').toLowerCase() === 'absent')
      .map((r) => {
        const id = readStaffUserId(r);
        return {
          userId: id,
          name: nameById.get(id) || 'Staff member',
          remark: r.remark || '',
        };
      });
    setAbsentPeople(absent);
    const attendanceByUserId = new Map(
      rollRows.map((r) => [readStaffUserId(r), String(r.status || '').replace(/_/g, ' ')])
    );

    const leaveList = leaveQ.ok && Array.isArray(leaveQ.data?.entries) ? leaveQ.data.entries : [];
    const branchLeave = leaveList.filter((e) => !branchId || String(e.branchId || '') === String(branchId));
    const redacted = branchLeave.some(
      (e) => !e.userId || String(e.displayName || '').trim().toLowerCase() === 'on leave'
    );
    setLeaveNamesRedacted(redacted);
    setLeaveEntries(branchLeave);

    const memos = memoQ.ok && Array.isArray(memoQ.data?.memos || memoQ.data?.incidentMemos || memoQ.data?.items)
      ? memoQ.data.memos || memoQ.data.incidentMemos || memoQ.data.items
      : Array.isArray(memoQ.data?.rows)
        ? memoQ.data.rows
        : [];
    const openMemos = (Array.isArray(memos) ? memos : []).filter((m) => {
      const st = String(m.status || '').toLowerCase();
      return st && !['closed', 'cancelled', 'rejected'].includes(st);
    });
    setIncidents(openMemos);

    const xfers = xferQ.ok && Array.isArray(xferQ.data?.transfers || xferQ.data?.items)
      ? xferQ.data.transfers || xferQ.data.items
      : [];
    setTransfers(Array.isArray(xfers) ? xfers : []);

    const wos = woQ.ok && Array.isArray(woQ.data?.workOrders) ? woQ.data.workOrders : [];
    const byAssignee = new Map();
    let unassigned = 0;
    for (const wo of wos) {
      const uid = String(wo.assignedToUserId || '').trim();
      if (!uid) {
        unassigned += 1;
        continue;
      }
      const prev = byAssignee.get(uid) || { userId: uid, name: nameById.get(uid) || 'Technician', count: 0, attendance: attendanceByUserId.get(uid) || 'not marked' };
      prev.count += 1;
      if (!nameById.has(uid) && wo.assignedToDisplayName) prev.name = wo.assignedToDisplayName;
      byAssignee.set(uid, prev);
    }
    const wl = [...byAssignee.values()].sort((a, b) => b.count - a.count);
    if (unassigned > 0) wl.push({ userId: '', name: 'Unassigned', count: unassigned });
    setWorkload(wl);

    if (!staffQ.ok && !rollQ.ok && !leaveQ.ok && !memoQ.ok && !xferQ.ok) {
      setError('Could not load Team HR glance data.');
    }
    setLoading(false);
  }, [available, branchId]);

  useEffect(() => {
    void load();
  }, [load, refreshEpoch]);

  const openFlags = useMemo(() => {
    const rows = [];
    for (const m of incidents.slice(0, 5)) {
      rows.push({
        key: `inc-${m.id}`,
        to: TEAM_HR_INCIDENTS,
        title: m.staffDisplayName || nameOrFallback(m) || 'Staff incident',
        meta: `${m.summary || 'Incident'} · ${String(m.status || 'open').replace(/_/g, ' ')}`,
        tone: 'rose',
      });
    }
    for (const t of transfers.slice(0, 5)) {
      rows.push({
        key: `xf-${t.id}`,
        to: `${TEAM_HR_TRANSFERS}?transferId=${encodeURIComponent(t.id)}`,
        title: t.staffDisplayName || 'Transfer',
        meta: `${String(t.transferType || 'transfer').replace(/_/g, ' ')} · ${String(t.status || '').replace(/_/g, ' ')}`,
        tone: 'amber',
      });
    }
    return rows;
  }, [incidents, transfers]);

  if (!available) {
    return (
      <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 bg-white">
        <h3 className="text-sm font-semibold text-slate-900">People</h3>
        <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-2 text-ui-xs text-amber-900">
          Team HR glance unavailable — attendance / team-view permission missing. Not approximated.
        </p>
      </FinanceSequencePanel>
    );
  }

  if (!branchId) {
    return (
      <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-5 bg-white">
        <h3 className="text-sm font-semibold text-slate-900">People</h3>
        <p className="mt-2 text-xs text-slate-500">Select a branch to see attendance and team flags.</p>
      </FinanceSequencePanel>
    );
  }

  return (
    <FinanceSequencePanel className="!min-h-0 sm:!min-h-0 p-0 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Users size={16} aria-hidden />
            People
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Glance from Team HR — not a second HR desk</p>
        </div>
        <Link
          to={TEAM_HR_ATTENDANCE_PATH}
          className="text-ui-xs font-medium text-slate-700 no-underline hover:underline"
        >
          My Team →
        </Link>
      </div>

      {error ? (
        <p className="mx-3 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="px-4 py-8 text-center text-xs text-slate-500">Loading people…</p>
      ) : (
        <div className="pb-2">
          <SectionLabel icon={UserX} label="Absent today" count={absentPeople.length} href={TEAM_HR_ATTENDANCE_PATH} />
          {absentPeople.length === 0 ? (
            <p className="px-3 pb-2 text-ui-xs text-slate-500">
              No one marked absent on today’s roll (unmarked ≠ absent).
            </p>
          ) : (
            <div className="border-t border-slate-100">
              {absentPeople.map((p) => (
                <GlanceRow
                  key={p.userId || p.name}
                  to={TEAM_HR_ATTENDANCE_PATH}
                  title={p.name}
                  meta={p.remark || 'Marked absent on daily roll'}
                  tone="rose"
                />
              ))}
            </div>
          )}

          <SectionLabel icon={CalendarDays} label="On leave this week" count={leaveEntries.length} href={TEAM_HR_CALENDAR} />
          {leaveNamesRedacted ? (
            <p className="mx-3 mb-1 rounded-lg border border-amber-100 bg-amber-50/70 px-2 py-1.5 text-ui-xs text-amber-900">
              Peer names are redacted for Branch Manager on the leave calendar API — dates and types still show. Open
              Team HR calendar for the full view your role allows.
            </p>
          ) : null}
          {leaveEntries.length === 0 ? (
            <p className="px-3 pb-2 text-ui-xs text-slate-500">No approved leave overlapping this week.</p>
          ) : (
            <div className="border-t border-slate-100">
              {leaveEntries.slice(0, 6).map((e, i) => (
                <GlanceRow
                  key={e.requestId || `${e.userId}-${i}`}
                  to={TEAM_HR_CALENDAR}
                  title={e.displayName || 'On leave'}
                  meta={`${e.leaveType || 'Leave'} · ${e.startDateIso || '?'} → ${e.endDateIso || '?'}`}
                  tone="amber"
                />
              ))}
            </div>
          )}

          <SectionLabel
            icon={AlertTriangle}
            label="Incidents & transfers"
            count={openFlags.length}
            href={TEAM_HR_INCIDENTS}
          />
          {openFlags.length === 0 ? (
            <p className="px-3 pb-3 text-ui-xs text-slate-500">No open incident memos or pending transfers.</p>
          ) : (
            <div className="border-t border-slate-100">
              {openFlags.map((r) => (
                <GlanceRow key={r.key} to={r.to} title={r.title} meta={r.meta} tone={r.tone} />
              ))}
              {incidents.length + transfers.length > openFlags.length ? (
                <Link
                  to={TEAM_HR_TRANSFERS}
                  className="block px-3 py-2 text-ui-xs font-medium text-slate-700 no-underline hover:bg-slate-50"
                >
                  View all in Team HR →
                </Link>
              ) : null}
            </div>
          )}

          <div className="mx-3 mb-3 mt-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
            <p className="mb-1.5 text-ui-xs font-medium text-slate-500">
              Open WO assignments ({workload.reduce((s, w) => s + w.count, 0)})
            </p>
            {workload.length === 0 ? (
              <p className="text-ui-xs text-slate-500">No open maintenance work orders assigned.</p>
            ) : (
              <ul className="space-y-1">
                {workload.slice(0, 6).map((w) => (
                  <li key={w.userId || w.name} className="flex justify-between gap-2 text-ui-xs">
                    <span className="font-semibold text-slate-800 truncate">{w.name} <span className="font-normal text-slate-400">· {w.attendance || 'not marked'}</span></span>
                    <span className="z-stencil tabular-nums text-slate-800">{w.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </FinanceSequencePanel>
  );
}

function nameOrFallback(m) {
  return formatPersonName(m?.staffDisplayName || m?.displayName || '');
}
