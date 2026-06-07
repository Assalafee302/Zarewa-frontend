import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
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
import {
  approveExecutivePayment,
  deleteChairmanExpense,
  deleteExecutiveSchoolFee,
  downloadExecutivePaymentExport,
  fetchChairmanExpenses,
  fetchDomesticStaff,
  fetchExecutiveBeneficiaries,
  fetchExecutiveBenefitsDashboard,
  fetchExecutivePayments,
  fetchExecutiveSchoolFees,
  fetchExecutiveStipends,
  markExecutivePaymentPaid,
  rejectExecutivePayment,
  saveChairmanExpense,
  saveDomesticStaffProfile,
  saveExecutiveBeneficiary,
  saveExecutiveSchoolFee,
  saveExecutiveStipend,
  submitExecutiveSchoolFee,
} from '../../lib/hrExecutiveBenefits';

const TABS = [
  { id: 'beneficiaries', label: 'Beneficiaries' },
  { id: 'school-fees', label: 'School Fees' },
  { id: 'stipends', label: 'Monthly Stipends' },
  { id: 'domestic', label: 'Domestic Staff' },
  { id: 'payments', label: 'Payment Approvals' },
  { id: 'export', label: 'Bank Export' },
  { id: 'expenses', label: 'Chairman Expenses' },
  { id: 'audit', label: 'Audit' },
];

const STATUS_PILL = {
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  submitted: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  paid: 'bg-teal-50 text-teal-800 border-teal-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  exported: 'bg-sky-50 text-sky-800 border-sky-200',
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  paused: 'bg-amber-50 text-amber-800 border-amber-200',
  ended: 'bg-slate-50 text-slate-600 border-slate-200',
};

const BENEFICIARY_TYPES = [
  'ceo_child',
  'chairman_child',
  'director_child',
  'dependent',
  'sponsored_student',
  'other',
];
const EXECUTIVES = ['Chairman', 'CEO', 'MD', 'Director'];
const FEE_TYPES = ['tuition', 'boarding', 'books', 'uniform', 'exam_fee', 'transport', 'other'];
const DOMESTIC_ROLES = ['Cook', 'Driver', 'Housekeeper', 'Cleaner', 'Gardener', 'Security', 'Steward', 'Nanny', 'Domestic assistant', 'Other'];

function formatNgn(v) {
  if (v == null || v === '') return '—';
  return '₦' + Number(v).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatusPill({ status }) {
  const key = String(status || 'draft').toLowerCase();
  const cls = STATUS_PILL[key] || STATUS_PILL.draft;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {key.replace(/_/g, ' ')}
    </span>
  );
}

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#134e4a]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function HrExecutiveBenefitsHub({ embedded = false } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'school-fees';
  const setTab = (id) => setSearchParams({ tab: id }, { replace: true });

  const [dashboard, setDashboard] = useState(null);
  const [dashError, setDashError] = useState('');
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [fees, setFees] = useState([]);
  const [stipends, setStipends] = useState([]);
  const [domestic, setDomestic] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [formErr, setFormErr] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('');

  const loadDashboard = useCallback(async () => {
    setDashError('');
    try {
      setDashboard(await fetchExecutiveBenefitsDashboard());
    } catch (e) {
      setDashError(e.message || 'Dashboard unavailable.');
    }
  }, []);

  const loadTab = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'beneficiaries') setBeneficiaries(await fetchExecutiveBeneficiaries());
      else if (tab === 'school-fees') setFees(await fetchExecutiveSchoolFees());
      else if (tab === 'stipends') setStipends(await fetchExecutiveStipends());
      else if (tab === 'domestic') setDomestic(await fetchDomesticStaff());
      else if (tab === 'payments' || tab === 'export') setPayments(await fetchExecutivePayments());
      else if (tab === 'expenses') setExpenses(await fetchChairmanExpenses());
    } catch (e) {
      setError(e.message || 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadTab();
  }, [loadTab]);

  useEffect(() => {
    if (dashboard?.periodYyyymm && !exportPeriod) setExportPeriod(dashboard.periodYyyymm);
  }, [dashboard, exportPeriod]);

  const openModal = (kind, row = {}) => {
    setFormErr('');
    setModal(kind);
    setForm(row?.id ? { ...row } : {});
  };

  const closeModal = () => {
    setModal(null);
    setForm({});
    setFormErr('');
  };

  const saveForm = async () => {
    setFormErr('');
    try {
      let r;
      if (modal === 'beneficiary') r = await saveExecutiveBeneficiary(form);
      else if (modal === 'fee') r = await saveExecutiveSchoolFee(form);
      else if (modal === 'stipend') r = await saveExecutiveStipend(form);
      else if (modal === 'domestic') r = await saveDomesticStaffProfile(form);
      else if (modal === 'expense') r = await saveChairmanExpense(form);
      if (!r?.ok || r.data?.ok === false) {
        setFormErr(r?.data?.error || 'Save failed.');
        return;
      }
      closeModal();
      await loadTab();
      await loadDashboard();
    } catch {
      setFormErr('Save failed.');
    }
  };

  const handleSubmitFee = async (id) => {
    const r = await submitExecutiveSchoolFee(id);
    if (r?.ok && r.data?.ok !== false) {
      await loadTab();
      await loadDashboard();
    }
  };

  const handleDeleteFee = async (id) => {
    if (!window.confirm('Delete this school fee request?')) return;
    await deleteExecutiveSchoolFee(id);
    await loadTab();
  };

  const handleApprovePayment = async (id) => {
    const r = await approveExecutivePayment(id);
    if (r?.ok && r.data?.ok !== false) {
      await loadTab();
      await loadDashboard();
    }
  };

  const handleRejectPayment = async (id) => {
    const reason = window.prompt('Rejection reason (optional):') || '';
    await rejectExecutivePayment(id, reason);
    await loadTab();
  };

  const handleMarkPaid = async (id) => {
    const r = await markExecutivePaymentPaid(id, {});
    if (r?.ok && r.data?.ok !== false) {
      await loadTab();
      await loadDashboard();
    }
  };

  const handleExport = async () => {
    setExportBusy(true);
    try {
      await downloadExecutivePaymentExport({ periodYyyymm: exportPeriod || undefined });
      await loadTab();
    } catch (e) {
      setError(e.message || 'Export failed.');
    } finally {
      setExportBusy(false);
    }
  };

  const modalTitle = useMemo(() => {
    const map = {
      beneficiary: form.id ? 'Edit beneficiary' : 'Register beneficiary',
      fee: form.id ? 'Edit school fee' : 'School fee request',
      stipend: form.id ? 'Edit stipend' : 'Monthly stipend',
      domestic: form.id ? 'Edit domestic staff' : 'Register domestic staff',
      expense: form.id ? 'Edit expense' : 'Chairman expense',
    };
    return map[modal] || '';
  }, [modal, form.id]);

  return (
    <div className={embedded ? '' : 'mx-auto max-w-7xl px-4 py-6'}>
      {!embedded ? (
        <header className="mb-6">
          <h1 className="text-2xl font-black text-[#134e4a]">Executive Benefits</h1>
          <p className="mt-1 text-sm text-slate-600">
            Scholarships, stipends, domestic staff, and beneficiary payments — separate from operational payroll.
          </p>
        </header>
      ) : null}

      {dashError ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{dashError}</p>
      ) : dashboard ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Pending school fees" value={dashboard.pendingSchoolFees} />
          <KpiCard label="Active stipends" value={dashboard.activeStipends} />
          <KpiCard label="Domestic staff" value={dashboard.domesticCount} />
          <KpiCard label="Pending approvals" value={dashboard.pendingPayments} />
          <KpiCard label="Approved — not exported" value={dashboard.approvedUnexported} />
          <KpiCard label="School fees paid (YTD)" value={formatNgn(dashboard.schoolFeesPaidYear)} />
          <KpiCard label="Stipends due this month" value={formatNgn(dashboard.stipendsDueMonth)} />
          <KpiCard label="Domestic payroll total" value={formatNgn(dashboard.domesticPayrollTotal)} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? 'border-[#134e4a] bg-[#134e4a] text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-teal-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
        {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}

        {!loading && tab === 'beneficiaries' ? (
          <>
            <div className="mb-3 flex justify-end">
              <HrAddFormButton onClick={() => openModal('beneficiary', { status: 'active' })}>Add beneficiary</HrAddFormButton>
            </div>
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTr>
                    <AppTableTh>Name</AppTableTh>
                    <AppTableTh>Type</AppTableTh>
                    <AppTableTh>Executive</AppTableTh>
                    <AppTableTh>Bank</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh />
                  </AppTableTr>
                </AppTableThead>
                <AppTableBody>
                  {beneficiaries.map((b) => (
                    <AppTableTr key={b.id}>
                      <AppTableTd>{b.name}</AppTableTd>
                      <AppTableTd className="capitalize">{String(b.beneficiaryType || '').replace(/_/g, ' ')}</AppTableTd>
                      <AppTableTd>{b.linkedExecutive || '—'}</AppTableTd>
                      <AppTableTd>{b.bankAccountNo || '—'}</AppTableTd>
                      <AppTableTd><StatusPill status={b.status} /></AppTableTd>
                      <AppTableTd>
                        <button type="button" className="text-xs font-semibold text-[#134e4a]" onClick={() => openModal('beneficiary', b)}>Edit</button>
                      </AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </>
        ) : null}

        {!loading && tab === 'school-fees' ? (
          <>
            <div className="mb-3 flex justify-end">
              <HrAddFormButton onClick={() => openModal('fee', { paymentStatus: 'draft', feeType: 'tuition' })}>New request</HrAddFormButton>
            </div>
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTr>
                    <AppTableTh>Beneficiary</AppTableTh>
                    <AppTableTh>School</AppTableTh>
                    <AppTableTh>Term / Session</AppTableTh>
                    <AppTableTh>Amount</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh />
                  </AppTableTr>
                </AppTableThead>
                <AppTableBody>
                  {fees.map((f) => (
                    <AppTableTr key={f.id}>
                      <AppTableTd>{f.beneficiaryName}</AppTableTd>
                      <AppTableTd>{f.schoolName}</AppTableTd>
                      <AppTableTd>{[f.term, f.academicSession].filter(Boolean).join(' · ') || '—'}</AppTableTd>
                      <AppTableTd>{formatNgn(f.amountApprovedNgn ?? f.amountRequestedNgn)}</AppTableTd>
                      <AppTableTd><StatusPill status={f.paymentStatus} /></AppTableTd>
                      <AppTableTd className="space-x-2">
                        <button type="button" className="text-xs font-semibold text-[#134e4a]" onClick={() => openModal('fee', f)}>Edit</button>
                        {f.paymentStatus === 'draft' ? (
                          <button type="button" className="text-xs font-semibold text-teal-700" onClick={() => handleSubmitFee(f.id)}>Submit</button>
                        ) : null}
                        {f.paymentStatus === 'draft' ? (
                          <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => handleDeleteFee(f.id)}>Delete</button>
                        ) : null}
                      </AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </>
        ) : null}

        {!loading && tab === 'stipends' ? (
          <>
            <div className="mb-3 flex justify-end">
              <HrAddFormButton onClick={() => openModal('stipend', { status: 'active', paymentFrequency: 'monthly' })}>Add stipend</HrAddFormButton>
            </div>
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTr>
                    <AppTableTh>Beneficiary</AppTableTh>
                    <AppTableTh>Executive</AppTableTh>
                    <AppTableTh>Monthly</AppTableTh>
                    <AppTableTh>Bank</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh />
                  </AppTableTr>
                </AppTableThead>
                <AppTableBody>
                  {stipends.map((s) => (
                    <AppTableTr key={s.id}>
                      <AppTableTd>{s.beneficiaryName}</AppTableTd>
                      <AppTableTd>{s.linkedExecutive || '—'}</AppTableTd>
                      <AppTableTd>{formatNgn(s.monthlyAmountNgn)}</AppTableTd>
                      <AppTableTd>{s.bankAccountNo || '—'}</AppTableTd>
                      <AppTableTd><StatusPill status={s.status} /></AppTableTd>
                      <AppTableTd>
                        <button type="button" className="text-xs font-semibold text-[#134e4a]" onClick={() => openModal('stipend', s)}>Edit</button>
                      </AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </>
        ) : null}

        {!loading && tab === 'domestic' ? (
          <>
            <div className="mb-3 flex justify-end">
              <HrAddFormButton onClick={() => openModal('domestic', { status: 'active' })}>Register staff</HrAddFormButton>
            </div>
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTr>
                    <AppTableTh>Name</AppTableTh>
                    <AppTableTh>Role</AppTableTh>
                    <AppTableTh>Executive</AppTableTh>
                    <AppTableTh>Salary</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh />
                  </AppTableTr>
                </AppTableThead>
                <AppTableBody>
                  {domestic.map((d) => (
                    <AppTableTr key={d.id}>
                      <AppTableTd>{d.staffName}</AppTableTd>
                      <AppTableTd>{d.designation || '—'}</AppTableTd>
                      <AppTableTd>{d.assignedExecutive || '—'}</AppTableTd>
                      <AppTableTd>{formatNgn(d.salaryAmountNgn)}</AppTableTd>
                      <AppTableTd><StatusPill status={d.status} /></AppTableTd>
                      <AppTableTd>
                        <button type="button" className="text-xs font-semibold text-[#134e4a]" onClick={() => openModal('domestic', d)}>Edit</button>
                      </AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </>
        ) : null}

        {!loading && (tab === 'payments' || tab === 'export') ? (
          <>
            {tab === 'export' ? (
              <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Period (YYYYMM)</label>
                  <input className={HR_FIELD_CLASS} value={exportPeriod} onChange={(e) => setExportPeriod(e.target.value)} placeholder="202606" />
                </div>
                <button type="button" className={HR_BTN_PRIMARY} disabled={exportBusy} onClick={() => void handleExport()}>
                  {exportBusy ? 'Exporting…' : 'Beneficiary Stipend Payment Export'}
                </button>
                <p className="text-xs text-slate-500">Exports approved payments only. Not staff salary export.</p>
              </div>
            ) : null}
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTr>
                    <AppTableTh>Payee</AppTableTh>
                    <AppTableTh>Type</AppTableTh>
                    <AppTableTh>Amount</AppTableTh>
                    <AppTableTh>Period</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh />
                  </AppTableTr>
                </AppTableThead>
                <AppTableBody>
                  {payments.map((p) => (
                    <AppTableTr key={p.id}>
                      <AppTableTd>{p.payeeName}</AppTableTd>
                      <AppTableTd className="capitalize">{String(p.paymentType || '').replace(/_/g, ' ')}</AppTableTd>
                      <AppTableTd>{formatNgn(p.amountNgn)}</AppTableTd>
                      <AppTableTd>{p.periodYyyymm || '—'}</AppTableTd>
                      <AppTableTd><StatusPill status={p.status} /></AppTableTd>
                      <AppTableTd className="space-x-2">
                        {['submitted', 'finance_review', 'md_review'].includes(p.status) ? (
                          <>
                            <button type="button" className="text-xs font-semibold text-emerald-700" onClick={() => handleApprovePayment(p.id)}>Approve</button>
                            <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => handleRejectPayment(p.id)}>Reject</button>
                          </>
                        ) : null}
                        {['approved', 'exported'].includes(p.status) ? (
                          <button type="button" className="text-xs font-semibold text-teal-700" onClick={() => handleMarkPaid(p.id)}>Mark paid</button>
                        ) : null}
                      </AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </>
        ) : null}

        {!loading && tab === 'expenses' ? (
          <>
            <div className="mb-3 flex justify-end">
              <HrAddFormButton onClick={() => openModal('expense', { paymentStatus: 'pending' })}>Add expense</HrAddFormButton>
            </div>
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTr>
                    <AppTableTh>Type</AppTableTh>
                    <AppTableTh>Description</AppTableTh>
                    <AppTableTh>Period</AppTableTh>
                    <AppTableTh>Amount</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                  </AppTableTr>
                </AppTableThead>
                <AppTableBody>
                  {expenses.map((e) => (
                    <AppTableTr key={e.id}>
                      <AppTableTd>{e.expenseType}</AppTableTd>
                      <AppTableTd>{e.description}</AppTableTd>
                      <AppTableTd>{e.periodYyyymm}</AppTableTd>
                      <AppTableTd>{formatNgn(e.amountNgn)}</AppTableTd>
                      <AppTableTd><StatusPill status={e.paymentStatus} /></AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          </>
        ) : null}

        {!loading && tab === 'audit' ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>Executive payment actions are recorded in the HR audit trail. Use <strong>HR Reports → Executive payment audit</strong> for full export.</p>
            <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              Audited events include: beneficiary changes, school fee submissions, stipend updates, domestic staff changes, approvals, bank exports, and proof of payment.
            </p>
          </div>
        ) : null}
      </div>

      <HrFormModal isOpen={Boolean(modal)} onClose={closeModal} title={modalTitle} size="lg">
        {formErr ? <p className="mb-3 text-sm text-rose-700">{formErr}</p> : null}
        {modal === 'beneficiary' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Name</span><input className={HR_FIELD_CLASS} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Type</span><select className={HR_FIELD_CLASS} value={form.beneficiaryType || ''} onChange={(e) => setForm({ ...form, beneficiaryType: e.target.value })}>{BENEFICIARY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Linked executive</span><select className={HR_FIELD_CLASS} value={form.linkedExecutive || ''} onChange={(e) => setForm({ ...form, linkedExecutive: e.target.value })}><option value="">—</option>{EXECUTIVES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Bank account name</span><input className={HR_FIELD_CLASS} value={form.bankAccountName || ''} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Account no.</span><input className={HR_FIELD_CLASS} value={form.bankAccountNo || ''} onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })} placeholder="Full number on save" /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Bank code</span><input className={HR_FIELD_CLASS} value={form.bankCode || ''} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} /></label>
          </div>
        ) : null}
        {modal === 'fee' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-semibold text-slate-600">Beneficiary name</span><input className={HR_FIELD_CLASS} value={form.beneficiaryName || form.childName || ''} onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value, childName: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">School</span><input className={HR_FIELD_CLASS} value={form.schoolName || form.school || ''} onChange={(e) => setForm({ ...form, schoolName: e.target.value, school: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Term</span><input className={HR_FIELD_CLASS} value={form.term || ''} onChange={(e) => setForm({ ...form, term: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Session</span><input className={HR_FIELD_CLASS} value={form.academicSession || form.year || ''} onChange={(e) => setForm({ ...form, academicSession: e.target.value, year: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Fee type</span><select className={HR_FIELD_CLASS} value={form.feeType || 'tuition'} onChange={(e) => setForm({ ...form, feeType: e.target.value })}>{FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Amount requested</span><input type="number" className={HR_FIELD_CLASS} value={form.amountRequestedNgn ?? form.amountNgn ?? ''} onChange={(e) => setForm({ ...form, amountRequestedNgn: e.target.value, amountNgn: e.target.value })} /></label>
            <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Linked executive</span><select className={HR_FIELD_CLASS} value={form.linkedExecutive || ''} onChange={(e) => setForm({ ...form, linkedExecutive: e.target.value })}><option value="">—</option>{EXECUTIVES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Notes</span><textarea className={HR_FIELD_CLASS} rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
        ) : null}
        {modal === 'stipend' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Beneficiary name</span><input className={HR_FIELD_CLASS} value={form.beneficiaryName || ''} onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Monthly amount</span><input type="number" className={HR_FIELD_CLASS} value={form.monthlyAmountNgn || ''} onChange={(e) => setForm({ ...form, monthlyAmountNgn: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Linked executive</span><select className={HR_FIELD_CLASS} value={form.linkedExecutive || ''} onChange={(e) => setForm({ ...form, linkedExecutive: e.target.value })}><option value="">—</option>{EXECUTIVES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Bank account name</span><input className={HR_FIELD_CLASS} value={form.bankAccountName || ''} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Account no.</span><input className={HR_FIELD_CLASS} value={form.bankAccountNo || ''} onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Bank code</span><input className={HR_FIELD_CLASS} value={form.bankCode || ''} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} /></label>
          </div>
        ) : null}
        {modal === 'domestic' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-semibold text-slate-600">Staff name</span><input className={HR_FIELD_CLASS} value={form.staffName || ''} onChange={(e) => setForm({ ...form, staffName: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Designation</span><select className={HR_FIELD_CLASS} value={form.designation || ''} onChange={(e) => setForm({ ...form, designation: e.target.value })}><option value="">—</option>{DOMESTIC_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Assigned executive</span><select className={HR_FIELD_CLASS} value={form.assignedExecutive || ''} onChange={(e) => setForm({ ...form, assignedExecutive: e.target.value })}><option value="">—</option>{EXECUTIVES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Salary (NGN)</span><input type="number" className={HR_FIELD_CLASS} value={form.salaryAmountNgn || ''} onChange={(e) => setForm({ ...form, salaryAmountNgn: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Bank account name</span><input className={HR_FIELD_CLASS} value={form.bankAccountName || ''} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Account no.</span><input className={HR_FIELD_CLASS} value={form.bankAccountNo || ''} onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })} /></label>
          </div>
        ) : null}
        {modal === 'expense' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-semibold text-slate-600">Type</span><input className={HR_FIELD_CLASS} value={form.expenseType || form.type || ''} onChange={(e) => setForm({ ...form, expenseType: e.target.value, type: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Period (YYYYMM)</span><input className={HR_FIELD_CLASS} value={form.periodYyyymm || form.period || ''} onChange={(e) => setForm({ ...form, periodYyyymm: e.target.value, period: e.target.value })} /></label>
            <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Description</span><input className={HR_FIELD_CLASS} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Amount</span><input type="number" className={HR_FIELD_CLASS} value={form.amountNgn || ''} onChange={(e) => setForm({ ...form, amountNgn: e.target.value })} /></label>
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={HR_BTN_SECONDARY} onClick={closeModal}>Cancel</button>
          <button type="button" className={HR_BTN_PRIMARY} onClick={() => void saveForm()}>Save</button>
        </div>
      </HrFormModal>
    </div>
  );
}

/** @deprecated use HrExecutiveBenefitsHub — kept for lazy import path */
export { HrExecutiveBenefitsHub as HrChairmanAccounts };
