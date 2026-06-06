import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { HrCard, HrPageIntro } from '../../components/hr/hrPageUi';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

/* ─── helpers ─────────────────────────────────────────────── */

function scoreBadge(score) {
  if (score == null) return <span className="text-slate-400 text-xs">—</span>;
  const n = Number(score);
  let label, cls;
  if (n >= 4.5) { label = 'Exceptional'; cls = 'bg-emerald-50 text-emerald-800 border-emerald-200'; }
  else if (n >= 3.5) { label = 'Good'; cls = 'bg-teal-50 text-teal-800 border-teal-200'; }
  else if (n >= 2.5) { label = 'Satisfactory'; cls = 'bg-sky-50 text-sky-800 border-sky-200'; }
  else if (n >= 1.5) { label = 'Needs Improvement'; cls = 'bg-amber-50 text-amber-900 border-amber-200'; }
  else { label = 'Unsatisfactory'; cls = 'bg-red-50 text-red-800 border-red-200'; }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {n.toFixed(1)} · {label}
    </span>
  );
}

function typePill(type) {
  const map = {
    positive: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    constructive: 'bg-amber-50 text-amber-900 border-amber-200',
    concern: 'bg-red-50 text-red-800 border-red-200',
  };
  const cls = map[type] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {type || 'note'}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums">{value}</p>
    </div>
  );
}

/* ─── score entry modal ────────────────────────────────────── */

const CRITERIA = [
  { key: 'goals', label: 'Goals Achievement' },
  { key: 'workQuality', label: 'Work Quality' },
  { key: 'teamwork', label: 'Teamwork' },
  { key: 'conduct', label: 'Conduct' },
];

function ScoreModal({ form, onClose, onSaved }) {
  const [scores, setScores] = useState({
    goals: form?.scores?.goals ?? '',
    workQuality: form?.scores?.workQuality ?? '',
    teamwork: form?.scores?.teamwork ?? '',
    conduct: form?.scores?.conduct ?? '',
  });
  const [comments, setComments] = useState(form?.comments || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const avg = (() => {
    const vals = CRITERIA.map(c => parseFloat(scores[c.key])).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
  })();

  const save = async () => {
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch('/api/hr/appraisal-forms', {
      method: 'POST',
      body: JSON.stringify({
        formId: form?.id,
        cycleId: form?.cycleId,
        userId: form?.userId,
        scores: { ...scores, overall: avg },
        comments,
        status: 'submitted',
      }),
    });
    setBusy(false);
    if (!ok || !data?.ok) { setError(data?.error || 'Save failed.'); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Appraisal Score — {form?.staffName || form?.userId}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none">&times;</button>
        </div>
        <div className="space-y-3 p-5">
          {CRITERIA.map(c => (
            <label key={c.key} className="flex items-center justify-between gap-3 text-sm text-slate-700">
              <span className="font-semibold w-44">{c.label}</span>
              <input
                type="number" min="0" max="5" step="0.1"
                value={scores[c.key]}
                onChange={e => setScores(s => ({ ...s, [c.key]: e.target.value }))}
                className="w-24 rounded-xl border border-slate-200 px-3 py-1.5 text-sm tabular-nums"
              />
            </label>
          ))}
          {avg != null && (
            <p className="text-xs text-slate-500">Overall rating (auto): <strong>{avg}</strong> — {scoreBadge(avg)}</p>
          )}
          <label className="block text-xs font-semibold text-slate-600">
            Comments
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase">Cancel</button>
          <button type="button" disabled={busy} onClick={save} className="rounded-xl bg-[#134e4a] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-50">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── new cycle modal ──────────────────────────────────────── */

function NewCycleModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch('/api/hr/appraisal-cycles', {
      method: 'POST',
      body: JSON.stringify({ name, startDate, endDate, description }),
    });
    setBusy(false);
    if (!ok || !data?.ok) { setError(data?.error || 'Could not create cycle.'); return; }
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">New Appraisal Cycle</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none">&times;</button>
        </div>
        <div className="space-y-3 p-5">
          <label className="block text-xs font-semibold text-slate-600">
            Cycle Name (e.g. Q1 2026)
            <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Start Date
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            End Date
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Description
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase">Cancel</button>
          <button type="button" disabled={busy} onClick={save} className="rounded-xl bg-[#134e4a] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-50">
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── add feedback modal ───────────────────────────────────── */

function AddFeedbackModal({ userId, onClose, onSaved }) {
  const [note, setNote] = useState('');
  const [type, setType] = useState('positive');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    const { ok, data } = await apiFetch('/api/hr/feedback', {
      method: 'POST',
      body: JSON.stringify({ userId, note, type }),
    });
    setBusy(false);
    if (!ok || !data?.ok) { setError(data?.error || 'Save failed.'); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Add Feedback Note</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none">&times;</button>
        </div>
        <div className="space-y-3 p-5">
          <label className="block text-xs font-semibold text-slate-600">
            Type
            <select value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="positive">Positive</option>
              <option value="constructive">Constructive</option>
              <option value="concern">Concern</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Note
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase">Cancel</button>
          <button type="button" disabled={busy} onClick={save} className="rounded-xl bg-[#134e4a] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-50">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────── */

export default function HrAppraisal({ embedded = false } = {}) {
  const [tab, setTab] = useState('cycles');
  const [cycles, setCycles] = useState([]);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [expandedCycleId, setExpandedCycleId] = useState(null);
  const [cycleForms, setCycleForms] = useState({});
  const [scoreModal, setScoreModal] = useState(null);
  const [scoreFormKey, setScoreFormKey] = useState(0);

  // feedback tab state
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [addFeedbackOpen, setAddFeedbackOpen] = useState(false);

  const { loading, error, reload } = useHrListLoad(async () => {
    const [cyclesRes, staffRes] = await Promise.all([
      apiFetch('/api/hr/appraisal-cycles'),
      apiFetch('/api/hr/staff'),
    ]);
    if (cyclesRes.ok && cyclesRes.data?.ok) setCycles(cyclesRes.data.cycles || []);
    if (staffRes.ok && staffRes.data?.ok) setStaffList(staffRes.data.staff || []);
    return { hasData: true };
  }, []);

  const loadCycleForms = useCallback(async (cycleId) => {
    const { ok, data } = await apiFetch(`/api/hr/appraisal-cycles/${encodeURIComponent(cycleId)}/forms`);
    if (ok && data?.ok) setCycleForms(prev => ({ ...prev, [cycleId]: data.forms || [] }));
  }, []);

  const toggleCycle = (cycleId) => {
    if (expandedCycleId === cycleId) {
      setExpandedCycleId(null);
    } else {
      setExpandedCycleId(cycleId);
      if (!cycleForms[cycleId]) loadCycleForms(cycleId);
    }
  };

  const closeCycle = async (cycleId) => {
    const { ok, data } = await apiFetch(`/api/hr/appraisal-cycles/${encodeURIComponent(cycleId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'closed' }),
    });
    if (ok && data?.ok) await reload();
  };

  const loadFeedback = useCallback(async (userId) => {
    if (!userId) return;
    setFeedbackLoading(true);
    const { ok, data } = await apiFetch(`/api/hr/staff/${encodeURIComponent(userId)}/feedback`);
    setFeedbackLoading(false);
    if (ok && data?.ok) setFeedbackNotes(data.feedback || []);
  }, []);

  useEffect(() => {
    if (selectedStaff) loadFeedback(selectedStaff);
    else setFeedbackNotes([]);
  }, [selectedStaff, loadFeedback]);

  const activeCycles = cycles.filter(c => c.status === 'active').length;
  const allForms = Object.values(cycleForms).flat();
  const submittedForms = allForms.filter(f => f.status === 'submitted').length;
  const pendingForms = allForms.filter(f => f.status !== 'submitted').length;

  return (
    <div className="space-y-6">
      {!embedded ? (
        <HrPageIntro
          title="Performance Appraisals"
          description="Manage appraisal cycles, score staff performance, and track feedback notes."
        />
      ) : null}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        {['cycles', 'feedback'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-t-lg px-3 py-2 text-xs font-bold uppercase ${tab === t ? 'border border-b-white bg-white text-[#134e4a]' : 'text-slate-500'}`}
          >
            {t === 'cycles' ? 'Appraisal Cycles' : 'Feedback Notes'}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {loading && <p className="text-sm text-slate-600">Loading…</p>}

      {/* Cycles tab */}
      {tab === 'cycles' && !loading && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active Cycles" value={activeCycles} />
            <StatCard label="Total Staff Appraised" value={allForms.length} />
            <StatCard label="Completed Forms" value={submittedForms} />
            <StatCard label="Pending Forms" value={pendingForms} />
          </div>

          <HrCard
            title="Appraisal Cycles"
            actions={
              <button
                type="button"
                onClick={() => setNewCycleOpen(true)}
                className="rounded-xl bg-[#134e4a] px-3 py-1.5 text-[11px] font-bold uppercase text-white"
              >
                + New Cycle
              </button>
            }
          >
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTh>Name</AppTableTh>
                  <AppTableTh>Period</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh align="right">Forms Submitted</AppTableTh>
                  <AppTableTh>Actions</AppTableTh>
                </AppTableThead>
                <AppTableBody>
                  {cycles.length === 0 ? (
                    <AppTableTr>
                      <AppTableTd colSpan={5} align="center">
                        <span className="text-slate-500 py-4 block">No appraisal cycles yet.</span>
                      </AppTableTd>
                    </AppTableTr>
                  ) : (
                    cycles.map(cycle => (
                      <React.Fragment key={cycle.id}>
                        <AppTableTr>
                          <AppTableTd><span className="font-semibold text-slate-800">{cycle.name}</span></AppTableTd>
                          <AppTableTd>
                            <span className="text-xs text-slate-600">
                              {cycle.startDate} – {cycle.endDate}
                            </span>
                          </AppTableTd>
                          <AppTableTd>
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              cycle.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {cycle.status}
                            </span>
                          </AppTableTd>
                          <AppTableTd align="right">
                            {(cycleForms[cycle.id] || []).filter(f => f.status === 'submitted').length}
                          </AppTableTd>
                          <AppTableTd>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => toggleCycle(cycle.id)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase text-[#134e4a]"
                              >
                                {expandedCycleId === cycle.id ? 'Hide Forms' : 'View Forms'}
                              </button>
                              {cycle.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => closeCycle(cycle.id)}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600"
                                >
                                  Close Cycle
                                </button>
                              )}
                            </div>
                          </AppTableTd>
                        </AppTableTr>

                        {/* Expanded forms row */}
                        {expandedCycleId === cycle.id && (
                          <AppTableTr>
                            <AppTableTd colSpan={5} className="bg-slate-50/60 p-0">
                              <div className="px-4 py-3 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                  Forms for {cycle.name}
                                </p>
                                {!cycleForms[cycle.id] ? (
                                  <p className="text-xs text-slate-500">Loading forms…</p>
                                ) : cycleForms[cycle.id].length === 0 ? (
                                  <p className="text-xs text-slate-500">No forms for this cycle.</p>
                                ) : (
                                  <AppTableWrap>
                                    <AppTable>
                                      <AppTableThead>
                                        <AppTableTh>Staff Name</AppTableTh>
                                        <AppTableTh>Department</AppTableTh>
                                        <AppTableTh>Score</AppTableTh>
                                        <AppTableTh>Status</AppTableTh>
                                        <AppTableTh>Actions</AppTableTh>
                                      </AppTableThead>
                                      <AppTableBody>
                                        {cycleForms[cycle.id].map(f => (
                                          <AppTableTr key={f.id || f.userId}>
                                            <AppTableTd><span className="font-semibold">{f.staffName || f.userId}</span></AppTableTd>
                                            <AppTableTd>{f.department || '—'}</AppTableTd>
                                            <AppTableTd>{f.status === 'submitted' ? scoreBadge(f.scores?.overall) : <span className="text-slate-400 text-xs">Not scored</span>}</AppTableTd>
                                            <AppTableTd>
                                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                f.status === 'submitted'
                                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                  : 'bg-amber-50 text-amber-900 border-amber-200'
                                              }`}>
                                                {f.status || 'pending'}
                                              </span>
                                            </AppTableTd>
                                            <AppTableTd>
                                              <button
                                                type="button"
                                                onClick={() => setScoreModal({ ...f, cycleId: cycle.id })}
                                                className="rounded-lg bg-[#134e4a] px-2.5 py-1 text-[10px] font-bold uppercase text-white"
                                              >
                                                {f.status === 'submitted' ? 'View' : 'Open'}
                                              </button>
                                            </AppTableTd>
                                          </AppTableTr>
                                        ))}
                                      </AppTableBody>
                                    </AppTable>
                                  </AppTableWrap>
                                )}
                              </div>
                            </AppTableTd>
                          </AppTableTr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </HrCard>
        </div>
      )}

      {/* Feedback tab */}
      {tab === 'feedback' && (
        <div className="space-y-5">
          <HrCard
            title="Staff Feedback Notes"
            actions={
              selectedStaff ? (
                <button
                  type="button"
                  onClick={() => setAddFeedbackOpen(true)}
                  className="rounded-xl bg-[#134e4a] px-3 py-1.5 text-[11px] font-bold uppercase text-white"
                >
                  + Add Feedback
                </button>
              ) : null
            }
          >
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-600">
                Select Staff Member
                <select
                  value={selectedStaff}
                  onChange={e => setSelectedStaff(e.target.value)}
                  className="mt-1 block w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">— Choose staff —</option>
                  {staffList.map(s => (
                    <option key={s.userId || s.id} value={s.userId || s.id}>
                      {s.displayName || s.userId || s.id}
                    </option>
                  ))}
                </select>
              </label>

              {feedbackLoading && <p className="text-sm text-slate-500">Loading feedback…</p>}

              {!feedbackLoading && selectedStaff && feedbackNotes.length === 0 && (
                <p className="text-sm text-slate-500">No feedback notes for this staff member.</p>
              )}

              {feedbackNotes.length > 0 && (
                <div className="space-y-3">
                  {feedbackNotes.map((n, i) => (
                    <div key={n.id || i} className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-xs text-slate-500">{n.date || n.createdAtIso || ''}</span>
                        {typePill(n.type)}
                      </div>
                      <p className="text-sm text-slate-700">{n.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </HrCard>
        </div>
      )}

      {/* Modals */}
      {newCycleOpen && (
        <NewCycleModal
          onClose={() => setNewCycleOpen(false)}
          onCreated={() => { setNewCycleOpen(false); reload(); }}
        />
      )}

      {scoreModal && (
        <ScoreModal
          key={scoreFormKey}
          form={scoreModal}
          onClose={() => setScoreModal(null)}
          onSaved={() => {
            setScoreModal(null);
            if (scoreModal.cycleId) loadCycleForms(scoreModal.cycleId);
            setScoreFormKey(k => k + 1);
          }}
        />
      )}

      {addFeedbackOpen && selectedStaff && (
        <AddFeedbackModal
          userId={selectedStaff}
          onClose={() => setAddFeedbackOpen(false)}
          onSaved={() => { setAddFeedbackOpen(false); loadFeedback(selectedStaff); }}
        />
      )}
    </div>
  );
}
