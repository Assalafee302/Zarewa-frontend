import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { applyHrSalaryIncrement } from '../../lib/hrStaff';
import { formatNgn } from '../../lib/hrFormat';
import { HrAddFormButton, HrFormModal } from './HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';

/**
 * Apply matrix band amounts to staff compensation (promotion / step-up wizard).
 */
export function HrPromotionFromMatrix({ userId, staff, canViewAmounts, onUpdated }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [matrix, setMatrix] = useState([]);
  const [payrollGroup, setPayrollGroup] = useState(staff?.payrollGroup || 'branch_ops');
  const [salaryLevel, setSalaryLevel] = useState(String(staff?.salaryLevel ?? ''));
  const [salaryStep, setSalaryStep] = useState(String(staff?.salaryStep ?? '1'));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [formErr, setFormErr] = useState('');

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
    setFormErr('');
    if (!canViewAmounts || !match) return;
    if (reason.trim().length < 3) {
      setFormErr('Enter a reason (min 3 characters).');
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
      setFormErr(data?.error || 'Could not apply matrix band.');
      return;
    }
    setMessage('Matrix band applied to profile.');
    setModalOpen(false);
    setReason('');
    onUpdated?.();
  };

  if (!canViewAmounts) return null;

  return (
    <div className="space-y-2">
      <HrAddFormButton onClick={() => setModalOpen(true)}>Promotion from matrix</HrAddFormButton>
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Promotion from matrix" size="md">
        <form onSubmit={apply} className="space-y-3">
          {formErr ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{formErr}</div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-slate-600">
              Payroll group
              <select className={HR_FIELD_CLASS} value={payrollGroup} onChange={(e) => setPayrollGroup(e.target.value)}>
                <option value="branch_ops">Branch staff</option>
                <option value="mining_div">Mining</option>
                <option value="scholarship">Executive family</option>
                <option value="chairman_staffs">Domestic</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Level
              <input className={HR_FIELD_CLASS} value={salaryLevel} onChange={(e) => setSalaryLevel(e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Step
              <input className={HR_FIELD_CLASS} value={salaryStep} onChange={(e) => setSalaryStep(e.target.value)} />
            </label>
          </div>
          {match ? (
            <p className="text-sm text-slate-600">
              Matrix band: base {formatNgn(match.baseSalaryNgn)} + housing {formatNgn(match.housingAllowanceNgn)} + transport{' '}
              {formatNgn(match.transportAllowanceNgn)}
            </p>
          ) : (
            <p className="text-sm text-amber-800">No matrix row for this group/level/step — add it in HR Settings.</p>
          )}
          <label className="text-xs font-semibold text-slate-600 block">
            Reason
            <input className={HR_FIELD_CLASS} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Promotion / step increment" />
          </label>
          <button type="submit" disabled={busy || !match} className={HR_BTN_PRIMARY}>
            Apply matrix band
          </button>
        </form>
      </HrFormModal>
    </div>
  );
}
