import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { SEPARATION_TYPES, createHrExitClearance, fetchHrExitClearance } from '../../lib/hrPhase2';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HrCard, HrEmptyState, HrStatusPill } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';
import {
  AppTable, AppTableBody, AppTableTd, AppTableTh, AppTableThead, AppTableTr, AppTableWrap,
} from '../ui/AppDataTable';

export function HrSeparationsPanel() {
  const [clearances, setClearances] = useState([]);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ userId: '', separationType: 'resignation', lastWorkingDayIso: '', reason: '' });

  const { loading, error, setError, reload } = useHrListLoad(async () => {
    const [clRes, staffRes] = await Promise.all([
      fetchHrExitClearance({}),
      apiFetch('/api/hr/staff?includeInactive=1'),
    ]);
    if (staffRes.ok && staffRes.data?.ok) setStaff(staffRes.data.staff || []);
    if (!clRes.ok || !clRes.data?.ok) {
      setClearances([]);
      return { error: clRes.data?.error || 'Could not load separations.', hasData: false };
    }
    setClearances(clRes.data.clearances || []);
    return { hasData: true };
  }, []);

  const initiate = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { ok, data } = await createHrExitClearance(form);
    setBusy(false);
    if (!ok || !data?.ok) { setError(data?.error || 'Could not initiate separation.'); return; }
    setModal(false);
    await reload();
  };

  return (
    <HrCard title="Separations register" actions={<HrAddFormButton onClick={() => setModal(true)}>Initiate separation</HrAddFormButton>}>
      {error ? <div className="mb-3 text-sm text-red-800">{error}</div> : null}
      {loading && !clearances.length ? <p className="text-sm text-slate-600">Loading…</p> : clearances.length === 0 ? (
        <HrEmptyState title="No separation or exit clearance records yet." />
      ) : (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTr>
                <AppTableTh>Staff</AppTableTh>
                <AppTableTh>Type</AppTableTh>
                <AppTableTh>Last working day</AppTableTh>
                <AppTableTh>Status</AppTableTh>
              </AppTableTr>
            </AppTableThead>
            <AppTableBody>
              {clearances.map((c) => (
                <AppTableTr key={c.id}>
                  <AppTableTd>
                    <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(c.userId)}`} className="font-semibold text-[#134e4a] hover:underline">
                      {c.displayName}
                    </Link>
                  </AppTableTd>
                  <AppTableTd>{c.separationType}</AppTableTd>
                  <AppTableTd>{c.lastWorkingDayIso}</AppTableTd>
                  <AppTableTd><HrStatusPill status={c.status} /></AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}

      <HrFormModal isOpen={modal} onClose={() => setModal(false)} title="Initiate separation">
        <form className="space-y-3" onSubmit={initiate}>
          <select className={HR_FIELD_CLASS} required value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
            <option value="">Select staff…</option>
            {staff.filter((s) => s.status === 'active').map((s) => (
              <option key={s.userId} value={s.userId}>{s.displayName}</option>
            ))}
          </select>
          <select className={HR_FIELD_CLASS} value={form.separationType} onChange={(e) => setForm((f) => ({ ...f, separationType: e.target.value }))}>
            {SEPARATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input type="date" className={HR_FIELD_CLASS} required value={form.lastWorkingDayIso} onChange={(e) => setForm((f) => ({ ...f, lastWorkingDayIso: e.target.value }))} />
          <textarea className={HR_FIELD_CLASS} rows={2} placeholder="Reason" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          <button type="submit" className={HR_BTN_PRIMARY} disabled={busy}>Start exit clearance</button>
        </form>
      </HrFormModal>
    </HrCard>
  );
}
