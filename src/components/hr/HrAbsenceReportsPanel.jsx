import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { hrHasPermission } from '../../lib/hrAccess';
import {
  ABSENCE_TYPES,
  closeHrAbsenceReport,
  createHrAbsenceReport,
  fetchHrAbsenceAlerts,
  fetchHrAbsenceReports,
  reviewHrAbsenceReport,
} from '../../lib/hrPhase2';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HrCard, HrEmptyState, HrStatusPill } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

const STATUSES = ['reported', 'hr_review', 'approved', 'rejected', 'unauthorized', 'closed'];

/**
 * @param {{ branchScoped?: boolean; canManage?: boolean; canReview?: boolean }} props
 */
export function HrAbsenceReportsPanel({ branchScoped = false, canManage = true, canReview = true } = {}) {
  const ws = useWorkspace();
  const perms = ws?.session?.permissions || [];
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [status, setStatus] = useState('');
  const [absenceType, setAbsenceType] = useState('');
  const [fromIso, setFromIso] = useState('');
  const [toIso, setToIso] = useState('');
  const [modal, setModal] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    userId: '',
    absenceStartIso: '',
    expectedReturnIso: '',
    reason: '',
    absenceType: 'illness',
    illnessRelated: false,
    doctorNoteDocumentId: '',
  });
  const [reviewNote, setReviewNote] = useState('');
  const [staff, setStaff] = useState([]);

  const manage = canManage && hrHasPermission(perms, 'hr.absence.manage');
  const review = canReview && hrHasPermission(perms, 'hr.absence.review');

  const { loading, error, setError, reload } = useHrListLoad(async () => {
    const params = { status, absenceType, fromIso, toIso };
    const [repRes, alertRes, staffRes] = await Promise.all([
      fetchHrAbsenceReports(params),
      review ? fetchHrAbsenceAlerts() : Promise.resolve({ ok: true, data: { ok: true } }),
      manage ? apiFetch('/api/hr/staff') : Promise.resolve({ ok: true, data: { ok: true, staff: [] } }),
    ]);
    if (staffRes.ok && staffRes.data?.ok) {
      let list = staffRes.data.staff || [];
      if (branchScoped) {
        const bid = ws?.session?.workspaceBranchId;
        list = list.filter((s) => s.branchId === bid);
      }
      setStaff(list);
    }
    if (!repRes.ok || !repRes.data?.ok) {
      setReports([]);
      return { error: repRes.data?.error || 'Could not load absence reports.', hasData: false };
    }
    setReports(repRes.data.reports || []);
    if (alertRes.ok && alertRes.data?.ok) setAlerts(alertRes.data.alerts);
    return { hasData: true };
  }, [status, absenceType, fromIso, toIso, branchScoped, manage, review]);

  const riskAlerts = alerts?.voluntaryTerminationRisk || [];

  const openReport = () => {
    setForm({
      userId: '',
      absenceStartIso: new Date().toISOString().slice(0, 10),
      expectedReturnIso: '',
      reason: '',
      absenceType: 'illness',
      illnessRelated: false,
      doctorNoteDocumentId: '',
    });
    setModal('report');
  };

  const saveReport = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { ok, data } = await createHrAbsenceReport(form);
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save absence report.');
      return;
    }
    setModal('');
    await reload();
  };

  const runReview = async (approve) => {
    if (!selected) return;
    setBusy(true);
    const { ok, data } = await reviewHrAbsenceReport(selected.id, { approve, reviewNote });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Review failed.');
      return;
    }
    setModal('');
    setSelected(null);
    await reload();
  };

  const runClose = async () => {
    if (!selected) return;
    setBusy(true);
    const { ok, data } = await closeHrAbsenceReport(selected.id, {
      actualReturnIso: form.expectedReturnIso || new Date().toISOString().slice(0, 10),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not close report.');
      return;
    }
    setModal('');
    setSelected(null);
    await reload();
  };

  return (
    <div className="space-y-4">
      {riskAlerts.length ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-bold uppercase text-[10px] tracking-widest">Voluntary termination risk</p>
          <ul className="mt-2 space-y-1 text-xs">
            {riskAlerts.map((a) => (
              <li key={`${a.userId}-${a.lastAbsentIso}`}>
                {a.displayName} — {a.consecutiveDays} consecutive absent day(s) without approved report
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <HrCard
        title="Absence reports"
        actions={
          manage ? (
            <HrAddFormButton onClick={openReport}>Report absence</HrAddFormButton>
          ) : null
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <select className={HR_FIELD_CLASS} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select className={HR_FIELD_CLASS} value={absenceType} onChange={(e) => setAbsenceType(e.target.value)}>
            <option value="">All types</option>
            {ABSENCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input type="date" className={HR_FIELD_CLASS} value={fromIso} onChange={(e) => setFromIso(e.target.value)} />
          <input type="date" className={HR_FIELD_CLASS} value={toIso} onChange={(e) => setToIso(e.target.value)} />
        </div>

        {error ? (
          <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        ) : null}

        {loading && !reports.length ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : reports.length === 0 ? (
          <HrEmptyState title="No absence reports for this filter." />
        ) : (
          <AppTableWrap className="overflow-x-auto">
            <AppTable>
              <AppTableThead>
                <AppTableTh>Staff</AppTableTh>
                  <AppTableTh>Branch</AppTableTh>
                  <AppTableTh>Start</AppTableTh>
                  <AppTableTh>Expected return</AppTableTh>
                  <AppTableTh>Type</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh />
              </AppTableThead>
              <AppTableBody>
                {reports.map((r) => (
                  <AppTableTr key={r.id}>
                    <AppTableTd>{r.displayName}</AppTableTd>
                    <AppTableTd>{r.branchId || '—'}</AppTableTd>
                    <AppTableTd>{r.absenceStartIso}</AppTableTd>
                    <AppTableTd>{r.expectedReturnIso}</AppTableTd>
                    <AppTableTd>{r.absenceType?.replace(/_/g, ' ')}</AppTableTd>
                    <AppTableTd><HrStatusPill status={r.status} /></AppTableTd>
                    <AppTableTd>
                      <div className="flex flex-wrap gap-1">
                        {review && ['reported', 'hr_review'].includes(r.status) ? (
                          <button
                            type="button"
                            className="text-[10px] font-bold uppercase text-[#134e4a] hover:underline"
                            onClick={() => { setSelected(r); setReviewNote(''); setModal('review'); }}
                          >
                            Review
                          </button>
                        ) : null}
                        {manage && r.status === 'approved' ? (
                          <button
                            type="button"
                            className="text-[10px] font-bold uppercase text-slate-600 hover:underline"
                            onClick={() => { setSelected(r); setModal('close'); }}
                          >
                            Close
                          </button>
                        ) : null}
                      </div>
                    </AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        )}
      </HrCard>

      <HrFormModal isOpen={modal === 'report'} onClose={() => setModal('')} title="Report absence">
        <form className="space-y-3" onSubmit={saveReport}>
          {manage && staff.length ? (
            <label className="block text-xs font-semibold text-slate-600">
              Staff
              <select
                className={`${HR_FIELD_CLASS} mt-1 w-full`}
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                required
              >
                <option value="">Select staff…</option>
                {staff.map((s) => (
                  <option key={s.userId} value={s.userId}>{s.displayName}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-xs font-semibold text-slate-600">
            Absence start
            <input type="date" className={`${HR_FIELD_CLASS} mt-1 w-full`} required value={form.absenceStartIso} onChange={(e) => setForm((f) => ({ ...f, absenceStartIso: e.target.value }))} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Expected return
            <input type="date" className={`${HR_FIELD_CLASS} mt-1 w-full`} required value={form.expectedReturnIso} onChange={(e) => setForm((f) => ({ ...f, expectedReturnIso: e.target.value }))} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Type
            <select className={`${HR_FIELD_CLASS} mt-1 w-full`} value={form.absenceType} onChange={(e) => setForm((f) => ({ ...f, absenceType: e.target.value }))}>
              {ABSENCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={form.illnessRelated} onChange={(e) => setForm((f) => ({ ...f, illnessRelated: e.target.checked }))} />
            Illness-related (doctor&apos;s note required if more than 1 day)
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Reason
            <textarea className={`${HR_FIELD_CLASS} mt-1 w-full`} rows={3} required value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Doctor note document ID (optional)
            <input className={`${HR_FIELD_CLASS} mt-1 w-full`} value={form.doctorNoteDocumentId} onChange={(e) => setForm((f) => ({ ...f, doctorNoteDocumentId: e.target.value }))} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={HR_BTN_SECONDARY} onClick={() => setModal('')}>Cancel</button>
            <button type="submit" className={HR_BTN_PRIMARY} disabled={busy}>{busy ? 'Saving…' : 'Submit report'}</button>
          </div>
        </form>
      </HrFormModal>

      <HrFormModal isOpen={modal === 'review'} onClose={() => setModal('')} title="Review absence">
        {selected ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">{selected.displayName} — {selected.reason}</p>
            <textarea className={`${HR_FIELD_CLASS} w-full`} rows={3} placeholder="Review note" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button type="button" className={HR_BTN_SECONDARY} onClick={() => runReview(false)} disabled={busy}>Reject</button>
              <button type="button" className={HR_BTN_PRIMARY} onClick={() => runReview(true)} disabled={busy}>Approve</button>
            </div>
          </div>
        ) : null}
      </HrFormModal>

      <HrFormModal isOpen={modal === 'close'} onClose={() => setModal('')} title="Close absence">
        {selected ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600">
              Actual return date
              <input type="date" className={`${HR_FIELD_CLASS} mt-1 w-full`} value={form.expectedReturnIso} onChange={(e) => setForm((f) => ({ ...f, expectedReturnIso: e.target.value }))} />
            </label>
            <button type="button" className={HR_BTN_PRIMARY} onClick={runClose} disabled={busy}>Mark closed</button>
          </div>
        ) : null}
      </HrFormModal>
    </div>
  );
}
