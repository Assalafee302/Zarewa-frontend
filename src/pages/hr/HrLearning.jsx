import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { apiFetch } from '../../lib/apiBase';
import { hrHasPermission } from '../../lib/hrAccess';
import { createHrTrainingRecord, deleteHrTrainingRecord, fetchHrTrainingRecords } from '../../lib/hrLearning';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HrCard, HrPageBody, HrPageIntro } from '../../components/hr/hrPageUi';
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

export default function HrLearning({ embedded = false } = {}) {
  const ws = useWorkspace();
  const canManage = hrHasPermission(ws?.permissions, 'hr.staff.manage');
  const [staff, setStaff] = useState([]);
  const [userId, setUserId] = useState('');
  const [records, setRecords] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', provider: '', completedAtIso: '', expiryAtIso: '', notes: '' });
  const [busy, setBusy] = useState(false);

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/staff');
    if (ok && data?.ok) {
      setStaff(data.staff || []);
      setUserId((prev) => prev || data.staff?.[0]?.userId || '');
    }
    return { hasData: true };
  }, []);

  const { reload } = useHrListLoad(async () => {
    if (!userId) {
      setRecords([]);
      return { hasData: true };
    }
    const { ok, data } = await fetchHrTrainingRecords(userId);
    if (ok && data?.ok) setRecords(data.records || []);
    else setRecords([]);
    return { hasData: true };
  }, [userId]);

  const save = async (e) => {
    e.preventDefault();
    if (!canManage || !userId) return;
    setBusy(true);
    const { ok, data } = await createHrTrainingRecord({ userId, ...form });
    setBusy(false);
    if (ok && data?.ok) {
      setModalOpen(false);
      setForm({ title: '', provider: '', completedAtIso: '', expiryAtIso: '', notes: '' });
      await reload();
    }
  };

  const remove = async (id) => {
    if (!canManage) return;
    const { ok, data } = await deleteHrTrainingRecord(id);
    if (ok && data?.ok) await reload();
  };

  const person = staff.find((s) => s.userId === userId);

  return (
    <HrPageBody>
      {!embedded ? (
        <HrPageIntro
          title="Learning & development"
          description="Track courses, certifications, and safety training by employee."
          actions={
            <>
              {person ? (
                <Link to={`${HR_EMPLOYEES}/${userId}`} className={HR_BTN_SECONDARY}>
                  Open profile
                </Link>
              ) : null}
              {canManage ? <HrAddFormButton onClick={() => setModalOpen(true)}>Add record</HrAddFormButton> : null}
            </>
          }
        />
      ) : (
        canManage ? (
          <div className="flex justify-end pb-2">
            <HrAddFormButton onClick={() => setModalOpen(true)}>Add record</HrAddFormButton>
          </div>
        ) : null
      )}
      <HrCard title="Employee records">
        <label className="mb-4 block max-w-md text-xs font-semibold text-slate-600">
          Select employee
          <select className={HR_FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)}>
            {staff.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.displayName || s.username}
              </option>
            ))}
          </select>
        </label>
      <AppTableWrap>
        <AppTable>
          <AppTableThead>
            <AppTableTh>Title</AppTableTh>
            <AppTableTh>Provider</AppTableTh>
            <AppTableTh>Completed</AppTableTh>
            <AppTableTh>Expires</AppTableTh>
            <AppTableTh />
          </AppTableThead>
          <AppTableBody>
            {records.length === 0 ? (
              <AppTableTr>
                <AppTableTd colSpan={5} align="center">
                  <span className="text-slate-500 py-4 block">No training records.</span>
                </AppTableTd>
              </AppTableTr>
            ) : (
              records.map((r) => (
                <AppTableTr key={r.id}>
                  <AppTableTd>{r.title}</AppTableTd>
                  <AppTableTd>{r.provider || '—'}</AppTableTd>
                  <AppTableTd>{r.completedAtIso || '—'}</AppTableTd>
                  <AppTableTd>{r.expiryAtIso || '—'}</AppTableTd>
                  <AppTableTd>
                    {canManage ? (
                      <button type="button" onClick={() => remove(r.id)} className="text-[10px] font-bold uppercase text-red-700">
                        Delete
                      </button>
                    ) : null}
                  </AppTableTd>
                </AppTableTr>
              ))
            )}
          </AppTableBody>
        </AppTable>
      </AppTableWrap>
      </HrCard>

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Training record">
        <form onSubmit={save} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Title
            <input className={HR_FIELD_CLASS} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Provider
            <input className={HR_FIELD_CLASS} value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Completed
            <input type="date" className={HR_FIELD_CLASS} value={form.completedAtIso} onChange={(e) => setForm((f) => ({ ...f, completedAtIso: e.target.value }))} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Expiry
            <input type="date" className={HR_FIELD_CLASS} value={form.expiryAtIso} onChange={(e) => setForm((f) => ({ ...f, expiryAtIso: e.target.value }))} />
          </label>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </form>
      </HrFormModal>
    </HrPageBody>
  );
}
