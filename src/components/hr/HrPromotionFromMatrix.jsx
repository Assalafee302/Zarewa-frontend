import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { applyHrSalaryIncrement } from '../../lib/hrStaff';
import { formatNgn } from '../../lib/hrFormat';

const fieldCls =
  'mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/15';

/**
 * Apply matrix band amounts to staff compensation (promotion / step-up wizard).
 */
export function HrPromotionFromMatrix({ userId, staff, canViewAmounts, onUpdated }) {
  const [matrix, setMatrix] = useState([]);
  const [payrollGroup, setPayrollGroup] = useState(staff?.payrollGroup || 'branch_ops');
  const [salaryLevel, setSalaryLevel] = useState(String(staff?.salaryLevel ?? ''));
  const [salaryStep, setSalaryStep] = useState(String(staff?.salaryStep ?? '1'));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useHrListLoad(async () => {
    const { ok, data } = await apiFetch('/api/hr/salary-matrix');
    if (ok && data?.ok) setMatrix(data.matrix || []);
    return { hasData: true };
  }, []);

  const match = matrix.find(
    (r) =>
      String(r.payrollGroup) === payrollGroup &&
      Number(r.salaryLevel) === Number(salaryLevel) &&
      Number(r.salaryStep) === Number(salaryStep)
  );

  const apply = async (e) => {
    e.preventDefault();
    if (!canViewAmounts || !match) return;
    if (reason.trim().length < 3) {
      setMessage('Enter a reason (min 3 characters).');
      return;
    }
    setBusy(true);
    const { ok, data } = await applyHrSalaryIncrement(userId, {
      effectiveFromIso: new Date().toISOString().slice(0, 10),
      reason: reason.trim(),
      payrollGroup,
      salaryLevel: Number(salaryLevel),
      salaryStep: Number(salaryStep),
      baseSalaryNgn: match.baseSalaryNgn,
      housingAllowanceNgn: match.housingAllowanceNgn,
      transportAllowanceNgn: match.transportAllowanceNgn,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setMessage(data?.error || 'Could not apply matrix band.');
      return;
    }
    setMessage('Matrix band applied to profile.');
    onUpdated?.();
  };

  return (
    <form onSubmit={apply} className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Promotion from matrix</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">
          Payroll group
          <select className={fieldCls} value={payrollGroup} onChange={(e) => setPayrollGroup(e.target.value)}>
            <option value="branch_ops">Branch staff</option>
            <option value="mining_div">Mining</option>
            <option value="scholarship">Scholarship</option>
            <option value="chairman_staffs">Domestic</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Level
          <input className={fieldCls} value={salaryLevel} onChange={(e) => setSalaryLevel(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Step
          <input className={fieldCls} value={salaryStep} onChange={(e) => setSalaryStep(e.target.value)} />
        </label>
      </div>
      {match && canViewAmounts ? (
        <p className="text-sm text-slate-600">
          Matrix band: base {formatNgn(match.baseSalaryNgn)} + housing {formatNgn(match.housingAllowanceNgn)} + transport{' '}
          {formatNgn(match.transportAllowanceNgn)}
        </p>
      ) : (
        <p className="text-sm text-amber-800">No matrix row for this group/level/step — add it in HR Settings.</p>
      )}
      <label className="text-xs font-semibold text-slate-600 block">
        Reason
        <input className={fieldCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Promotion / step increment" />
      </label>
      <button
        type="submit"
        disabled={busy || !match || !canViewAmounts}
        className="rounded-xl bg-[#134e4a] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        Apply matrix band
      </button>
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
    </form>
  );
}
