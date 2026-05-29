import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Branch daily roll call — present / late / absent with optional in/out times.
 */
export function HrDailyRollPanel() {
  const ws = useWorkspace();
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const defaultBranch =
    String(ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId || branches[0]?.id || '').trim();

  const [branchId, setBranchId] = useState(defaultBranch);
  const [dayIso, setDayIso] = useState(todayIso);
  const [staff, setStaff] = useState([]);
  const [rows, setRows] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (defaultBranch && !branchId) setBranchId(defaultBranch);
  }, [defaultBranch, branchId]);

  useEffect(() => {
    dirtyRef.current = false;
  }, [branchId, dayIso]);

  const { loading, error, setError, reload: loadAll } = useHrListLoad(async () => {
    if (!branchId) return { hasData: false };
    setMessage('');
    if (dirtyRef.current) return { hasData: true };
    const staffQ = await apiFetch('/api/hr/staff');
    const rollQ = await apiFetch(
      `/api/hr/attendance/daily-roll?branchId=${encodeURIComponent(branchId)}&dayIso=${encodeURIComponent(dayIso)}`
    );
    if (!staffQ.ok || !staffQ.data?.ok) {
      setStaff([]);
      return { error: staffQ.data?.error || 'Could not load branch staff.', hasData: false };
    }
    const branchStaff = (staffQ.data.staff || []).filter(
      (s) => String(s.branchId || s.normalized?.branchId) === branchId && String(s.status) === 'active'
    );
    setStaff(branchStaff);
    const map = {};
    if (rollQ.ok && rollQ.data?.ok && rollQ.data.roll?.rows) {
      for (const r of rollQ.data.roll.rows) {
        map[r.userId] = {
          status: r.status || 'present',
          inTime: r.inTime || '',
          outTime: r.outTime || '',
        };
      }
      setNotes(rollQ.data.roll.notes || '');
    } else {
      setNotes('');
    }
    for (const s of branchStaff) {
      if (!map[s.userId]) map[s.userId] = { status: 'present', inTime: '', outTime: '' };
    }
    setRows(map);
    return { hasData: true };
  }, [branchId, dayIso]);

  const updateRow = (userId, patch) => {
    dirtyRef.current = true;
    setRows((prev) => ({ ...prev, [userId]: { ...prev[userId], ...patch } }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    const payloadRows = staff.map((s) => {
      const r = rows[s.userId] || { status: 'present', inTime: '', outTime: '' };
      return {
        userId: s.userId,
        status: r.status,
        inTime: r.inTime || undefined,
        outTime: r.outTime || undefined,
      };
    });
    const { ok, data } = await apiFetch('/api/hr/attendance/daily-roll', {
      method: 'PUT',
      body: JSON.stringify({ branchId, dayIso, rows: payloadRows, notes: notes.trim() || undefined }),
    });
    setSaving(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save daily roll.');
      return;
    }
    setMessage('Daily roll saved.');
    dirtyRef.current = false;
    await loadAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs font-semibold text-slate-600">
          Branch
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Date
          <input
            type="date"
            value={dayIso}
            onChange={(e) => setDayIso(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading || !staff.length}
          className="rounded-xl bg-[#134e4a] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save roll'}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      {loading && staff.length === 0 ? <p className="text-sm text-slate-600">Loading…</p> : null}

      {(!loading || staff.length > 0) && staff.length > 0 ? (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>Status</AppTableTh>
              <AppTableTh>In time</AppTableTh>
              <AppTableTh>Out time</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {staff.map((s) => {
                const r = rows[s.userId] || { status: 'present', inTime: '', outTime: '' };
                return (
                  <AppTableTr key={s.userId}>
                    <AppTableTd>{s.displayName || s.username}</AppTableTd>
                    <AppTableTd>
                      <select
                        value={r.status}
                        onChange={(e) => updateRow(s.userId, { status: e.target.value })}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                      </select>
                    </AppTableTd>
                    <AppTableTd>
                      <input
                        type="time"
                        value={r.inTime}
                        onChange={(e) => updateRow(s.userId, { inTime: e.target.value })}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                    </AppTableTd>
                    <AppTableTd>
                      <input
                        type="time"
                        value={r.outTime}
                        onChange={(e) => updateRow(s.userId, { outTime: e.target.value })}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                    </AppTableTd>
                  </AppTableTr>
                );
              })}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : null}

      {!loading && !staff.length ? (
        <p className="text-sm text-slate-600">No active staff for this branch.</p>
      ) : null}

      <label className="block text-xs font-semibold text-slate-600">
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Optional branch notes for this day"
        />
      </label>
    </div>
  );
}
