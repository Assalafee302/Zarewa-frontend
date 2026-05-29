import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrDiscipline } from '../../lib/hrAccess';
import { apiFetch } from '../../lib/apiBase';
import { fetchHrDisciplinaryEvents, recordHrDisciplinaryEvent } from '../../lib/hrStaff';
import { HR_DISCIPLINARY_KINDS } from '../../lib/hrStaffConstants';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

const kindLabel = (k) => HR_DISCIPLINARY_KINDS.find((x) => x.value === k)?.label || k;

export default function HrDiscipline() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const canManage = canManageHrDiscipline(perms);

  const [staff, setStaff] = useState([]);
  const [events, setEvents] = useState([]);
  const [userId, setUserId] = useState('');
  const [kind, setKind] = useState('warning');
  const [dateIso, setDateIso] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState('');
  const [formErr, setFormErr] = useState('');
  const [formMsg, setFormMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (!ok || !data?.ok) {
      setStaff([]);
      return { hasData: false };
    }
    setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrDisciplinaryEvents();
    if (!ok || !data?.ok) {
      setEvents([]);
      return { error: data?.error || 'Could not load discipline register.', hasData: false };
    }
    setEvents(data.events || []);
    return { hasData: true };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!canManage || !userId) return;
    if (summary.trim().length < 3) {
      setFormErr('Summary must be at least 3 characters.');
      return;
    }
    setBusy(true);
    setFormErr('');
    setFormMsg('');
    const { ok, data } = await recordHrDisciplinaryEvent(userId, {
      kind,
      dateIso,
      summary: summary.trim(),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setFormErr(data?.error || 'Could not record event.');
      return;
    }
    setFormMsg('Disciplinary event recorded.');
    setSummary('');
    await reload();
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Record warnings and other disciplinary actions on the employee file. Events appear on the staff profile and
        audit trail.
      </p>

      {canManage ? (
        <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Record disciplinary action</h3>
          {formErr ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{formErr}</div>
          ) : null}
          {formMsg ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {formMsg}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Employee
              <select
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              >
                <option value="">Select staff…</option>
                {staff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.displayName || s.username}
                    {s.employeeNo ? ` · ${s.employeeNo}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Type
              <select
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {HR_DISCIPLINARY_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Date
              <input
                type="date"
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Summary
              <textarea
                className="mt-1 block w-full min-h-[80px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief factual summary of the incident and action taken"
                required
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[#134e4a] px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Record event'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-slate-600">You can view the register but need discipline permission to add events.</p>
      )}

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {loading && events.length === 0 ? <p className="text-sm text-slate-600">Loading…</p> : null}

      {events.length > 0 ? (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Date</AppTableTh>
              <AppTableTh>Employee</AppTableTh>
              <AppTableTh>Type</AppTableTh>
              <AppTableTh>Summary</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {events.map((ev) => (
                <AppTableTr key={ev.id}>
                  <AppTableTd>{ev.dateIso || '—'}</AppTableTd>
                  <AppTableTd>
                    <Link
                      to={`/hr/staff/${encodeURIComponent(ev.staffUserId)}`}
                      className="font-semibold text-[#134e4a] hover:underline"
                    >
                      {ev.staffDisplayName || ev.staffUserId}
                    </Link>
                  </AppTableTd>
                  <AppTableTd>{kindLabel(ev.kind)}</AppTableTd>
                  <AppTableTd title={ev.summary}>{ev.summary}</AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : !loading ? (
        <p className="text-sm text-slate-600">No disciplinary events on file.</p>
      ) : null}
    </div>
  );
}
