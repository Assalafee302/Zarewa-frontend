import { InlineLoader } from '../../components/ui/PageLoader';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { SEPARATION_TYPES, createHrExitClearance, fetchHrExitClearance } from '../../lib/hrPhase2';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HrCard, HrEmptyState, HrStatusPill, HrButton, HrAddButton } from './hrPageUi';
import { HR_FIELD_CLASS } from './hrFormStyles';
import {
  AppTable, AppTableBody, AppTableTd, AppTableTh, AppTableThead, AppTableTr, AppTableWrap,
} from '../ui/AppDataTable';

export function HrSeparationsPanel({ onOpenClearance }) {
  const [clearances, setClearances] = useState([]);
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ userId: '', separationType: 'resignation', lastWorkingDayIso: '', noticePeriodDays: '', reason: '' });

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
    const { ok, data } = await createHrExitClearance({
      ...form,
      notes: form.noticePeriodDays ? `Notice period: ${form.noticePeriodDays} days` : undefined,
    });
    setBusy(false);
    if (!ok || !data?.ok) { setError(data?.error || 'Could not initiate separation.'); return; }
    setModal(false);
    await reload();
    if (data.clearance?.id && onOpenClearance) onOpenClearance(data.clearance.id);
  };

  return (
    <HrCard title="Separations register" actions={<HrAddFormButton onClick={() => setModal(true)}>Initiate separation</HrAddFormButton>}>
      {error ? <div className="mb-3 text-sm text-red-800">{error}</div> : null}
      {loading && !clearances.length ? <InlineLoader message="Loading…" /> : clearances.length === 0 ? (
        <HrEmptyState title="No separation or exit clearance records yet." description="Initiate a separation to start the exit clearance workflow." />
      ) : (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTh>Staff</AppTableTh>
                <AppTableTh>Type</AppTableTh>
                <AppTableTh>Last working day</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                <AppTableTh />
            </AppTableThead>
            <AppTableBody>
              {clearances.map((c) => (
                <AppTableTr key={c.id}>
                  <AppTableTd>
                    <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(c.userId)}`} className="font-semibold text-zarewa-teal hover:underline">{c.displayName}</Link>
                  </AppTableTd>
                  <AppTableTd className="capitalize">{c.separationType}</AppTableTd>
                  <AppTableTd>{c.lastWorkingDayIso}</AppTableTd>
                  <AppTableTd><HrStatusPill status={c.status} /></AppTableTd>
                  <AppTableTd>
                    <button type="button" className="text-ui-xs font-bold uppercase text-zarewa-teal" onClick={() => onOpenClearance?.(c.id)}>Open clearance</button>
                  </AppTableTd>
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      )}

      <HrFormModal isOpen={modal} onClose={() => setModal(false)} title="Initiate separation" description="Starts exit clearance — finance, admin/IT, and HR final steps follow." size="lg">
        <form className="space-y-4" onSubmit={initiate}>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">Separation details</div>
          <label className="block text-xs font-semibold text-slate-600">
            Employee *
            <select className={HR_FIELD_CLASS} required value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
              <option value="">Select staff…</option>
              {staff.filter((s) => s.status === 'active').map((s) => (
                <option key={s.userId} value={s.userId}>{s.displayName}{s.employeeNo ? ` · ${s.employeeNo}` : ''}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Separation type *
            <select className={HR_FIELD_CLASS} value={form.separationType} onChange={(e) => setForm((f) => ({ ...f, separationType: e.target.value }))}>
              {SEPARATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Last working day *
            <input type="date" className={HR_FIELD_CLASS} required value={form.lastWorkingDayIso} onChange={(e) => setForm((f) => ({ ...f, lastWorkingDayIso: e.target.value }))} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Notice period (days)
            <input type="number" min={0} className={HR_FIELD_CLASS} value={form.noticePeriodDays} onChange={(e) => setForm((f) => ({ ...f, noticePeriodDays: e.target.value }))} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Reason *
            <textarea className={`${HR_FIELD_CLASS} min-h-[72px]`} rows={3} required minLength={10} placeholder="Reason for separation" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </label>
          <div className="flex gap-2">
            <HrButton type="submit" disabled={busy}>{busy ? 'Starting…' : 'Start exit clearance'}</HrButton>
            <HrButton type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</HrButton>
          </div>
        </form>
      </HrFormModal>
    </HrCard>
  );
}
