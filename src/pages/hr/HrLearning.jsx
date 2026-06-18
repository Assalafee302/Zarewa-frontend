import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { hrHasPermission } from '../../lib/hrAccess';
import { createHrTrainingRecord, deleteHrTrainingRecord, fetchHrTrainingRecords } from '../../lib/hrLearning';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { navigateToHrLetter } from '../../lib/hrLetterDeepLink';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HrCard, HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import {
  AppTable, AppTableBody, AppTableTd, AppTableTh, AppTableThead, AppTableTr, AppTableWrap,
} from '../../components/ui/AppDataTable';

const CATEGORIES = [
  { value: 'technical', label: 'Technical' },
  { value: 'safety', label: 'Health & safety' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'other', label: 'Other' },
];

function expiryTone(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const days = (d - Date.now()) / (24 * 60 * 60 * 1000);
  if (days < 0) return 'text-red-700 font-bold';
  if (days < 60) return 'text-amber-700 font-semibold';
  return '';
}

export default function HrLearning({ embedded = false } = {}) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const canManage = hrHasPermission(ws?.permissions, 'hr.staff.manage');
  const [staff, setStaff] = useState([]);
  const [userId, setUserId] = useState('');
  const [records, setRecords] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', provider: '', category: 'technical', startDateIso: '', completedAtIso: '',
    expiryAtIso: '', costNgn: '', sponsor: '', outcome: '', notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (ok && data?.ok) {
      setStaff(data.staff || []);
      setUserId((prev) => prev || data.staff?.[0]?.userId || '');
    }
    return { hasData: true };
  }, []);

  const { reload } = useHrListLoad(async () => {
    if (!userId) { setRecords([]); return { hasData: true }; }
    const { ok, data } = await fetchHrTrainingRecords(userId);
    if (ok && data?.ok) setRecords(data.records || []);
    else setRecords([]);
    return { hasData: true };
  }, [userId]);

  const save = async (e) => {
    e.preventDefault();
    if (!canManage || !userId) return;
    setBusy(true);
    setError('');
    const { ok, data } = await createHrTrainingRecord({
      userId,
      ...form,
      costNgn: form.costNgn ? Number(form.costNgn) : null,
      notes: [form.outcome, form.notes].filter(Boolean).join(' — ') || form.notes,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not save training record.');
      return;
    }
    setModalOpen(false);
    setForm({ title: '', provider: '', category: 'technical', startDateIso: '', completedAtIso: '', expiryAtIso: '', costNgn: '', sponsor: '', outcome: '', notes: '' });
    await reload();
  };

  const remove = async (id) => {
    if (!canManage || !window.confirm('Delete this training record?')) return;
    const { ok, data } = await deleteHrTrainingRecord(id);
    if (ok && data?.ok) await reload();
  };

  const person = staff.find((s) => s.userId === userId);

  return (
    <HrPageBody>
      {!embedded ? (
        <HrPageIntro
          title="Learning & development"
          description="Track courses, certifications, and mandatory training with expiry alerts."
          actions={
            <>
              {person ? <Link to={`${HR_EMPLOYEES}/${userId}`} className={HR_BTN_SECONDARY}>Open profile</Link> : null}
              {canManage ? <HrAddFormButton onClick={() => setModalOpen(true)}>Add training</HrAddFormButton> : null}
            </>
          }
        />
      ) : canManage ? (
        <div className="flex justify-end pb-2"><HrAddFormButton onClick={() => setModalOpen(true)}>Add training</HrAddFormButton></div>
      ) : null}

      <HrCard title="Employee training records">
        <label className="mb-4 block max-w-md text-xs font-semibold text-slate-600">
          Select employee
          <select className={HR_FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)}>
            {staff.map((s) => (
              <option key={s.userId} value={s.userId}>{s.displayName || s.username}</option>
            ))}
          </select>
        </label>
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Title</AppTableTh>
                <AppTableTh>Category</AppTableTh>
                <AppTableTh>Provider</AppTableTh>
                <AppTableTh>Completed</AppTableTh>
                <AppTableTh>Expires</AppTableTh>
                <AppTableTh />
            </AppTableThead>
            <AppTableBody>
              {!records.length ? (
                <AppTableTr><AppTableTd colSpan={6} align="center"><span className="text-slate-500 py-4 block">No training records.</span></AppTableTd></AppTableTr>
              ) : records.map((r) => (
                <AppTableTr key={r.id}>
                  <AppTableTd>{r.title}</AppTableTd>
                  <AppTableTd>{r.category || '—'}</AppTableTd>
                  <AppTableTd>{r.provider || '—'}</AppTableTd>
                  <AppTableTd>{r.completedAtIso || '—'}</AppTableTd>
                  <AppTableTd><span className={expiryTone(r.expiryAtIso)}>{r.expiryAtIso || '—'}</span></AppTableTd>
                  <AppTableTd>
                    <div className="flex gap-2">
                      {canManage ? (
                        <>
                          <button type="button" className="text-[10px] font-bold uppercase text-[#134e4a]" onClick={() => navigateToHrLetter(navigate, { letterKind: 'training_approval', userId, sourceRecordId: r.id })}>Letter</button>
                          <button type="button" onClick={() => remove(r.id)} className="text-[10px] font-bold uppercase text-red-700">Delete</button>
                        </>
                      ) : null}
                    </div>
                  </AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      </HrCard>

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Training record" description="Record completed or planned training for promotion and compliance tracking." size="lg">
        <form onSubmit={save} className="space-y-4">
          {error ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Training title *
              <input className={HR_FIELD_CLASS} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Category
              <select className={HR_FIELD_CLASS} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Provider / institution
              <input className={HR_FIELD_CLASS} value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Start date
              <input type="date" className={HR_FIELD_CLASS} value={form.startDateIso} onChange={(e) => setForm((f) => ({ ...f, startDateIso: e.target.value }))} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Completion date
              <input type="date" className={HR_FIELD_CLASS} value={form.completedAtIso} onChange={(e) => setForm((f) => ({ ...f, completedAtIso: e.target.value }))} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Certificate expiry
              <input type="date" className={HR_FIELD_CLASS} value={form.expiryAtIso} onChange={(e) => setForm((f) => ({ ...f, expiryAtIso: e.target.value }))} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Cost (₦)
              <input type="number" min={0} className={HR_FIELD_CLASS} value={form.costNgn} onChange={(e) => setForm((f) => ({ ...f, costNgn: e.target.value }))} />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Sponsor
              <input className={HR_FIELD_CLASS} value={form.sponsor} onChange={(e) => setForm((f) => ({ ...f, sponsor: e.target.value }))} placeholder="Company / self / external" />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Training outcome
              <textarea className={`${HR_FIELD_CLASS} min-h-[64px]`} value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} placeholder="Pass/fail, certificate obtained, skills gained" />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Notes
              <textarea className={HR_FIELD_CLASS} rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </label>
          </div>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>{busy ? 'Saving…' : 'Save record'}</button>
        </form>
      </HrFormModal>
    </HrPageBody>
  );
}
