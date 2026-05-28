import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatNgn } from '../../lib/hrFormat';
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
  { value: 'scholarship', label: 'Scholarship / school' },
  { value: 'chairman_staffs', label: 'Domestic staff' },
];

export function HrSalaryMatrixPanel() {
  const ws = useWorkspace();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    payrollGroup: 'branch_ops',
    salaryLevel: '5',
    salaryStep: '1',
    baseSalaryNgn: '',
    housingAllowanceNgn: '',
    transportAllowanceNgn: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiFetch('/api/hr/salary-matrix');
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not load salary matrix.');
      setRows([]);
    } else {
      setRows(data.matrix || []);
      setError('');
    }
    setLoading(false);
  }, [ws?.refreshEpoch]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setMessage('');
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
      setError(data?.error || 'Could not save matrix row.');
      return;
    }
    setMessage('Matrix row saved.');
    await load();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        HQ salary level and step amounts by payroll group. Assign level/step on staff profiles; payroll recompute uses
        profile base salary today (matrix informs planning).
      </p>
      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Add / update row</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select
            value={form.payrollGroup}
            onChange={(e) => setForm((f) => ({ ...f, payrollGroup: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            placeholder="Step"
            value={form.salaryStep}
            onChange={(e) => setForm((f) => ({ ...f, salaryStep: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Base salary ₦"
            value={form.baseSalaryNgn}
            onChange={(e) => setForm((f) => ({ ...f, baseSalaryNgn: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Housing ₦"
            value={form.housingAllowanceNgn}
            onChange={(e) => setForm((f) => ({ ...f, housingAllowanceNgn: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Transport ₦"
            value={form.transportAllowanceNgn}
            onChange={(e) => setForm((f) => ({ ...f, transportAllowanceNgn: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={save}
          className="mt-3 rounded-xl bg-[#134e4a] px-4 py-2 text-[11px] font-bold uppercase text-white"
        >
          Save row
        </button>
      </div>

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
