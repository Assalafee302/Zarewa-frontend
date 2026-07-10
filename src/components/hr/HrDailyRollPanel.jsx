import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const DEFAULT_ROW = { status: 'present', minutesLate: '', remark: '' };

function StatusCheckbox({ checked, label, tone, onChange }) {
  const toneClass =
    tone === 'present'
      ? 'accent-emerald-600'
      : tone === 'late'
        ? 'accent-amber-600'
        : 'accent-rose-600';
  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={`h-4 w-4 rounded border-slate-300 ${toneClass}`}
      />
      {label}
    </label>
  );
}

/**
 * Branch daily roll call — present / late / absent with optional remark and minutes late.
 * @param {{ branchManagerMode?: boolean }} props
 */
export function HrDailyRollPanel({ branchManagerMode = false } = {}) {
  const ws = useWorkspace();
  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  const sessionBranch = String(
    ws?.session?.workspaceBranchId || ws?.snapshot?.workspaceBranchId || branches[0]?.id || ''
  ).trim();

  const [branchId, setBranchId] = useState(sessionBranch);
  const [dayIso, setDayIso] = useState(todayIso);
  const [staff, setStaff] = useState([]);
  const [rows, setRows] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const dirtyRef = useRef(false);

  const effectiveBranchId = branchManagerMode ? sessionBranch : branchId;

  useEffect(() => {
    if (branchManagerMode && sessionBranch) setBranchId(sessionBranch);
    else if (!branchId && sessionBranch) setBranchId(sessionBranch);
  }, [branchManagerMode, sessionBranch, branchId]);

  useEffect(() => {
    dirtyRef.current = false;
  }, [effectiveBranchId, dayIso]);

  const { loading, error, setError, reload: loadAll } = useHrListLoad(async () => {
    if (!effectiveBranchId) return { hasData: false };
    setMessage('');
    if (dirtyRef.current) return { hasData: true };
    const staffQ = await apiFetch('/api/hr/staff?attendanceEligible=1');
    const rollQ = await apiFetch(
      `/api/hr/attendance/daily-roll?branchId=${encodeURIComponent(effectiveBranchId)}&dayIso=${encodeURIComponent(dayIso)}`
    );
    if (!staffQ.ok || !staffQ.data?.ok) {
      setStaff([]);
      return { error: staffQ.data?.error || 'Could not load branch staff.', hasData: false };
    }
    const branchStaff = (staffQ.data.staff || []).filter(
      (s) =>
        String(s.branchId || s.normalized?.branchId) === effectiveBranchId &&
        String(s.status) === 'active' &&
        String(s.payrollGroup || 'branch_ops') === 'branch_ops'
    );
    setStaff(branchStaff);
    const map = {};
    if (rollQ.ok && rollQ.data?.ok && rollQ.data.roll?.rows) {
      for (const r of rollQ.data.roll.rows) {
        map[r.userId] = {
          status: r.status || 'present',
          minutesLate: r.minutesLate != null && r.minutesLate > 0 ? String(r.minutesLate) : '',
          remark: r.remark || '',
        };
      }
      setNotes(rollQ.data.roll.notes || '');
    } else {
      setNotes('');
    }
    for (const s of branchStaff) {
      if (!map[s.userId]) map[s.userId] = { ...DEFAULT_ROW };
    }
    setRows(map);
    return { hasData: true };
  }, [effectiveBranchId, dayIso]);

  const setStatus = (userId, status) => {
    dirtyRef.current = true;
    setRows((prev) => {
      const cur = prev[userId] || { ...DEFAULT_ROW };
      const next = { ...cur, status };
      if (status !== 'late') next.minutesLate = '';
      return { ...prev, [userId]: next };
    });
  };

  const updateRow = (userId, patch) => {
    dirtyRef.current = true;
    setRows((prev) => ({ ...prev, [userId]: { ...(prev[userId] || DEFAULT_ROW), ...patch } }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    const payloadRows = staff.map((s) => {
      const r = rows[s.userId] || DEFAULT_ROW;
      const minutesLate = r.status === 'late' ? Math.max(0, Math.round(Number(r.minutesLate) || 0)) : 0;
      return {
        userId: s.userId,
        status: r.status,
        ...(minutesLate > 0 ? { minutesLate } : {}),
        ...(String(r.remark || '').trim() ? { remark: String(r.remark).trim() } : {}),
      };
    });
    const { ok, data } = await apiFetch('/api/hr/attendance/daily-roll', {
      method: 'PUT',
      body: JSON.stringify({
        branchId: effectiveBranchId,
        dayIso,
        rows: payloadRows,
        notes: notes.trim() || undefined,
      }),
    });
    setSaving(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save daily roll.');
      return;
    }
    setMessage('Daily attendance saved.');
    dirtyRef.current = false;
    await loadAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        {!branchManagerMode ? (
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
        ) : (
          <div className="text-xs font-semibold text-slate-600">
            Branch
            <p className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {branches.find((b) => b.id === effectiveBranchId)?.name || effectiveBranchId || '—'}
            </p>
          </div>
        )}
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
          disabled={saving || loading || !staff.length || !effectiveBranchId}
          className="rounded-xl bg-zarewa-teal px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save attendance'}
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
              <AppTableTh>Present</AppTableTh>
              <AppTableTh>Late</AppTableTh>
              <AppTableTh>Absent</AppTableTh>
              <AppTableTh>Minutes late</AppTableTh>
              <AppTableTh>Remark</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {staff.map((s) => {
                const r = rows[s.userId] || DEFAULT_ROW;
                return (
                  <AppTableTr key={s.userId}>
                    <AppTableTd>{s.displayName || s.username}</AppTableTd>
                    <AppTableTd>
                      <StatusCheckbox
                        checked={r.status === 'present'}
                        label="Present"
                        tone="present"
                        onChange={(e) => {
                          if (e.target.checked) setStatus(s.userId, 'present');
                        }}
                      />
                    </AppTableTd>
                    <AppTableTd>
                      <StatusCheckbox
                        checked={r.status === 'late'}
                        label="Late"
                        tone="late"
                        onChange={(e) => {
                          if (e.target.checked) setStatus(s.userId, 'late');
                        }}
                      />
                    </AppTableTd>
                    <AppTableTd>
                      <StatusCheckbox
                        checked={r.status === 'absent'}
                        label="Absent"
                        tone="absent"
                        onChange={(e) => {
                          if (e.target.checked) setStatus(s.userId, 'absent');
                        }}
                      />
                    </AppTableTd>
                    <AppTableTd>
                      <input
                        type="number"
                        min={0}
                        max={480}
                        disabled={r.status !== 'late'}
                        value={r.minutesLate}
                        onChange={(e) => updateRow(s.userId, { minutesLate: e.target.value })}
                        placeholder={r.status === 'late' ? 'e.g. 15' : '—'}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </AppTableTd>
                    <AppTableTd>
                      <input
                        type="text"
                        value={r.remark}
                        onChange={(e) => updateRow(s.userId, { remark: e.target.value })}
                        placeholder="Optional note"
                        className="w-full min-w-[8rem] rounded-lg border border-slate-200 px-2 py-1 text-xs"
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
        Day notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Optional notes for this day (branch-wide)"
        />
      </label>
    </div>
  );
}
