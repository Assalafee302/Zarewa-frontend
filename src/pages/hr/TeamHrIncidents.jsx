import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrDiscipline } from '../../lib/hrAccess';
import { createHrIncidentMemo, fetchHrIncidentMemos } from '../../lib/hrExtended';
import HrIncidentMemoEscalateModal from '../../components/hr/HrIncidentMemoEscalateModal';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { ProfileFormField } from '../../components/profile/profileFormUi';
import {
  ProfileEmptyState,
  ProfileInlineAlert,
  ProfileMetricSkeleton,
  ProfileOverviewSection,
} from '../../components/profile/profileOverviewUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

function memoStatusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'escalated') return 'bg-teal-100 text-teal-900';
  if (s === 'closed') return 'bg-emerald-100 text-emerald-800';
  return 'bg-amber-100 text-amber-900';
}

export default function TeamHrIncidents({ focusMemoId, onFocusHandled }) {
  const ws = useWorkspace();
  const canEscalate = canManageHrDiscipline(ws?.permissions || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [escalateMemo, setEscalateMemo] = useState(null);
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
      return [m.staffDisplayName, m.summary, m.status, m.registryId, m.disciplineCaseId].join(' ').toLowerCase().includes(q);
    });
  }, [memos, search, statusFilter]);

  useEffect(() => {
    const id = String(focusMemoId || '').trim();
    if (!id || loading) return;
    const memo = memos.find((m) => m.id === id);
    if (!memo) return;
    if (memo.status === 'open' && canEscalate) {
      setEscalateMemo(memo);
    }
    onFocusHandled?.(memo);
  }, [focusMemoId, memos, loading, canEscalate, onFocusHandled]);

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = filtered.map((m) =>
      [m.incidentDateIso, m.staffDisplayName, m.summary, m.status, m.disciplineCaseId, m.registryId].map(esc).join(',')
    );
    const blob = new Blob([['Date,Staff,Summary,Status,Case,Registry', ...lines].join('\n')], { type: 'text/csv' });
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
    setMessage('Incident memo recorded. HR will review for escalation into the accountability workflow.');
    setSummary('');
    setUserId('');
    setModalOpen(false);
    await reload();
  };

  const onEscalated = (data) => {
    const parts = [];
    if (data.caseNumber || data.caseId) parts.push(`case ${data.caseNumber || data.caseId}`);
    if (data.registryId) parts.push(`registry ${data.registryId}`);
    setMessage(
      data.alreadyEscalated
        ? 'Memo was already escalated.'
        : `Escalated to accountability${parts.length ? `: ${parts.join(', ')}` : ''}.`
    );
    reload();
  };

  return (
    <HrPageBody>
      <HrPageIntro
        title="Incident memos"
        description="Raise factual incident memos for your branch. HR reviews and escalates into formal accountability cases — you do not need to visit the main HR workspace."
        actions={<HrAddFormButton onClick={() => setModalOpen(true)}>New incident memo</HrAddFormButton>}
      />

      {!canEscalate ? (
        <ProfileInlineAlert variant="info">
          Escalation to discipline cases is handled by HR (Discipline & Exit → Accountability).
        </ProfileInlineAlert>
      ) : null}

      {message ? <ProfileInlineAlert variant="success">{message}</ProfileInlineAlert> : null}
      {error ? <ProfileInlineAlert variant="error">{error}</ProfileInlineAlert> : null}

      <ProfileOverviewSection title="Filters" subtitle="Search and export incident memos">
      <div className="flex flex-wrap gap-2">
        <ProfileFormField label="Search" htmlFor="incident-search" className="min-w-[200px] flex-1">
          <input
            id="incident-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff or summary…"
            className={HR_FIELD_CLASS}
          />
        </ProfileFormField>
        <ProfileFormField label="Status" htmlFor="incident-status">
          <select id="incident-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={HR_FIELD_CLASS}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
        </ProfileFormField>
        <div className="flex items-end">
          <button type="button" className={HR_BTN_SECONDARY} onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>
      </ProfileOverviewSection>

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record incident memo" size="md">
        <form onSubmit={submit} className="space-y-3">
          {formErr ? <ProfileInlineAlert variant="error">{formErr}</ProfileInlineAlert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileFormField label="Staff member" htmlFor="incident-staff">
              <select id="incident-staff" className={HR_FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Select…</option>
                {staff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            </ProfileFormField>
            <ProfileFormField label="Incident date" htmlFor="incident-date">
              <input id="incident-date" type="date" className={HR_FIELD_CLASS} value={incidentDateIso} onChange={(e) => setIncidentDateIso(e.target.value)} />
            </ProfileFormField>
          </div>
          <ProfileFormField label="Summary" htmlFor="incident-summary">
            <textarea id="incident-summary" className={HR_FIELD_CLASS} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} required minLength={3} />
          </ProfileFormField>
          <button type="submit" className={HR_BTN_PRIMARY}>
            Save memo
          </button>
        </form>
      </HrFormModal>

      <HrIncidentMemoEscalateModal
        memo={escalateMemo}
        open={Boolean(escalateMemo)}
        onClose={() => setEscalateMemo(null)}
        onEscalated={onEscalated}
      />

      <ProfileOverviewSection title="Incident memos" subtitle={`${filtered.length} shown`}>
      {loading && !filtered.length ? <ProfileMetricSkeleton count={1} /> : null}
      {!loading && !filtered.length ? (
        <ProfileEmptyState title="No incident memos" description="No incident memos match your filters." />
      ) : (
      <AppTableWrap>
        <AppTable>
          <AppTableThead>
            <AppTableTh>Date</AppTableTh>
              <AppTableTh>Staff</AppTableTh>
              <AppTableTh>Summary</AppTableTh>
              <AppTableTh>Status</AppTableTh>
              <AppTableTh>Case</AppTableTh>
              <AppTableTh>Registry</AppTableTh>
              <AppTableTh />
          </AppTableThead>
          <AppTableBody>
            {filtered.map((m) => (
              <AppTableTr
                key={m.id}
                className={focusMemoId === m.id ? 'bg-amber-50/80 ring-1 ring-inset ring-amber-200' : undefined}
              >
                <AppTableTd>{m.incidentDateIso}</AppTableTd>
                <AppTableTd>{m.staffDisplayName}</AppTableTd>
                <AppTableTd className="max-w-xs truncate" title={m.summary}>{m.summary}</AppTableTd>
                <AppTableTd>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${memoStatusTone(m.status)}`}>
                    {m.status}
                  </span>
                </AppTableTd>
                <AppTableTd>
                  {m.disciplineCaseId ? (
                    <Link
                      to={`/hr/discipline-exit?tab=accountability&caseId=${encodeURIComponent(m.disciplineCaseId)}`}
                      className="text-xs font-bold text-teal-800 hover:underline"
                    >
                      {m.disciplineCaseId}
                    </Link>
                  ) : (
                    '—'
                  )}
                </AppTableTd>
                <AppTableTd className="font-mono text-xs">{m.registryId || '—'}</AppTableTd>
                <AppTableTd>
                  {m.status === 'open' && canEscalate ? (
                    <button type="button" className="text-xs font-bold text-teal-800 hover:underline" onClick={() => setEscalateMemo(m)}>
                      Escalate…
                    </button>
                  ) : null}
                </AppTableTd>
              </AppTableTr>
            ))}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      )}
      </ProfileOverviewSection>
    </HrPageBody>
  );
}
