import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrBenefits } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import {
  fetchHrBeneficiaries,
  fetchHrBenefitPayments,
  recordHrBenefitPayment,
  saveHrBeneficiary,
} from '../../lib/hrExtended';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';

export default function HrBenefits({ embedded = false } = {}) {
  const ws = useWorkspace();
  const canManage = canManageHrBenefits(ws?.permissions);
  const [tab, setTab] = useState('beneficiaries');
  const [modalOpen, setModalOpen] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [period, setPeriod] = useState(currentPeriodYyyymm());
  const [form, setForm] = useState({
    displayName: '',
    beneficiaryType: 'allowance',
    monthlyAmountNgn: '',
    userId: '',
    notes: '',
  });
  const [message, setMessage] = useState('');
  const [formErr, setFormErr] = useState('');

  const { loading, error, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrBeneficiaries();
    if (!ok || !data?.ok) {
      setBeneficiaries([]);
      return { error: data?.error || 'Could not load beneficiaries.', hasData: false };
    }
    setBeneficiaries(data.beneficiaries || []);
    return { hasData: true };
  }, []);

  const loadPayments = async () => {
    const { ok, data } = await fetchHrBenefitPayments(period);
    if (ok && data?.ok) setPayments(data.payments || []);
  };

  useHrListLoad(async () => {
    if (tab !== 'payments') return { hasData: true };
    await loadPayments();
    return { hasData: true };
  }, [tab, period]);

  const saveBeneficiary = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setFormErr('');
    const { ok, data } = await saveHrBeneficiary({
      displayName: form.displayName.trim(),
      beneficiaryType: form.beneficiaryType,
      monthlyAmountNgn: Number(form.monthlyAmountNgn) || 0,
      userId: form.userId || null,
      notes: form.notes || null,
    });
    if (!ok || !data?.ok) {
      setFormErr(data?.error || 'Save failed.');
      return;
    }
    setMessage('Beneficiary saved.');
    setForm({ displayName: '', beneficiaryType: 'allowance', monthlyAmountNgn: '', userId: '', notes: '' });
    setModalOpen(false);
    await reload();
  };

  const schedulePayment = async (beneficiaryId, amountNgn) => {
    if (!canManage) return;
    const { ok, data } = await recordHrBenefitPayment({
      beneficiaryId,
      periodYyyymm: period,
      amountNgn,
      status: 'scheduled',
    });
    if (ok && data?.ok) {
      setMessage('Payment scheduled for period.');
      await loadPayments();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!embedded ? (
          <p className="text-sm text-slate-600">
            Manage allowances, scholarship beneficiaries, and domestic staff benefit schedules separate from payroll lines.
          </p>
        ) : null}
        {tab === 'beneficiaries' && canManage ? (
          <HrAddFormButton onClick={() => setModalOpen(true)}>Add beneficiary</HrAddFormButton>
        ) : null}
      </div>
      <div className="flex gap-2">
        {['beneficiaries', 'payments'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              tab === t ? 'bg-[#134e4a] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <HrFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add beneficiary"
        size="md"
      >
        <form onSubmit={saveBeneficiary} className="grid gap-3 sm:grid-cols-2">
          {formErr ? (
            <div className="sm:col-span-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{formErr}</div>
          ) : null}
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            Display name
            <input className={HR_FIELD_CLASS} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Type
            <select className={HR_FIELD_CLASS} value={form.beneficiaryType} onChange={(e) => setForm({ ...form, beneficiaryType: e.target.value })}>
              <option value="allowance">Allowance</option>
              <option value="scholarship">Scholarship</option>
              <option value="domestic">Domestic staff</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Monthly amount (₦)
            <input type="number" min={0} className={HR_FIELD_CLASS} value={form.monthlyAmountNgn} onChange={(e) => setForm({ ...form, monthlyAmountNgn: e.target.value })} />
          </label>
          <button type="submit" className={`sm:col-span-2 ${HR_BTN_PRIMARY}`}>
            Save beneficiary
          </button>
        </form>
      </HrFormModal>

      {tab === 'beneficiaries' ? (
        <AppTableWrap>
          <AppTable>
            <AppTableThead>
              <AppTableTr>
                <AppTableTh>Name</AppTableTh>
                <AppTableTh>Type</AppTableTh>
                <AppTableTh align="right">Monthly</AppTableTh>
                <AppTableTh>Status</AppTableTh>
                {canManage ? <AppTableTh /> : null}
              </AppTableTr>
            </AppTableThead>
            <AppTableBody>
              {beneficiaries.map((b) => (
                <AppTableTr key={b.id}>
                  <AppTableTd className="font-semibold">{b.displayName}</AppTableTd>
                  <AppTableTd>{b.beneficiaryType}</AppTableTd>
                  <AppTableTd align="right">{formatNgn(b.monthlyAmountNgn)}</AppTableTd>
                  <AppTableTd>{b.status}</AppTableTd>
                  {canManage ? (
                    <AppTableTd>
                      <button type="button" className="text-xs font-bold text-[#134e4a]" onClick={() => schedulePayment(b.id, b.monthlyAmountNgn)}>
                        Schedule {period}
                      </button>
                    </AppTableTd>
                  ) : null}
                </AppTableTr>
              ))}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-600">
            Period (YYYYMM)
            <input className={HR_FIELD_CLASS} value={period} onChange={(e) => setPeriod(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </label>
          <AppTableWrap>
            <AppTable>
              <AppTableThead>
                <AppTableTr>
                  <AppTableTh>Beneficiary</AppTableTh>
                  <AppTableTh align="right">Amount</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                </AppTableTr>
              </AppTableThead>
              <AppTableBody>
                {payments.map((p) => (
                  <AppTableTr key={p.id}>
                    <AppTableTd>{p.displayName}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(p.amountNgn)}</AppTableTd>
                    <AppTableTd>{p.status}</AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        </div>
      )}
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
    </div>
  );
}
