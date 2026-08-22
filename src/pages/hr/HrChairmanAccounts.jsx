import { HrButton } from '../../components/hr/hrPageUi';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FAMILY_BENEFITS, beneficiaryTypeLabel } from '../../lib/familyBenefitsUi';
import { DOMESTIC_BENEFITS } from '../../lib/domesticStaffUi';
import { useSearchParams } from 'react-router-dom';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../../components/ui/AppDataTable';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import { formatPayrollPeriodLabel } from '../../lib/hrPayroll';
import { HrPayrollPeriodFields } from '../../components/hr/HrPayrollPeriodFields';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import { appConfirm } from '../../lib/appConfirm';
import ExecutiveHrScholarshipRequests from './ExecutiveHrScholarshipRequests';
import {
  approveExecutivePayment,
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
  { id: 'beneficiaries', label: FAMILY_BENEFITS.adminBeneficiariesTab },
  { id: 'school-fees', label: 'School Fees' },
  { id: 'stipends', label: FAMILY_BENEFITS.adminStipendsTab },
  { id: 'domestic', label: 'Household Staff' },
  { id: 'payments', label: 'Payments' },
  { id: 'export', label: 'Bank Export' },
  { id: 'expenses', label: 'Chairman Expenses' },
  { id: 'audit', label: 'Audit' },
  { id: 'requests', label: 'Fee requests' },
];

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

function ExecSelect({ form, setForm, field, execLock, className = '' }) {
  return (
    <select
      className={`${HR_FIELD_CLASS} ${className}`.trim()}
      value={form[field] || execLock || ''}
      disabled={Boolean(execLock)}
      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
    >
      {!execLock ? <option value="">—</option> : null}
      {EXECUTIVES.map((x) => (
        <option key={x} value={x}>{x}</option>
      ))}
    </select>
  );
}

function formatNgn(v) {
  if (v == null || v === '') return '—';
  return '₦' + Number(v).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function EmptyNote({ title, hint }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-zarewa-teal">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const INNER_TAB_IDS = new Set(TABS.map((t) => t.id));

export default function HrExecutiveBenefitsHub({
  embedded = false,
  linkedExecutiveLock = '',
  defaultTab,
  visibleTabIds,
  hideDashboard = false,
  preserveParentTab = false,
  paymentFilters = {},
  onRecordsChanged,
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const innerParam = embedded ? 'benefitsTab' : 'tab';
  const legacyInner = searchParams.get('tab');
  const shownTabs = Array.isArray(visibleTabIds) && visibleTabIds.length
    ? TABS.filter((t) => visibleTabIds.includes(t.id))
    : TABS;
  const requestedTab =
    searchParams.get(innerParam) ||
    (embedded && legacyInner && INNER_TAB_IDS.has(legacyInner) ? legacyInner : null) ||
    defaultTab ||
    shownTabs[0]?.id ||
    'school-fees';
  const tab = shownTabs.some((t) => t.id === requestedTab) || shownTabs.length === 0
    ? requestedTab
    : (defaultTab || shownTabs[0]?.id || 'school-fees');
  const setTab = (id) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (embedded) {
          if (!preserveParentTab) next.set('tab', 'benefits');
          next.set('benefitsTab', id);
        } else {
          next.set('tab', id);
          next.delete('benefitsTab');
        }
        return next;
      },
      { replace: true }
    );
  };

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
  const [exportPeriod, setExportPeriod] = useState(() => currentPeriodYyyymm());

  const loadDashboard = useCallback(async () => {
    setDashError('');
    try {
      setDashboard(await fetchExecutiveBenefitsDashboard());
    } catch (e) {
      setDashError(e.message || 'Dashboard unavailable.');
    }
  }, []);

  const execLock = String(linkedExecutiveLock || '').trim();
  const listFilters = execLock ? { linkedExecutive: execLock, assignedExecutive: execLock } : {};
  const paymentSourceKind = String(paymentFilters?.sourceKind || '').trim();
  const paymentExcludeSourceKind = String(paymentFilters?.excludeSourceKind || '').trim();

  const loadTab = useCallback(async () => {
    if (tab === 'requests' || tab === 'audit') {
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const extraPayment = {
        ...(paymentSourceKind ? { sourceKind: paymentSourceKind } : {}),
        ...(paymentExcludeSourceKind ? { excludeSourceKind: paymentExcludeSourceKind } : {}),
      };
      if (tab === 'beneficiaries') setBeneficiaries(await fetchExecutiveBeneficiaries(listFilters));
      else if (tab === 'school-fees') setFees(await fetchExecutiveSchoolFees(listFilters));
      else if (tab === 'stipends') setStipends(await fetchExecutiveStipends(listFilters));
      else if (tab === 'domestic') setDomestic(await fetchDomesticStaff(listFilters));
      else if (tab === 'payments' || tab === 'export') {
        setPayments(await fetchExecutivePayments({ ...listFilters, ...extraPayment }));
      }
      else if (tab === 'expenses') setExpenses(await fetchChairmanExpenses(currentPeriodYyyymm()));
    } catch (e) {
      setError(e.message || 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [tab, execLock, paymentSourceKind, paymentExcludeSourceKind]);

  useEffect(() => {
    if (hideDashboard) return;
    void loadDashboard();
  }, [loadDashboard, hideDashboard]);

  useEffect(() => {
    void loadTab();
  }, [loadTab]);

  useEffect(() => {
    if (dashboard?.periodYyyymm && !exportPeriod) setExportPeriod(dashboard.periodYyyymm);
  }, [dashboard, exportPeriod]);

  const openModal = (kind, row = {}) => {
    setFormErr('');
    setModal(kind);
    const locked = execLock
      ? {
          linkedExecutive: execLock,
          assignedExecutive: execLock,
          ...(kind === 'beneficiary' && !row?.id ? { beneficiaryType: 'chairman_child', status: 'active' } : {}),
        }
      : {};
    setForm(row?.id ? { ...row, ...locked } : { ...locked });
  };

  const closeModal = () => {
    setModal(null);
    setForm({});
    setFormErr('');
  };

  useEffect(() => {
    const staffId = searchParams.get('staff');
    if (tab !== 'domestic' || !staffId || loading || modal) return;
    const row = domestic.find((d) => String(d.id) === String(staffId));
    if (row) openModal('domestic', row);
  }, [tab, searchParams, domestic, loading, modal]);

  const refreshAfterChange = async () => {
    await loadTab();
    if (!hideDashboard) await loadDashboard();
    if (typeof onRecordsChanged === 'function') onRecordsChanged();
  };

  const lockedPayload = (row) => (
    execLock
      ? { ...row, linkedExecutive: row.linkedExecutive || execLock, assignedExecutive: row.assignedExecutive || execLock }
      : row
  );

  const saveForm = async () => {
    setFormErr('');
    try {
      const payload = lockedPayload(form);
      let r;
      if (modal === 'beneficiary') r = await saveExecutiveBeneficiary(payload);
      else if (modal === 'fee') r = await saveExecutiveSchoolFee(payload);
      else if (modal === 'stipend') r = await saveExecutiveStipend(payload);
      else if (modal === 'domestic') r = await saveDomesticStaffProfile(payload);
      else if (modal === 'expense') r = await saveChairmanExpense(payload);
      if (!r?.ok || r.data?.ok === false) {
        setFormErr(r?.data?.error || 'Save failed.');
        return;
      }
      closeModal();
      await refreshAfterChange();
    } catch {
      setFormErr('Save failed.');
    }
  };

  const handleSubmitFee = async (id) => {
    const r = await submitExecutiveSchoolFee(id);
    if (r?.ok && r.data?.ok !== false) {
      await refreshAfterChange();
      return;
    }
    setError(r?.data?.error || 'Could not submit the school fee.');
  };

  const handleDeleteFee = async (id) => {
    if (!(await appConfirm({
      title: 'Delete',
      message: 'Delete this school fee request?',
      variant: 'danger',
    }))) return;
    await deleteExecutiveSchoolFee(id);
    await refreshAfterChange();
  };

  const handleApprovePayment = async (id) => {
    const row = payments.find((p) => p.id === id);
    if (!(await appConfirm({
      title: 'Approve this payment?',
      message: row
        ? `${row.payeeName || 'Payee'} · ${formatNgn(row.amountNgn)}. This sends it to cashier / mark-paid.`
        : 'Approve this family or household payment?',
    }))) return;
    const r = await approveExecutivePayment(id);
    if (r?.ok && r.data?.ok !== false) {
      await refreshAfterChange();
      return;
    }
    setError(r?.data?.error || 'Could not approve this payment.');
  };

  const handleRejectPayment = async (id) => {
    if (!(await appConfirm({
      title: 'Reject this payment?',
      message: 'The payee will not be paid until a new request is submitted.',
      variant: 'danger',
      confirmLabel: 'Reject',
    }))) return;
    const r = await rejectExecutivePayment(id, '');
    if (r?.ok && r.data?.ok !== false) {
      await refreshAfterChange();
      return;
    }
    setError(r?.data?.error || 'Could not reject this payment.');
  };

  const handleMarkPaid = async (id) => {
    const row = payments.find((p) => p.id === id);
    if (!(await appConfirm({
      title: 'Mark as paid?',
      message: row
        ? `Confirm that ${formatNgn(row.amountNgn)} has already been paid to ${row.payeeName || 'the payee'}. This updates the Chairman Office impact strip. It does not post treasury by itself.`
        : 'Confirm this payment has already been paid out.',
    }))) return;
    const r = await markExecutivePaymentPaid(id, {});
    if (r?.ok && r.data?.ok !== false) {
      await refreshAfterChange();
      return;
    }
    setError(r?.data?.error || 'Could not mark this payment as paid.');
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
      stipend: form.id ? 'Edit allowance' : 'Monthly allowance',
      domestic: form.id ? 'Edit household staff' : 'Register household staff',
      expense: form.id ? 'Edit expense' : 'Chairman expense',
    };
    return map[modal] || '';
  }, [modal, form.id]);

  return (
    <div className={embedded ? '' : 'mx-auto max-w-7xl px-4 py-6'}>
      {preserveParentTab && execLock ? (
        <p className="mb-4 text-sm text-[var(--z-text-muted)]">
          Add a person, request fees or salary, then approve and mark paid on Payments.
        </p>
      ) : null}

      {hideDashboard ? null : dashError ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{dashError}</p>
      ) : dashboard ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Pending school fees" value={dashboard.pendingSchoolFees} />
          <KpiCard label={FAMILY_BENEFITS.adminActiveAllowances} value={dashboard.activeStipends} />
          <KpiCard label="Household staff" value={dashboard.domesticCount} />
          <KpiCard label="Pending approvals" value={dashboard.pendingPayments} />
          <KpiCard label="Approved — not exported" value={dashboard.approvedUnexported} />
          <KpiCard label="School fees paid (YTD)" value={formatNgn(dashboard.schoolFeesPaidYear)} />
          <KpiCard label={FAMILY_BENEFITS.adminAllowancesDueMonth} value={formatNgn(dashboard.stipendsDueMonth)} />
          <KpiCard label="Domestic payroll total" value={formatNgn(dashboard.domesticPayrollTotal)} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {shownTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? 'border-zarewa-teal bg-zarewa-teal text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-teal-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
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
                  <AppTableTh>Name</AppTableTh>
                  <AppTableTh>Type</AppTableTh>
                  {execLock ? null : <AppTableTh>Executive</AppTableTh>}
                  <AppTableTh>Bank</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh align="right" />
                </AppTableThead>
                <AppTableBody>
                  {beneficiaries.length ? beneficiaries.map((b) => (
                    <AppTableTr key={b.id}>
                      <AppTableTd>{b.name}</AppTableTd>
                      <AppTableTd>{beneficiaryTypeLabel(b.beneficiaryType) || '—'}</AppTableTd>
                      {execLock ? null : <AppTableTd>{b.linkedExecutive || '—'}</AppTableTd>}
                      <AppTableTd>{b.bankAccountNo || '—'}</AppTableTd>
                      <AppTableTd><HrStatusBadge status={b.status} variant="benefit" /></AppTableTd>
                      <AppTableTd>
                        <button type="button" className="text-xs font-semibold text-zarewa-teal" onClick={() => openModal('beneficiary', b)}>Edit</button>
                      </AppTableTd>
                    </AppTableTr>
                  )) : null}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
            {!beneficiaries.length ? (
              <EmptyNote
                title="No beneficiaries yet"
                hint="Add a child or dependent first. School fees and allowances attach to this record."
              />
            ) : null}
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
                  <AppTableTh>Beneficiary</AppTableTh>
                  <AppTableTh>School</AppTableTh>
                  <AppTableTh>Term / Session</AppTableTh>
                  <AppTableTh align="right">Amount</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh align="right" />
                </AppTableThead>
                <AppTableBody>
                  {fees.map((f) => (
                    <AppTableTr key={f.id}>
                      <AppTableTd>{f.beneficiaryName}</AppTableTd>
                      <AppTableTd>{f.schoolName}</AppTableTd>
                      <AppTableTd>{[f.term, f.academicSession].filter(Boolean).join(' · ') || '—'}</AppTableTd>
                      <AppTableTd align="right">{formatNgn(f.amountApprovedNgn ?? f.amountRequestedNgn)}</AppTableTd>
                      <AppTableTd><HrStatusBadge status={f.paymentStatus} variant="benefit" /></AppTableTd>
                      <AppTableTd className="space-x-2">
                        <button type="button" className="text-xs font-semibold text-zarewa-teal" onClick={() => openModal('fee', f)}>Edit</button>
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
            {!fees.length ? (
              <EmptyNote
                title="No school fee requests"
                hint="Create a request for the term, then Submit so it can go to Payments."
              />
            ) : null}
          </>
        ) : null}

        {!loading && tab === 'stipends' ? (
          <>
            <div className="mb-3 flex justify-end">
              <HrAddFormButton onClick={() => openModal('stipend', { status: 'active', paymentFrequency: 'monthly' })}>Add allowance</HrAddFormButton>
            </div>
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTh>Beneficiary</AppTableTh>
                  {execLock ? null : <AppTableTh>Executive</AppTableTh>}
                  <AppTableTh align="right">Monthly</AppTableTh>
                  <AppTableTh>Bank</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh align="right" />
                </AppTableThead>
                <AppTableBody>
                  {stipends.map((s) => (
                    <AppTableTr key={s.id}>
                      <AppTableTd>{s.beneficiaryName}</AppTableTd>
                      {execLock ? null : <AppTableTd>{s.linkedExecutive || '—'}</AppTableTd>}
                      <AppTableTd align="right">{formatNgn(s.monthlyAmountNgn)}</AppTableTd>
                      <AppTableTd>{s.bankAccountNo || '—'}</AppTableTd>
                      <AppTableTd><HrStatusBadge status={s.status} variant="benefit" /></AppTableTd>
                      <AppTableTd>
                        <button type="button" className="text-xs font-semibold text-zarewa-teal" onClick={() => openModal('stipend', s)}>Edit</button>
                      </AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
            {!stipends.length ? (
              <EmptyNote
                title="No monthly allowances"
                hint="Add an allowance for a registered beneficiary. Payments are processed from the Payments tab."
              />
            ) : null}
          </>
        ) : null}

        {!loading && tab === 'domestic' ? (
          <>
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-950">{DOMESTIC_BENEFITS.benefitsTabHint}</p>
              <p className="mt-1 text-xs text-amber-900/80">{DOMESTIC_BENEFITS.adminManagedHint}</p>
            </div>
            <div className="mb-3 flex justify-end">
              <HrAddFormButton onClick={() => openModal('domestic', { status: 'active' })}>Register staff</HrAddFormButton>
            </div>
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTh>Name</AppTableTh>
                  <AppTableTh>Role</AppTableTh>
                  {execLock ? null : <AppTableTh>Executive</AppTableTh>}
                  <AppTableTh align="right">Salary</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh align="right" />
                </AppTableThead>
                <AppTableBody>
                  {domestic.map((d) => (
                    <AppTableTr key={d.id}>
                      <AppTableTd>{d.staffName}</AppTableTd>
                      <AppTableTd>{d.designation || '—'}</AppTableTd>
                      {execLock ? null : <AppTableTd>{d.assignedExecutive || '—'}</AppTableTd>}
                      <AppTableTd align="right">{formatNgn(d.salaryAmountNgn)}</AppTableTd>
                      <AppTableTd><HrStatusBadge status={d.status} variant="benefit" /></AppTableTd>
                      <AppTableTd>
                        <button type="button" className="text-xs font-semibold text-zarewa-teal" onClick={() => openModal('domestic', d)}>Edit</button>
                      </AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
            {!domestic.length ? (
              <EmptyNote
                title="No household staff yet"
                hint="Register a cook, driver, or other household role. Salary is paid from the Payments tab — no ERP login required."
              />
            ) : null}
          </>
        ) : null}

        {!loading && (tab === 'payments' || tab === 'export') ? (
          <>
            {tab === 'export' ? (
              <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <HrPayrollPeriodFields value={exportPeriod} onChange={setExportPeriod} labelMonth="Export month" compact />
                <HrButton type="button" disabled={exportBusy} onClick={() => void handleExport()}>
                  {exportBusy ? 'Exporting…' : FAMILY_BENEFITS.adminAllowanceExport}
                </HrButton>
                <p className="text-xs text-slate-500">Exports approved payments only. Not staff salary export.</p>
              </div>
            ) : null}
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTh>Payee</AppTableTh>
                  <AppTableTh>Type</AppTableTh>
                  <AppTableTh align="right">Amount</AppTableTh>
                  <AppTableTh>Period</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                  <AppTableTh align="right" />
                </AppTableThead>
                <AppTableBody>
                  {payments.map((p) => (
                    <AppTableTr key={p.id}>
                      <AppTableTd>{p.payeeName}</AppTableTd>
                      <AppTableTd className="capitalize">{String(p.paymentType || '').replace(/_/g, ' ')}</AppTableTd>
                      <AppTableTd align="right">{formatNgn(p.amountNgn)}</AppTableTd>
                      <AppTableTd>{p.periodYyyymm ? formatPayrollPeriodLabel(p.periodYyyymm) : '—'}</AppTableTd>
                      <AppTableTd><HrStatusBadge status={p.status} variant="benefit" /></AppTableTd>
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
            {!payments.length ? (
              <EmptyNote
                title={tab === 'export' ? 'Nothing ready to export' : 'No payments in the queue'}
                hint={
                  tab === 'export'
                    ? 'Approve payments first, then export the bank file for this month.'
                    : 'Submit a school fee or create an allowance/salary payment, then approve and mark paid here.'
                }
              />
            ) : null}
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
                  <AppTableTh>Type</AppTableTh>
                  <AppTableTh>Description</AppTableTh>
                  <AppTableTh>Period</AppTableTh>
                  <AppTableTh align="right">Amount</AppTableTh>
                  <AppTableTh>Status</AppTableTh>
                </AppTableThead>
                <AppTableBody>
                  {expenses.map((e) => (
                    <AppTableTr key={e.id}>
                      <AppTableTd>{e.expenseType}</AppTableTd>
                      <AppTableTd>{e.description}</AppTableTd>
                      <AppTableTd>{e.periodYyyymm ? formatPayrollPeriodLabel(e.periodYyyymm) : '—'}</AppTableTd>
                      <AppTableTd align="right">{formatNgn(e.amountNgn)}</AppTableTd>
                      <AppTableTd><HrStatusBadge status={e.paymentStatus} variant="benefit" /></AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
            {!expenses.length ? (
              <EmptyNote
                title="No Chairman expenses this month"
                hint="Household extras recorded here are not drawings. Add one if the office spent cash outside scholarships and salary."
              />
            ) : null}
          </>
        ) : null}

        {!loading && tab === 'requests' ? <ExecutiveHrScholarshipRequests compact /> : null}

        {!loading && tab === 'audit' ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Approvals, bank exports, and beneficiary changes are stored on the HR audit trail. MD packs are under
              Executive HR → Reports.
            </p>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              Marking a payment paid updates Chairman Office totals. It does not move treasury by itself — cashier
              payouts for drawings and loans still go through Accounts.
            </p>
          </div>
        ) : null}
      </div>

      <HrFormModal isOpen={Boolean(modal)} onClose={closeModal} title={modalTitle} size="lg">
        {formErr ? <p className="mb-3 text-sm text-rose-700">{formErr}</p> : null}
        {modal === 'beneficiary' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Name</span><input className={HR_FIELD_CLASS} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Type</span><select className={HR_FIELD_CLASS} value={form.beneficiaryType || ''} onChange={(e) => setForm({ ...form, beneficiaryType: e.target.value })}>{(execLock ? BENEFICIARY_TYPES.filter((t) => t !== 'ceo_child' && t !== 'director_child') : BENEFICIARY_TYPES).map((t) => <option key={t} value={t}>{beneficiaryTypeLabel(t) || t.replace(/_/g, ' ')}</option>)}</select></label>
            {execLock ? null : (
              <label className="block"><span className="text-xs font-semibold text-slate-600">Linked executive</span><ExecSelect form={form} setForm={setForm} field="linkedExecutive" execLock={execLock} /></label>
            )}
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
            {execLock ? null : (
              <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Linked executive</span><ExecSelect form={form} setForm={setForm} field="linkedExecutive" execLock={execLock} /></label>
            )}
            <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Notes</span><textarea className={HR_FIELD_CLASS} rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
        ) : null}
        {modal === 'stipend' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Beneficiary name</span><input className={HR_FIELD_CLASS} value={form.beneficiaryName || ''} onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Monthly amount</span><input type="number" className={HR_FIELD_CLASS} value={form.monthlyAmountNgn || ''} onChange={(e) => setForm({ ...form, monthlyAmountNgn: e.target.value })} /></label>
            {execLock ? null : (
              <label className="block"><span className="text-xs font-semibold text-slate-600">Linked executive</span><ExecSelect form={form} setForm={setForm} field="linkedExecutive" execLock={execLock} /></label>
            )}
            <label className="block"><span className="text-xs font-semibold text-slate-600">Bank account name</span><input className={HR_FIELD_CLASS} value={form.bankAccountName || ''} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Account no.</span><input className={HR_FIELD_CLASS} value={form.bankAccountNo || ''} onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Bank code</span><input className={HR_FIELD_CLASS} value={form.bankCode || ''} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} /></label>
          </div>
        ) : null}
        {modal === 'domestic' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-semibold text-slate-600">Staff name</span><input className={HR_FIELD_CLASS} value={form.staffName || ''} onChange={(e) => setForm({ ...form, staffName: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Designation</span><select className={HR_FIELD_CLASS} value={form.designation || ''} onChange={(e) => setForm({ ...form, designation: e.target.value })}><option value="">—</option>{DOMESTIC_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
            {execLock ? null : (
              <label className="block"><span className="text-xs font-semibold text-slate-600">Assigned executive</span><ExecSelect form={form} setForm={setForm} field="assignedExecutive" execLock={execLock} /></label>
            )}
            <label className="block"><span className="text-xs font-semibold text-slate-600">Salary (NGN)</span><input type="number" className={HR_FIELD_CLASS} value={form.salaryAmountNgn || ''} onChange={(e) => setForm({ ...form, salaryAmountNgn: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Bank account name</span><input className={HR_FIELD_CLASS} value={form.bankAccountName || ''} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Account no.</span><input className={HR_FIELD_CLASS} value={form.bankAccountNo || ''} onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })} /></label>
          </div>
        ) : null}
        {modal === 'expense' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-semibold text-slate-600">Type</span><input className={HR_FIELD_CLASS} value={form.expenseType || form.type || ''} onChange={(e) => setForm({ ...form, expenseType: e.target.value, type: e.target.value })} /></label>
            <div className="sm:col-span-2">
              <HrPayrollPeriodFields
                value={form.periodYyyymm || form.period || currentPeriodYyyymm()}
                onChange={(periodYyyymm) => setForm({ ...form, periodYyyymm, period: periodYyyymm })}
                labelMonth="Expense month"
                compact
              />
            </div>
            <label className="block sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Description</span><input className={HR_FIELD_CLASS} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Amount</span><input type="number" className={HR_FIELD_CLASS} value={form.amountNgn || ''} onChange={(e) => setForm({ ...form, amountNgn: e.target.value })} /></label>
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <HrButton type="button" variant="secondary" onClick={closeModal}>Cancel</HrButton>
          <HrButton type="button" onClick={() => void saveForm()}>Save</HrButton>
        </div>
      </HrFormModal>
    </div>
  );
}

/** @deprecated use HrExecutiveBenefitsHub — kept for lazy import path */
export { HrExecutiveBenefitsHub as HrChairmanAccounts };
