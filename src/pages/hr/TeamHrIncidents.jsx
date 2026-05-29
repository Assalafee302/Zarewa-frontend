import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { createHrIncidentMemo, escalateHrIncident, fetchHrIncidentMemos } from '../../lib/hrExtended';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

const fieldCls =
  'mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/15';

export default function TeamHrIncidents() {
  const [staff, setStaff] = useState([]);
  const [memos, setMemos] = useState([]);
  const [userId, setUserId] = useState('');
  const [incidentDateIso, setIncidentDateIso] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (ok && data?.ok) setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrIncidentMemos();
    if (!ok || !data?.ok) {
      setMemos([]);
      return { error: data?.error || 'Could not load incidents.', hasData: false };
    }
    setMemos(data.memos || []);
    return { hasData: true };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const { ok, data } = await createHrIncidentMemo({ userId, incidentDateIso, summary: summary.trim() });
    if (!ok || !data?.ok) {
      setMessage(data?.error || 'Could not save memo.');
      return;
    }
    setMessage('Incident memo recorded.');
    setSummary('');
    await reload();
  };

  const escalate = async (memoId) => {
    const { ok, data } = await escalateHrIncident(memoId, { kind: 'incident' });
    if (ok && data?.ok) {
      setMessage('Escalated to discipline register.');
      await reload();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Raise factual incident memos for your branch. HR can escalate memos into the formal discipline register.
      </p>
      <form onSubmit={submit} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Staff member
            <select className={fieldCls} value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">Select…</option>
              {staff.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Incident date
            <input type="date" className={fieldCls} value={incidentDateIso} onChange={(e) => setIncidentDateIso(e.target.value)} />
          </label>
        </div>
        <label className="text-xs font-semibold text-slate-600 block">
          Summary
          <textarea className={fieldCls} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} required />
        </label>
        <button type="submit" className="rounded-xl bg-[#134e4a] px-4 py-2 text-sm font-bold text-white">
          Save memo
        </button>
      </form>
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <AppTableWrap>
        <AppTable>
          <AppTableThead>
            <AppTableTr>
              <AppTableTh>Date</AppTableTh>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>Summary</AppTableTh>
              <AppTableTh>Status</AppTableTh>
              <AppTableTh />
            </AppTableTr>
          </AppTableThead>
          <AppTableBody>
            {memos.map((m) => (
              <AppTableTr key={m.id}>
                <AppTableTd>{m.incidentDateIso}</AppTableTd>
                <AppTableTd>{m.staffDisplayName}</AppTableTd>
                <AppTableTd className="max-w-xs truncate">{m.summary}</AppTableTd>
                <AppTableTd>{m.status}</AppTableTd>
                <AppTableTd>
                  {m.status === 'open' ? (
                    <button type="button" className="text-xs font-bold text-[#134e4a]" onClick={() => escalate(m.id)}>
                      Escalate to HR
                    </button>
                  ) : null}
                </AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
    </div>
  );
}
