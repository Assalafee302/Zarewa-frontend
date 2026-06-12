import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { formatNgn } from '../../lib/hrFormat';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';
import {
  AppTable,
  AppTableBody,
  AppTableTd,
  AppTableTh,
  AppTableThead,
  AppTableTr,
  AppTableWrap,
} from '../ui/AppDataTable';

const GROUPS = [
  { value: 'branch_ops', label: 'Branch staff' },
  { value: 'mining_div', label: 'Mining division' },
  { value: 'hq_admin', label: 'HQ administrative' },
  { value: 'scholarship', label: 'Scholarship beneficiary' },
  { value: 'chairman_staffs', label: 'Domestic staff' },
];

export function HrSalaryMatrixPanel() {
  const [modalOpen, setModalOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [formErr, setFormErr] = useState('');
  const [form, setForm] = useState({
    payrollGroup: 'branch_ops',
    salaryLevel: '5',
    salaryStep: '1',
    baseSalaryNgn: '',
    housingAllowanceNgn: '',
    transportAllowanceNgn: '',
    notes: '',
  });

  const { loading, error, setError, reload: load } = useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/salary-matrix');
    if (!ok || !data?.ok) {
      setRows([]);
      return { error: data?.error || 'Could not load salary matrix.', hasData: false };
    }
    setRows(data.matrix || []);
    return { hasData: true };
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMessage('');
    setFormErr('');
    const { ok, data } = await apiFetch('/api/hr/salary-matrix', {
      method: 'PUT',
      body: JSON.stringify({
        payrollGroup: form.payrollGroup,
        salaryLevel: Number(form.salaryLevel),
        salaryStep: Number(form.salaryStep),
        baseSalaryNgn: Number(form.baseSalaryNgn) || 0,
        housingAllowanceNgn: Number(form.housingAllowanceNgn) || 0,
        transportAllowanceNgn: Number(form.transportAllowanceNgn) || 0,
        notes: form.notes.trim() || null,
      }),
    });
    if (!ok || !data?.ok) {
      setFormErr(data?.error || 'Could not save matrix row.');
      return;
    }
    setMessage('Matrix row saved.');
    setModalOpen(false);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-slate-600 max-w-2xl">
          HQ salary level and step amounts by payroll group. Assign level/step on staff profiles; payroll recompute uses
          profile base salary today (matrix informs planning).
        </p>
        <HrAddFormButton onClick={() => setModalOpen(true)}>Add / update row</HrAddFormButton>
      </div>

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add / update matrix row" size="lg">
        <form onSubmit={save} className="space-y-3">
          {formErr ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{formErr}</div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={form.payrollGroup}
              onChange={(e) => setForm((f) => ({ ...f, payrollGroup: e.target.value }))}
              className={HR_FIELD_CLASS}
            >
              {GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              placeholder="Level"
              value={form.salaryLevel}
              onChange={(e) => setForm((f) => ({ ...f, salaryLevel: e.target.value }))}
              className={HR_FIELD_CLASS}
            />
            <input
              type="number"
              min={1}
              placeholder="Step"
              value={form.salaryStep}
              onChange={(e) => setForm((f) => ({ ...f, salaryStep: e.target.value }))}
              className={HR_FIELD_CLASS}
            />
            <input
              type="number"
              placeholder="Base salary ₦"
              value={form.baseSalaryNgn}
              onChange={(e) => setForm((f) => ({ ...f, baseSalaryNgn: e.target.value }))}
              className={HR_FIELD_CLASS}
            />
            <input
              type="number"
              placeholder="Housing ₦"
              value={form.housingAllowanceNgn}
              onChange={(e) => setForm((f) => ({ ...f, housingAllowanceNgn: e.target.value }))}
              className={HR_FIELD_CLASS}
            />
            <input
              type="number"
              placeholder="Transport ₦"
              value={form.transportAllowanceNgn}
              onChange={(e) => setForm((f) => ({ ...f, transportAllowanceNgn: e.target.value }))}
              className={HR_FIELD_CLASS}
            />
          </div>
          <button type="submit" className={HR_BTN_PRIMARY}>
            Save row
          </button>
        </form>
      </HrFormModal>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-600">Loading matrix…</p> : null}
      {!loading ? (
        <AppTableWrap>
          <AppTable role="numeric">
            <AppTableThead>
              <AppTableTh>Group</AppTableTh>
              <AppTableTh>Level</AppTableTh>
              <AppTableTh>Step</AppTableTh>
              <AppTableTh align="right">Base</AppTableTh>
              <AppTableTh align="right">Housing</AppTableTh>
              <AppTableTh align="right">Transport</AppTableTh>
            </AppTableThead>
            <AppTableBody>
              {rows.length === 0 ? (
                <AppTableTr>
                  <AppTableTd colSpan={6} align="center">
                    <span className="text-slate-500 py-4 block">No matrix rows yet.</span>
                  </AppTableTd>
                </AppTableTr>
              ) : (
                rows.map((r) => (
                  <AppTableTr key={r.id}>
                    <AppTableTd>{r.payrollGroup}</AppTableTd>
                    <AppTableTd>{r.salaryLevel}</AppTableTd>
                    <AppTableTd>{r.salaryStep}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(r.baseSalaryNgn)}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(r.housingAllowanceNgn)}</AppTableTd>
                    <AppTableTd align="right">{formatNgn(r.transportAllowanceNgn)}</AppTableTd>
                  </AppTableTr>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableWrap>
      ) : null}
    </div>
  );
}
