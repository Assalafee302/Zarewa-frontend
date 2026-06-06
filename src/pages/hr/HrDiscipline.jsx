import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrDiscipline } from '../../lib/hrAccess';
import { apiFetch } from '../../lib/apiBase';
import { fetchHrDisciplinaryEvents, recordHrDisciplinaryEvent } from '../../lib/hrStaff';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HR_DISCIPLINARY_KINDS } from '../../lib/hrStaffConstants';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { navigateToHrLetter } from '../../lib/hrLetterDeepLink';
import { canGenerateHrLetters } from '../../lib/hrAccess';
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

/** Count query-type events per staffUserId from the events list */
function buildQueryCounts(events) {
  const counts = {};
  for (const ev of events) {
    if (ev.kind === 'query') {
      counts[ev.staffUserId] = (counts[ev.staffUserId] || 0) + 1;
    }
  }
  return counts;
}

export default function HrDiscipline({ embedded = false } = {}) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const perms = ws?.permissions || [];
  const canManage = canManageHrDiscipline(perms);
  const canLetter = canGenerateHrLetters(perms);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState(null);

  const [staff, setStaff] = useState([]);
  const [events, setEvents] = useState([]);
  const [userId, setUserId] = useState('');
  const [kind, setKind] = useState('warning');
  const [severity, setSeverity] = useState('medium');
  const [dateIso, setDateIso] = useState(new Date().toISOString().slice(0, 10));
  const [reportedBy, setReportedBy] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [summary, setSummary] = useState('');
  const [hrRecommendation, setHrRecommendation] = useState('');
  const [sanction, setSanction] = useState('');
  const [formErr, setFormErr] = useState('');
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

  const resetForm = () => {
    setUserId('');
    setKind('warning');
    setSeverity('medium');
    setDateIso(new Date().toISOString().slice(0, 10));
    setReportedBy('');
    setWitnesses('');
    setSummary('');
    setHrRecommendation('');
    setSanction('');
    setFormErr('');
  };

  const letterKindForDiscipline = (k) => {
    if (k === 'query') return 'query';
    if (k === 'suspension') return 'suspension';
    if (k === 'termination') return 'termination';
    return 'warning';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canManage || !userId) return;
    if (summary.trim().length < 10) {
      setFormErr('Description must be at least 10 characters.');
      return;
    }
    setBusy(true);
    setFormErr('');
    const fullSummary = [
      summary.trim(),
      witnesses.trim() ? `Witnesses: ${witnesses.trim()}` : '',
      hrRecommendation.trim() ? `HR recommendation: ${hrRecommendation.trim()}` : '',
      sanction.trim() ? `Sanction: ${sanction.trim()}` : '',
    ].filter(Boolean).join('\n');
    const { ok, data } = await recordHrDisciplinaryEvent(userId, {
      kind,
      dateIso,
      summary: fullSummary,
      severity,
      reportedBy: reportedBy.trim() || ws?.session?.user?.displayName || null,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setFormErr(data?.error || 'Could not record event.');
      return;
    }
    resetForm();
    setModalOpen(false);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {!embedded ? (
          <p className="text-sm text-slate-600 max-w-2xl">
            Record warnings and other disciplinary actions on the employee file. Events appear on the staff profile and
            audit trail.
          </p>
        ) : null}
        {canManage ? <HrAddFormButton onClick={() => setModalOpen(true)}>Record disciplinary action</HrAddFormButton> : null}
      </div>

      <HrFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Record disciplinary action"
        description="Document incidents, queries, and sanctions on the employee file. Generate a letter after saving if required."
      >
        <form onSubmit={submit} className="space-y-4">
          {formErr ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{formErr}</div>
          ) : null}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="font-bold text-slate-700">Incident details</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Employee *
              <select className={HR_FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)} required>
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
              Type *
              <select className={HR_FIELD_CLASS} value={kind} onChange={(e) => setKind(e.target.value)}>
                {HR_DISCIPLINARY_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Severity
              <select className={HR_FIELD_CLASS} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Incident date *
              <input type="date" className={HR_FIELD_CLASS} value={dateIso} onChange={(e) => setDateIso(e.target.value)} required />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Reported by
              <input className={HR_FIELD_CLASS} value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} placeholder="Supervisor or HR officer" />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Description / incident summary *
              <textarea className={`${HR_FIELD_CLASS} min-h-[80px]`} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Factual account of the incident" required minLength={10} />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Witnesses (optional)
              <input className={HR_FIELD_CLASS} value={witnesses} onChange={(e) => setWitnesses(e.target.value)} placeholder="Names separated by commas" />
            </label>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="font-bold text-slate-700">HR action</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              HR recommendation
              <textarea className={`${HR_FIELD_CLASS} min-h-[64px]`} value={hrRecommendation} onChange={(e) => setHrRecommendation(e.target.value)} placeholder="Recommended next steps" />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Sanction / outcome
              <input className={HR_FIELD_CLASS} value={sanction} onChange={(e) => setSanction(e.target.value)} placeholder="e.g. Written warning issued" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>{busy ? 'Saving…' : 'Record event'}</button>
            <button type="button" className={HR_BTN_SECONDARY} onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</button>
          </div>
        </form>
      </HrFormModal>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {loading && events.length === 0 ? <p className="text-sm text-slate-600">Loading…</p> : null}

      {/* Policy alert banners for staff with high query counts */}
      {(() => {
        const queryCounts = buildQueryCounts(events);
        const flagged3Plus = Object.entries(queryCounts).filter(([, c]) => c >= 3);
        const flagged2 = Object.entries(queryCounts).filter(([, c]) => c === 2);
        return (
          <>
            {flagged3Plus.map(([uid, count]) => {
              const person = staff.find((s) => s.userId === uid);
              return (
                <div key={uid} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex items-start gap-2">
                  <span className="shrink-0">🚨</span>
                  <span>
                    <strong>{person?.displayName || uid}</strong> has received {count} queries — termination is recommended per company policy.
                  </span>
                </div>
              );
            })}
            {flagged2.map(([uid]) => {
              const person = staff.find((s) => s.userId === uid);
              return (
                <div key={uid} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                  <span className="shrink-0">⚠️</span>
                  <span>
                    <strong>{person?.displayName || uid}</strong> has received 2 queries — next promotion is blocked per company policy.
                  </span>
                </div>
              );
            })}
          </>
        );
      })()}

      {events.length > 0 ? (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTr>
                <AppTableTh>Date</AppTableTh>
                <AppTableTh>Employee</AppTableTh>
                <AppTableTh>Type</AppTableTh>
                <AppTableTh>Query count</AppTableTh>
                <AppTableTh>Summary</AppTableTh>
                <AppTableTh />
              </AppTableTr>
            </AppTableThead>
            <AppTableBody>
              {events.map((ev) => {
                const queryCount = buildQueryCounts(events)[ev.staffUserId] || 0;
                return (
                  <AppTableTr key={ev.id}>
                    <AppTableTd>{ev.dateIso || '—'}</AppTableTd>
                    <AppTableTd>
                      <Link
                        to={`${HR_EMPLOYEES}/${encodeURIComponent(ev.staffUserId)}`}
                        className="font-semibold text-[#134e4a] hover:underline"
                      >
                        {ev.staffDisplayName || ev.staffUserId}
                      </Link>
                      {queryCount >= 3 ? (
                        <span className="ml-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">{queryCount} queries</span>
                      ) : queryCount === 2 ? (
                        <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">{queryCount} queries · promo blocked</span>
                      ) : null}
                    </AppTableTd>
                    <AppTableTd>{kindLabel(ev.kind)}</AppTableTd>
                    <AppTableTd>
                      {ev.kind === 'query' ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${queryCount >= 3 ? 'bg-red-100 text-red-800' : queryCount === 2 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          {queryCount}
                        </span>
                      ) : '—'}
                    </AppTableTd>
                    <AppTableTd title={ev.summary}>{String(ev.summary || '').slice(0, 80)}{String(ev.summary || '').length > 80 ? '…' : ''}</AppTableTd>
                    <AppTableTd>
                      <div className="flex flex-wrap gap-1">
                        <button type="button" className="text-[10px] font-bold uppercase text-slate-600" onClick={() => setDetailEvent(ev)}>View</button>
                        {canLetter ? (
                          <button
                            type="button"
                            className="text-[10px] font-bold uppercase text-[#134e4a]"
                            onClick={() => navigateToHrLetter(navigate, { letterKind: letterKindForDiscipline(ev.kind), userId: ev.staffUserId, sourceRecordId: ev.id, sourceRecordKind: 'discipline' })}
                          >
                            Letter
                          </button>
                        ) : null}
                      </div>
                    </AppTableTd>
                  </AppTableTr>
                );
              })}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : !loading ? (
        <p className="text-sm text-slate-600">No disciplinary events on file.</p>
      ) : null}

      <HrFormModal isOpen={Boolean(detailEvent)} onClose={() => setDetailEvent(null)} title="Disciplinary event" size="lg">
        {detailEvent ? (
          <div className="space-y-3 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div><dt className="text-[10px] font-bold uppercase text-slate-400">Employee</dt><dd className="font-semibold">{detailEvent.staffDisplayName}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-400">Type</dt><dd>{kindLabel(detailEvent.kind)}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-400">Date</dt><dd>{detailEvent.dateIso}</dd></div>
            </dl>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Details</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-slate-800">{detailEvent.summary}</p>
            </div>
            {(buildQueryCounts(events)[detailEvent.staffUserId] || 0) >= 2 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Promotion impact: this employee has {buildQueryCounts(events)[detailEvent.staffUserId]} queries on file.
              </div>
            ) : null}
          </div>
        ) : null}
      </HrFormModal>
    </div>
  );
}
