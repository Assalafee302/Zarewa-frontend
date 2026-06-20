import React, { useState } from 'react';
import { FAMILY_BENEFITS } from '../../lib/familyBenefitsUi';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrBenefits } from '../../lib/hrAccess';
import { formatNgn } from '../../lib/hrFormat';
import { HrPayrollPeriodFields } from '../../components/hr/HrPayrollPeriodFields';
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
  AppTablePager,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';
import { HrDualView } from '../../components/hr/HrDualView';
import { HrMobileCard, HrMobileCardList } from '../../components/hr/HrMobileCard';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import { HrTableEmptyRow, HrTableLoadingRow } from '../../components/hr/HrTableBodyState';
import { useAppTablePaging } from '../../lib/appDataTable';

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

  const beneficiaryPaging = useAppTablePaging(beneficiaries, 20, tab);
  const paymentPaging = useAppTablePaging(payments, 20, tab, period);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!embedded ? (
          <p className="text-sm text-slate-600">
            Manage allowances, executive family beneficiaries, and domestic staff benefit schedules separate from payroll lines.
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
              <option value="scholarship">Executive family</option>
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
        <>
          <HrDualView
            mobile={
              <HrMobileCardList loading={loading && !beneficiaries.length} loadingMessage="Loading beneficiaries…" emptyMessage="No beneficiaries yet.">
                {beneficiaryPaging.slice.map((b) => (
                  <HrMobileCard
                    key={b.id}
                    title={b.displayName}
                    badge={<HrStatusBadge status={b.status} variant="benefit" />}
                    fields={[
                      { label: 'Type', value: b.beneficiaryType },
                      { label: 'Monthly', value: formatNgn(b.monthlyAmountNgn) },
                    ]}
                    footer={
                      canManage ? (
                        <button type="button" className="text-xs font-bold text-[#134e4a]" onClick={() => schedulePayment(b.id, b.monthlyAmountNgn)}>
                          Schedule {period}
                        </button>
                      ) : null
                    }
                  />
                ))}
              </HrMobileCardList>
            }
            desktop={
              <AppTableWrap>
                <AppTable>
                  <AppTableThead>
                    <AppTableTh>Name</AppTableTh>
                    <AppTableTh>Type</AppTableTh>
                    <AppTableTh align="right">Monthly</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    {canManage ? <AppTableTh /> : null}
                  </AppTableThead>
                  <AppTableBody>
                    {loading && !beneficiaries.length ? (
                      <HrTableLoadingRow colSpan={canManage ? 5 : 4} message="Loading beneficiaries…" />
                    ) : null}
                    {!loading && !beneficiaries.length ? (
                      <HrTableEmptyRow colSpan={canManage ? 5 : 4} message="No beneficiaries yet." />
                    ) : null}
                    {beneficiaryPaging.slice.map((b) => (
                      <AppTableTr key={b.id}>
                        <AppTableTd className="font-semibold">{b.displayName}</AppTableTd>
                        <AppTableTd>{b.beneficiaryType}</AppTableTd>
                        <AppTableTd align="right">{formatNgn(b.monthlyAmountNgn)}</AppTableTd>
                        <AppTableTd truncate={false}><HrStatusBadge status={b.status} variant="benefit" /></AppTableTd>
                        {canManage ? (
                          <AppTableTd truncate={false}>
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
            }
          />
          {beneficiaryPaging.total > beneficiaryPaging.pageSize ? (
            <AppTablePager
              showingFrom={beneficiaryPaging.showingFrom}
              showingTo={beneficiaryPaging.showingTo}
              total={beneficiaryPaging.total}
              hasPrev={beneficiaryPaging.hasPrev}
              hasNext={beneficiaryPaging.hasNext}
              onPrev={beneficiaryPaging.goPrev}
              onNext={beneficiaryPaging.goNext}
            />
          ) : null}
        </>
      ) : (
        <div className="space-y-3">
          <HrPayrollPeriodFields value={period} onChange={setPeriod} labelMonth="Payment month" />
          <HrDualView
            mobile={
              <HrMobileCardList loading={loading && !payments.length} loadingMessage="Loading payments…" emptyMessage="No payments for this period.">
                {paymentPaging.slice.map((p) => (
                  <HrMobileCard
                    key={p.id}
                    title={p.displayName}
                    badge={<HrStatusBadge status={p.status} variant="benefit" />}
                    fields={[{ label: 'Amount', value: formatNgn(p.amountNgn) }]}
                  />
                ))}
              </HrMobileCardList>
            }
            desktop={
              <AppTableWrap>
                <AppTable>
                  <AppTableThead>
                    <AppTableTh>Beneficiary</AppTableTh>
                    <AppTableTh align="right">Amount</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                  </AppTableThead>
                  <AppTableBody>
                    {loading && !payments.length ? (
                      <HrTableLoadingRow colSpan={3} message="Loading payments…" />
                    ) : null}
                    {!loading && !payments.length ? (
                      <HrTableEmptyRow colSpan={3} message="No payments for this period." />
                    ) : null}
                    {paymentPaging.slice.map((p) => (
                      <AppTableTr key={p.id}>
                        <AppTableTd>{p.displayName}</AppTableTd>
                        <AppTableTd align="right">{formatNgn(p.amountNgn)}</AppTableTd>
                        <AppTableTd truncate={false}><HrStatusBadge status={p.status} variant="benefit" /></AppTableTd>
                      </AppTableTr>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableWrap>
            }
          />
          {paymentPaging.total > paymentPaging.pageSize ? (
            <AppTablePager
              showingFrom={paymentPaging.showingFrom}
              showingTo={paymentPaging.showingTo}
              total={paymentPaging.total}
              hasPrev={paymentPaging.hasPrev}
              hasNext={paymentPaging.hasNext}
              onPrev={paymentPaging.goPrev}
              onNext={paymentPaging.goNext}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
