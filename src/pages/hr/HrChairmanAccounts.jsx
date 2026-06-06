import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/apiBase';
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
import { fetchHrBeneficiaries } from '../../lib/hrExtended';
import {
  deleteChairmanExpenseApi,
  deleteChairmanSchoolFeeApi,
  fetchChairmanExpenses,
  fetchChairmanSchoolFees,
  saveChairmanExpense,
  saveChairmanSchoolFee,
} from '../../lib/hrChairman';

const TABS = [
  { id: 'school-fees', label: 'School Fees' },
  { id: 'stipends', label: 'Stipends & Allowances' },
  { id: 'domestic', label: 'Domestic Staff' },
  { id: 'expenses', label: 'Chairman Expenses' },
];

const FEE_STATUS_PILL = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  partial: 'bg-sky-50 text-sky-800 border-sky-200',
};

const EXPENSE_TYPES = [
  'Sallah Rams',
  'Ramadan Food Items',
  'Domestic Allowance',
  'Utilities',
  'Maintenance',
  'Other',
];

const BLANK_FEE = {
  id: null,
  childName: '',
  school: '',
  term: '',
  year: new Date().getFullYear().toString(),
  feeType: 'Tuition',
  amountNgn: '',
  paid: '',
  status: 'pending',
};

const BLANK_EXPENSE = {
  id: null,
  period: '',
  type: 'Other',
  description: '',
  vendor: '',
  quantity: '',
  amountNgn: '',
  status: 'pending',
};

function formatNgn(v) {
  if (!v && v !== 0) return '—';
  return '₦' + Number(v).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function HrChairmanAccounts({ embedded = false } = {}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('school-fees');

  // School fees state
  const [fees, setFees] = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesError, setFeesError] = useState('');
  const [feeModal, setFeeModal] = useState(false);
  const [feeForm, setFeeForm] = useState(BLANK_FEE);
  const [feeFormErr, setFeeFormErr] = useState('');

  // Stipends state
  const [stipends, setStipends] = useState([]);
  const [stipendsLoading, setStipendLoading] = useState(false);
  const [stipendsError, setStipendError] = useState('');

  // Domestic state
  const [domestic, setDomestic] = useState([]);
  const [domesticLoading, setDomesticLoading] = useState(false);
  const [domesticError, setDomesticError] = useState('');

  // Expenses state
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensesError, setExpensesError] = useState('');
  const [expModal, setExpModal] = useState(false);
  const [expForm, setExpForm] = useState(BLANK_EXPENSE);
  const [expFormErr, setExpFormErr] = useState('');

  const loadFees = useCallback(async () => {
    setFeesLoading(true);
    setFeesError('');
    try {
      const data = await fetchChairmanSchoolFees();
      setFees(data);
    } catch {
      setFeesError('Could not load school fees.');
    } finally {
      setFeesLoading(false);
    }
  }, []);

  const loadStipends = useCallback(async () => {
    setStipendLoading(true);
    setStipendError('');
    try {
      const { ok, data } = await fetchHrBeneficiaries();
      if (ok && data?.ok) {
        setStipends((data.beneficiaries || []).filter((b) => b.beneficiaryType === 'scholarship'));
      } else {
        setStipendError('Could not load stipends.');
      }
    } catch {
      setStipendError('Could not load stipends.');
    } finally {
      setStipendLoading(false);
    }
  }, []);

  const loadDomestic = useCallback(async () => {
    setDomesticLoading(true);
    setDomesticError('');
    try {
      const { ok, data } = await apiFetch('/api/hr/staff?department=Chairman+Staff');
      if (ok && data?.ok) {
        setDomestic(data.staff || []);
      } else {
        setDomestic([]);
      }
    } catch {
      setDomestic([]);
    } finally {
      setDomesticLoading(false);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setExpensesLoading(true);
    setExpensesError('');
    try {
      const data = await fetchChairmanExpenses();
      setExpenses(data);
    } catch {
      setExpensesError('Could not load expenses.');
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'school-fees') loadFees();
    else if (tab === 'stipends') loadStipends();
    else if (tab === 'domestic') loadDomestic();
    else if (tab === 'expenses') loadExpenses();
  }, [tab, loadFees, loadStipends, loadDomestic, loadExpenses]);

  const openAddFee = () => { setFeeForm(BLANK_FEE); setFeeFormErr(''); setFeeModal(true); };
  const openEditFee = (f) => { setFeeForm({ ...f }); setFeeFormErr(''); setFeeModal(true); };

  const saveFee = async (e) => {
    e.preventDefault();
    setFeeFormErr('');
    try {
      await saveChairmanSchoolFee({
        ...feeForm,
        amountNgn: Number(feeForm.amountNgn) || 0,
        paid: Number(feeForm.paid) || 0,
      });
      setFeeModal(false);
      await loadFees();
    } catch {
      setFeeFormErr('Save failed. Please try again.');
    }
  };

  const deleteFee = async (id) => {
    if (!window.confirm('Delete this school fee record?')) return;
    try {
      await deleteChairmanSchoolFeeApi(id);
      await loadFees();
    } catch {
      alert('Delete failed.');
    }
  };

  const openAddExp = () => { setExpForm(BLANK_EXPENSE); setExpFormErr(''); setExpModal(true); };
  const openEditExp = (x) => { setExpForm({ ...x }); setExpFormErr(''); setExpModal(true); };

  const saveExp = async (e) => {
    e.preventDefault();
    setExpFormErr('');
    try {
      await saveChairmanExpense({
        ...expForm,
        amountNgn: Number(expForm.amountNgn) || 0,
        quantity: Number(expForm.quantity) || 1,
      });
      setExpModal(false);
      await loadExpenses();
    } catch {
      setExpFormErr('Save failed. Please try again.');
    }
  };

  const deleteExp = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await deleteChairmanExpenseApi(id);
      await loadExpenses();
    } catch {
      alert('Delete failed.');
    }
  };

  const expenseTotal = expenses.reduce((s, x) => s + (Number(x.amountNgn) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Print styles */}
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <p className="text-sm text-slate-600">
          Manage chairman household accounts: school fees, stipends, domestic staff, and operational expenses.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
        >
          Print / Export
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 no-print">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              tab === t.id ? 'bg-[#134e4a] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SCHOOL FEES ── */}
      {tab === 'school-fees' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between no-print">
            <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Children's School Fees</h3>
            <HrAddFormButton onClick={openAddFee}>+ Add Fee</HrAddFormButton>
          </div>
          {feesError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{feesError}</div>}
          {feesLoading ? <p className="text-sm text-slate-500">Loading…</p> : (
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTr>
                    <AppTableTh>Child Name</AppTableTh>
                    <AppTableTh>School</AppTableTh>
                    <AppTableTh>Term</AppTableTh>
                    <AppTableTh>Year</AppTableTh>
                    <AppTableTh>Fee Type</AppTableTh>
                    <AppTableTh align="right">Amount</AppTableTh>
                    <AppTableTh align="right">Paid</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh className="no-print" />
                  </AppTableTr>
                </AppTableThead>
                <AppTableBody>
                  {!fees.length && (
                    <AppTableTr>
                      <AppTableTd colSpan={9}><span className="text-slate-500">No records yet.</span></AppTableTd>
                    </AppTableTr>
                  )}
                  {fees.map((f) => (
                    <AppTableTr key={f.id}>
                      <AppTableTd className="font-semibold">{f.childName}</AppTableTd>
                      <AppTableTd>{f.school}</AppTableTd>
                      <AppTableTd>{f.term}</AppTableTd>
                      <AppTableTd>{f.year}</AppTableTd>
                      <AppTableTd>{f.feeType}</AppTableTd>
                      <AppTableTd align="right">{formatNgn(f.amountNgn)}</AppTableTd>
                      <AppTableTd align="right">{formatNgn(f.paid)}</AppTableTd>
                      <AppTableTd>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${FEE_STATUS_PILL[f.status] || FEE_STATUS_PILL.pending}`}>
                          {f.status}
                        </span>
                      </AppTableTd>
                      <AppTableTd className="no-print">
                        <div className="flex gap-2">
                          <button type="button" className="text-xs font-bold text-[#134e4a] hover:underline" onClick={() => openEditFee(f)}>Edit</button>
                          <button type="button" className="text-xs font-bold text-red-600 hover:underline" onClick={() => deleteFee(f.id)}>Delete</button>
                        </div>
                      </AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          )}

          <HrFormModal isOpen={feeModal} onClose={() => setFeeModal(false)} title={feeForm.id ? 'Edit School Fee' : 'Add School Fee'} size="md">
            <form onSubmit={saveFee} className="grid gap-3 sm:grid-cols-2">
              {feeFormErr && <div className="sm:col-span-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{feeFormErr}</div>}
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                Child Name
                <input className={HR_FIELD_CLASS} value={feeForm.childName} onChange={(e) => setFeeForm({ ...feeForm, childName: e.target.value })} required />
              </label>
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                School
                <input className={HR_FIELD_CLASS} value={feeForm.school} onChange={(e) => setFeeForm({ ...feeForm, school: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Term
                <select className={HR_FIELD_CLASS} value={feeForm.term} onChange={(e) => setFeeForm({ ...feeForm, term: e.target.value })}>
                  <option value="">Select…</option>
                  <option>1st Term</option>
                  <option>2nd Term</option>
                  <option>3rd Term</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Year
                <input className={HR_FIELD_CLASS} value={feeForm.year} onChange={(e) => setFeeForm({ ...feeForm, year: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Fee Type
                <input className={HR_FIELD_CLASS} value={feeForm.feeType} onChange={(e) => setFeeForm({ ...feeForm, feeType: e.target.value })} placeholder="Tuition, PTA, etc." />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Status
                <select className={HR_FIELD_CLASS} value={feeForm.status} onChange={(e) => setFeeForm({ ...feeForm, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Amount (₦)
                <input type="number" min={0} className={HR_FIELD_CLASS} value={feeForm.amountNgn} onChange={(e) => setFeeForm({ ...feeForm, amountNgn: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Paid (₦)
                <input type="number" min={0} className={HR_FIELD_CLASS} value={feeForm.paid} onChange={(e) => setFeeForm({ ...feeForm, paid: e.target.value })} />
              </label>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setFeeModal(false)} className={HR_BTN_SECONDARY}>Cancel</button>
                <button type="submit" className={HR_BTN_PRIMARY}>Save</button>
              </div>
            </form>
          </HrFormModal>
        </div>
      )}

      {/* ── STIPENDS & ALLOWANCES ── */}
      {tab === 'stipends' && (
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Scholarship & Stipend Beneficiaries</h3>
          {stipendsError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{stipendsError}</div>}
          {stipendsLoading ? <p className="text-sm text-slate-500">Loading…</p> : (
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTr>
                    <AppTableTh>Name</AppTableTh>
                    <AppTableTh>Type</AppTableTh>
                    <AppTableTh align="right">Monthly (₦)</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                  </AppTableTr>
                </AppTableThead>
                <AppTableBody>
                  {!stipends.length && (
                    <AppTableTr>
                      <AppTableTd colSpan={4}><span className="text-slate-500">No scholarship beneficiaries found. Add them via Benefits → Add beneficiary (type: Scholarship).</span></AppTableTd>
                    </AppTableTr>
                  )}
                  {stipends.map((b) => (
                    <AppTableTr key={b.id}>
                      <AppTableTd className="font-semibold">{b.displayName}</AppTableTd>
                      <AppTableTd>{b.beneficiaryType}</AppTableTd>
                      <AppTableTd align="right">{formatNgn(b.monthlyAmountNgn)}</AppTableTd>
                      <AppTableTd>{b.status}</AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          )}
        </div>
      )}

      {/* ── DOMESTIC STAFF ── */}
      {tab === 'domestic' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between no-print">
            <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Chairman Domestic Staff</h3>
            <button
              type="button"
              onClick={() => navigate('/hr/employees?tab=directory&register=1')}
              className="rounded-xl bg-[#134e4a] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-[#0f3d3a]"
            >
              + Register Staff
            </button>
          </div>
          <p className="text-sm text-slate-500">Showing staff registered under Chairman Staff department.</p>
          {domesticError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{domesticError}</div>}
          {domesticLoading ? <p className="text-sm text-slate-500">Loading…</p> : (
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTr>
                    <AppTableTh>Name</AppTableTh>
                    <AppTableTh>Role</AppTableTh>
                    <AppTableTh>Department</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                  </AppTableTr>
                </AppTableThead>
                <AppTableBody>
                  {!domestic.length && (
                    <AppTableTr>
                      <AppTableTd colSpan={4}><span className="text-slate-500">No domestic staff found under Chairman Staff department.</span></AppTableTd>
                    </AppTableTr>
                  )}
                  {domestic.map((s) => (
                    <AppTableTr key={s.userId}>
                      <AppTableTd className="font-semibold">{s.displayName || s.username}</AppTableTd>
                      <AppTableTd>{s.jobTitle || '—'}</AppTableTd>
                      <AppTableTd>{s.department || '—'}</AppTableTd>
                      <AppTableTd>{s.employmentStatus || 'active'}</AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          )}
        </div>
      )}

      {/* ── CHAIRMAN EXPENSES ── */}
      {tab === 'expenses' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between no-print">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-[#134e4a]">Chairman Expenses</h3>
              {expenses.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">Total: <span className="font-bold text-slate-700">{formatNgn(expenseTotal)}</span></p>
              )}
            </div>
            <HrAddFormButton onClick={openAddExp}>+ Add Expense</HrAddFormButton>
          </div>
          {expensesError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{expensesError}</div>}
          {expensesLoading ? <p className="text-sm text-slate-500">Loading…</p> : (
            <AppTableWrap>
              <AppTable>
                <AppTableThead>
                  <AppTableTr>
                    <AppTableTh>Period</AppTableTh>
                    <AppTableTh>Type</AppTableTh>
                    <AppTableTh>Description</AppTableTh>
                    <AppTableTh>Vendor</AppTableTh>
                    <AppTableTh align="right">Qty</AppTableTh>
                    <AppTableTh align="right">Amount</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh className="no-print" />
                  </AppTableTr>
                </AppTableThead>
                <AppTableBody>
                  {!expenses.length && (
                    <AppTableTr>
                      <AppTableTd colSpan={8}><span className="text-slate-500">No expense records yet.</span></AppTableTd>
                    </AppTableTr>
                  )}
                  {expenses.map((x) => (
                    <AppTableTr key={x.id}>
                      <AppTableTd>{x.period || '—'}</AppTableTd>
                      <AppTableTd>{x.type}</AppTableTd>
                      <AppTableTd className="max-w-xs truncate">{x.description}</AppTableTd>
                      <AppTableTd>{x.vendor || '—'}</AppTableTd>
                      <AppTableTd align="right">{x.quantity}</AppTableTd>
                      <AppTableTd align="right">{formatNgn(x.amountNgn)}</AppTableTd>
                      <AppTableTd>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${FEE_STATUS_PILL[x.status] || FEE_STATUS_PILL.pending}`}>
                          {x.status}
                        </span>
                      </AppTableTd>
                      <AppTableTd className="no-print">
                        <div className="flex gap-2">
                          <button type="button" className="text-xs font-bold text-[#134e4a] hover:underline" onClick={() => openEditExp(x)}>Edit</button>
                          <button type="button" className="text-xs font-bold text-red-600 hover:underline" onClick={() => deleteExp(x.id)}>Delete</button>
                        </div>
                      </AppTableTd>
                    </AppTableTr>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableWrap>
          )}

          <HrFormModal isOpen={expModal} onClose={() => setExpModal(false)} title={expForm.id ? 'Edit Expense' : 'Add Expense'} size="md">
            <form onSubmit={saveExp} className="grid gap-3 sm:grid-cols-2">
              {expFormErr && <div className="sm:col-span-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{expFormErr}</div>}
              <label className="text-xs font-semibold text-slate-600">
                Period (e.g. Apr 2026)
                <input className={HR_FIELD_CLASS} value={expForm.period} onChange={(e) => setExpForm({ ...expForm, period: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Type
                <select className={HR_FIELD_CLASS} value={expForm.type} onChange={(e) => setExpForm({ ...expForm, type: e.target.value })}>
                  {EXPENSE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                Description
                <input className={HR_FIELD_CLASS} value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Vendor
                <input className={HR_FIELD_CLASS} value={expForm.vendor} onChange={(e) => setExpForm({ ...expForm, vendor: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Quantity
                <input type="number" min={1} className={HR_FIELD_CLASS} value={expForm.quantity} onChange={(e) => setExpForm({ ...expForm, quantity: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Amount (₦)
                <input type="number" min={0} className={HR_FIELD_CLASS} value={expForm.amountNgn} onChange={(e) => setExpForm({ ...expForm, amountNgn: e.target.value })} />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Status
                <select className={HR_FIELD_CLASS} value={expForm.status} onChange={(e) => setExpForm({ ...expForm, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                </select>
              </label>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setExpModal(false)} className={HR_BTN_SECONDARY}>Cancel</button>
                <button type="submit" className={HR_BTN_PRIMARY}>Save</button>
              </div>
            </form>
          </HrFormModal>
        </div>
      )}
    </div>
  );
}
