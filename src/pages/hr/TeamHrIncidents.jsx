import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { createHrIncidentMemo, escalateHrIncident, fetchHrIncidentMemos } from '../../lib/hrExtended';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function TeamHrIncidents() {
  const [modalOpen, setModalOpen] = useState(false);
  const [staff, setStaff] = useState([]);
  const [memos, setMemos] = useState([]);
  const [userId, setUserId] = useState('');
  const [incidentDateIso, setIncidentDateIso] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState('');
  const [formErr, setFormErr] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return memos.filter((m) => {
      if (statusFilter && m.status !== statusFilter) return false;
      if (!q) return true;
      return [m.staffDisplayName, m.summary, m.status].join(' ').toLowerCase().includes(q);
    });
  }, [memos, search, statusFilter]);

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = filtered.map((m) =>
      [m.incidentDateIso, m.staffDisplayName, m.summary, m.status].map(esc).join(',')
    );
    const blob = new Blob([['Date,Staff,Summary,Status', ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-memos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormErr('');
    const { ok, data } = await createHrIncidentMemo({ userId, incidentDateIso, summary: summary.trim() });
    if (!ok || !data?.ok) {
      setFormErr(data?.error || 'Could not save memo.');
      return;
    }
    setMessage('Incident memo recorded.');
    setSummary('');
    setUserId('');
    setModalOpen(false);
    await reload();
  };

  const escalate = async (memoId) => {
    const { ok, data } = await escalateHrIncident(memoId, { kind: 'incident' });
    if (ok && data?.ok) {
      const caseRef = data.caseId || data.disciplineCaseId;
      setMessage(
        caseRef
          ? `Escalated to discipline case ${caseRef}.`
          : 'Escalated to discipline register.'
      );
      await reload();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-slate-600 max-w-2xl">
          Raise factual incident memos for your branch. HR can escalate memos into the formal discipline register.
        </p>
        <HrAddFormButton onClick={() => setModalOpen(true)}>New incident memo</HrAddFormButton>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff or summary…"
          className={`${HR_FIELD_CLASS} min-w-[200px] flex-1`}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={HR_FIELD_CLASS}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="escalated">Escalated</option>
          <option value="closed">Closed</option>
        </select>
        <button type="button" className={HR_BTN_SECONDARY} onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record incident memo" size="md">
        <form onSubmit={submit} className="space-y-3">
          {formErr ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{formErr}</div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Staff member
              <select className={HR_FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)} required>
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
              <input type="date" className={HR_FIELD_CLASS} value={incidentDateIso} onChange={(e) => setIncidentDateIso(e.target.value)} />
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-600 block">
            Summary
            <textarea className={HR_FIELD_CLASS} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} required />
          </label>
          <button type="submit" className={HR_BTN_PRIMARY}>
            Save memo
          </button>
        </form>
      </HrFormModal>

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
              <AppTableTh>Case</AppTableTh>
              <AppTableTh />
            </AppTableTr>
          </AppTableThead>
          <AppTableBody>
            {filtered.map((m) => (
              <AppTableTr key={m.id}>
                <AppTableTd>{m.incidentDateIso}</AppTableTd>
                <AppTableTd>{m.staffDisplayName}</AppTableTd>
                <AppTableTd className="max-w-xs truncate">{m.summary}</AppTableTd>
                <AppTableTd>{m.status}</AppTableTd>
                <AppTableTd>
                  {m.disciplineCaseId ? (
                    <Link
                      to={`/hr/discipline-exit?tab=accountability&caseId=${encodeURIComponent(m.disciplineCaseId)}`}
                      className="text-xs font-bold text-[#134e4a] hover:underline"
                    >
                      {m.disciplineCaseId}
                    </Link>
                  ) : (
                    '—'
                  )}
                </AppTableTd>
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
      {!loading && !filtered.length ? <p className="text-sm text-slate-500">No incident memos match filters.</p> : null}
    </div>
  );
}
