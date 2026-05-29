import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { hrHasPermission } from '../../lib/hrAccess';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HrManagerPicker } from '../../components/hr/HrManagerPicker';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import {
  HR_APPRAISAL_CRITERIA,
  createHrAppraisalCycle,
  createHrFeedbackNote,
  emptyAppraisalScores,
  fetchHrAppraisalCycles,
  fetchHrAppraisalForms,
  fetchHrFeedbackNotes,
  parseAppraisalScores,
  saveHrAppraisalForm,
} from '../../lib/hrPerformance';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

const STATUS_LABEL = { draft: 'Draft', submitted: 'Submitted', confirmed: 'MD confirmed' };

export default function HrPerformance() {
  const ws = useWorkspace();
  const perms = ws?.permissions || [];
  const canManage = hrHasPermission(perms, 'hr.staff.manage');

  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [forms, setForms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [cycleModal, setCycleModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [cycleLabel, setCycleLabel] = useState('');
  const [cycleYear, setCycleYear] = useState(String(new Date().getFullYear()));
  const [cycleDue, setCycleDue] = useState('');
  const [subjectUserId, setSubjectUserId] = useState('');
  const [reviewerUserId, setReviewerUserId] = useState('');
  const [scores, setScores] = useState(emptyAppraisalScores);
  const [formStatus, setFormStatus] = useState('draft');
  const [mdConfirmed, setMdConfirmed] = useState(false);
  const [feedbackUserId, setFeedbackUserId] = useState('');
  const [feedbackBody, setFeedbackBody] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const staffById = useMemo(() => {
    const m = {};
    for (const s of staff) m[s.userId] = s;
    return m;
  }, [staff]);

  const { reload: reloadCycles } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrAppraisalCycles();
    if (!ok || !data?.ok) {
      setCycles([]);
      return { error: data?.error || 'Could not load cycles.', hasData: false };
    }
    const list = data.cycles || [];
    setCycles(list);
    setSelectedCycleId((prev) => prev || list[0]?.id || '');
    return { hasData: true };
  }, []);

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (!ok || !data?.ok) {
      setStaff([]);
      return { hasData: false };
    }
    setStaff(data.staff || []);
    return { hasData: true };
  }, []);

  const { loading: formsLoading, reload: reloadForms } = useHrListLoad(async () => {
    if (!selectedCycleId) {
      setForms([]);
      return { hasData: true };
    }
    const { ok, data } = await fetchHrAppraisalForms(selectedCycleId);
    if (!ok || !data?.ok) {
      setForms([]);
      return { error: data?.error || 'Could not load forms.', hasData: false };
    }
    setForms(data.forms || []);
    return { hasData: true };
  }, [selectedCycleId]);

  const loadFeedback = async (userId) => {
    if (!userId) {
      setFeedbackNotes([]);
      return;
    }
    const { ok, data } = await fetchHrFeedbackNotes(userId);
    if (ok && data?.ok) setFeedbackNotes(data.notes || []);
    else setFeedbackNotes([]);
  };

  const createCycle = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setBusy(true);
    setErr('');
    const { ok, data } = await createHrAppraisalCycle({
      label: cycleLabel.trim() || `Appraisal ${cycleYear}`,
      year: Number(cycleYear),
      dueByIso: cycleDue || undefined,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not create cycle.');
      return;
    }
    setCycleModal(false);
    setCycleLabel('');
    await reloadCycles();
  };

  const openFormEdit = (form) => {
    setSubjectUserId(form.subjectUserId);
    setReviewerUserId(form.reviewerUserId || '');
    setScores(parseAppraisalScores(form.scores || form.scoresJson));
    setFormStatus(form.status || 'draft');
    setMdConfirmed(Boolean(form.mdConfirmed));
    setFormModal(true);
  };

  const openNewForm = () => {
    setSubjectUserId('');
    setReviewerUserId('');
    setScores(emptyAppraisalScores());
    setFormStatus('draft');
    setMdConfirmed(false);
    setFormModal(true);
  };

  const saveForm = async (e) => {
    e.preventDefault();
    if (!canManage || !selectedCycleId || !subjectUserId) return;
    setBusy(true);
    setErr('');
    const { ok, data } = await saveHrAppraisalForm({
      cycleId: selectedCycleId,
      subjectUserId,
      reviewerUserId: reviewerUserId || null,
      scores,
      status: formStatus,
      mdConfirmed,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not save form.');
      return;
    }
    setFormModal(false);
    setMsg('Appraisal saved.');
    await reloadForms();
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackUserId || feedbackBody.trim().length < 2) return;
    setBusy(true);
    const { ok, data } = await createHrFeedbackNote({
      subjectUserId: feedbackUserId,
      body: feedbackBody.trim(),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not save feedback.');
      return;
    }
    setFeedbackBody('');
    await loadFeedback(feedbackUserId);
  };

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Annual appraisal cycles, reviewer scores, and informal feedback notes on staff files.
      </p>
      {msg ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Cycle
            <select
              className={`${HR_FIELD_CLASS} ml-2 min-w-[200px]`}
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
            >
              <option value="">Select cycle…</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.year})
                </option>
              ))}
            </select>
          </label>
          {selectedCycle?.dueByIso ? (
            <span className="text-xs text-slate-500">Due {selectedCycle.dueByIso}</span>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <HrAddFormButton onClick={() => setCycleModal(true)}>New cycle</HrAddFormButton>
            <HrAddFormButton onClick={openNewForm} disabled={!selectedCycleId}>
              Appraisal form
            </HrAddFormButton>
            <HrAddFormButton onClick={() => setFeedbackModal(true)}>Feedback note</HrAddFormButton>
          </div>
        ) : null}
      </div>

      {formsLoading ? <p className="text-sm text-slate-600">Loading forms…</p> : null}
      {selectedCycleId && forms.length === 0 && !formsLoading ? (
        <p className="text-sm text-slate-600">No appraisal forms in this cycle yet.</p>
      ) : null}

      {forms.length > 0 ? (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Employee</AppTableTh>
              <AppTableTh>Reviewer</AppTableTh>
              <AppTableTh>Overall</AppTableTh>
              <AppTableTh>Status</AppTableTh>
              <AppTableTh />
            </AppTableThead>
            <AppTableBody>
              {forms.map((f) => {
                const sub = staffById[f.subjectUserId];
                const rev = staffById[f.reviewerUserId];
                const sc = parseAppraisalScores(f.scores || f.scoresJson);
                return (
                  <AppTableTr key={f.id}>
                    <AppTableTd>
                      <Link to={`/hr/staff/${f.subjectUserId}`} className="font-semibold text-[#134e4a] hover:underline">
                        {sub?.displayName || f.subjectUserId}
                      </Link>
                    </AppTableTd>
                    <AppTableTd>{rev?.displayName || f.reviewerUserId || '—'}</AppTableTd>
                    <AppTableTd>{sc.overall}/5</AppTableTd>
                    <AppTableTd>{STATUS_LABEL[f.status] || f.status}</AppTableTd>
                    <AppTableTd>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => openFormEdit(f)}
                          className="text-[10px] font-bold uppercase text-[#134e4a]"
                        >
                          Edit
                        </button>
                      ) : null}
                    </AppTableTd>
                  </AppTableTr>
                );
              })}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : null}

      <HrFormModal
        isOpen={cycleModal}
        onClose={() => setCycleModal(false)}
        title="New appraisal cycle"
        description="Open a cycle for managers to complete staff appraisals."
      >
        <form onSubmit={createCycle} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Label
            <input className={HR_FIELD_CLASS} value={cycleLabel} onChange={(e) => setCycleLabel(e.target.value)} placeholder="e.g. Mid-year 2026" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Year
            <input type="number" className={HR_FIELD_CLASS} value={cycleYear} onChange={(e) => setCycleYear(e.target.value)} required />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Due date
            <input type="date" className={HR_FIELD_CLASS} value={cycleDue} onChange={(e) => setCycleDue(e.target.value)} />
          </label>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Saving…' : 'Create cycle'}
          </button>
        </form>
      </HrFormModal>

      <HrFormModal
        isOpen={formModal}
        onClose={() => setFormModal(false)}
        title="Appraisal form"
        size="lg"
      >
        <form onSubmit={saveForm} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Employee
              <select
                className={HR_FIELD_CLASS}
                value={subjectUserId}
                onChange={(e) => setSubjectUserId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {staff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.displayName || s.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Reviewer
              <HrManagerPicker staff={staff} value={reviewerUserId} onChange={setReviewerUserId} excludeUserId={subjectUserId} />
            </label>
          </div>
          {HR_APPRAISAL_CRITERIA.map((c) => (
            <label key={c.key} className="block text-xs font-semibold text-slate-600">
              {c.label} (1–5)
              <input
                type="number"
                min={1}
                max={5}
                className={HR_FIELD_CLASS}
                value={scores[c.key]}
                onChange={(e) => setScores((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))}
              />
            </label>
          ))}
          <label className="block text-xs font-semibold text-slate-600">
            Comments
            <textarea
              className={`${HR_FIELD_CLASS} min-h-[80px]`}
              value={scores.comments}
              onChange={(e) => setScores((prev) => ({ ...prev, comments: e.target.value }))}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Status
              <select className={HR_FIELD_CLASS} value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:mt-6">
              <input type="checkbox" checked={mdConfirmed} onChange={(e) => setMdConfirmed(e.target.checked)} />
              MD confirmed
            </label>
          </div>
          <button type="submit" disabled={busy || !selectedCycleId} className={HR_BTN_PRIMARY}>
            {busy ? 'Saving…' : 'Save appraisal'}
          </button>
        </form>
      </HrFormModal>

      <HrFormModal
        isOpen={feedbackModal}
        onClose={() => {
          setFeedbackModal(false);
          setFeedbackNotes([]);
        }}
        title="Feedback note"
        description="Informal notes visible on the staff file (not a formal disciplinary record)."
      >
        <form onSubmit={submitFeedback} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Employee
            <select
              className={HR_FIELD_CLASS}
              value={feedbackUserId}
              onChange={(e) => {
                setFeedbackUserId(e.target.value);
                loadFeedback(e.target.value);
              }}
              required
            >
              <option value="">Select…</option>
              {staff.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.displayName || s.username}
                </option>
              ))}
            </select>
          </label>
          {feedbackNotes.length > 0 ? (
            <ul className="max-h-32 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
              {feedbackNotes.map((n) => (
                <li key={n.id}>
                  <span className="text-slate-400">{n.createdAtIso?.slice(0, 10)}</span> — {n.body}
                </li>
              ))}
            </ul>
          ) : null}
          <label className="block text-xs font-semibold text-slate-600">
            Note
            <textarea
              className={`${HR_FIELD_CLASS} min-h-[80px]`}
              value={feedbackBody}
              onChange={(e) => setFeedbackBody(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Saving…' : 'Add note'}
          </button>
        </form>
      </HrFormModal>
    </div>
  );
}
