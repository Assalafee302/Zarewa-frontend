import React, { useEffect, useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { applyHrSalaryIncrement, fetchHrSalaryHistory } from '../../lib/hrStaff';
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

const fieldCls =
  'mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#134e4a] focus:outline-none focus:ring-2 focus:ring-[#134e4a]/15';

/**
 * @param {{ userId: string; staff: object; canViewAmounts: boolean; onUpdated?: () => void }} props
 */
export function HrSalaryIncrementPanel({ userId, staff, canViewAmounts, onUpdated }) {
  const [history, setHistory] = useState([]);
  const [effectiveFromIso, setEffectiveFromIso] = useState(new Date().toISOString().slice(0, 10));
  const [baseSalaryNgn, setBaseSalaryNgn] = useState('');
  const [housingAllowanceNgn, setHousingAllowanceNgn] = useState('');
  const [transportAllowanceNgn, setTransportAllowanceNgn] = useState('');
  const [salaryLevel, setSalaryLevel] = useState('');
  const [salaryStep, setSalaryStep] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!staff) return;
    setBaseSalaryNgn(staff.baseSalaryNgn != null ? String(staff.baseSalaryNgn) : '');
    setHousingAllowanceNgn(staff.housingAllowanceNgn != null ? String(staff.housingAllowanceNgn) : '');
    setTransportAllowanceNgn(staff.transportAllowanceNgn != null ? String(staff.transportAllowanceNgn) : '');
    setSalaryLevel(staff.salaryLevel != null ? String(staff.salaryLevel) : '');
    setSalaryStep(staff.salaryStep != null ? String(staff.salaryStep) : '1');
  }, [staff?.userId, staff?.baseSalaryNgn]);

  const { loading, reload } = useHrListLoad(async () => {
    const { ok, data } = await fetchHrSalaryHistory(userId);
    if (!ok || !data?.ok) {
      setHistory([]);
      return { error: data?.error || 'Could not load salary history.', hasData: false };
    }
    setHistory(data.history || []);
    return { hasData: true };
  }, [userId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canViewAmounts) {
      setError('Unlock sensitive HR access to record salary changes.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const { ok, data } = await applyHrSalaryIncrement(userId, {
      effectiveFromIso,
      reason: reason.trim(),
      payrollGroup: staff?.payrollGroup || staff?.profileExtra?.payrollGroup,
      salaryLevel: salaryLevel ? Number(salaryLevel) : undefined,
      salaryStep: salaryStep ? Number(salaryStep) : undefined,
      baseSalaryNgn: Number(baseSalaryNgn) || 0,
      housingAllowanceNgn: Number(housingAllowanceNgn) || 0,
      transportAllowanceNgn: Number(transportAllowanceNgn) || 0,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not apply increment.');
      return;
    }
    setMessage('Salary increment recorded. Recompute open payroll runs to reflect new amounts.');
    setReason('');
    await reload();
    onUpdated?.();
  };

  const prev = history[0];
  const prevBase = prev?.amountsRedacted ? null : prev?.baseSalaryNgn;
  const newBase = Number(baseSalaryNgn) || 0;
  const delta = prevBase != null && canViewAmounts ? newBase - Number(prevBase) : null;

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Record salary increment</h4>
        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        ) : null}
        {message ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {message}
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Effective from
            <input
              type="date"
              className={fieldCls}
              value={effectiveFromIso}
              onChange={(e) => setEffectiveFromIso(e.target.value)}
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            New base salary (₦)
            <input
              type="number"
              min={0}
              className={fieldCls}
              value={baseSalaryNgn}
              onChange={(e) => setBaseSalaryNgn(e.target.value)}
              disabled={!canViewAmounts}
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Housing (₦)
            <input
              type="number"
              min={0}
              className={fieldCls}
              value={housingAllowanceNgn}
              onChange={(e) => setHousingAllowanceNgn(e.target.value)}
              disabled={!canViewAmounts}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Transport (₦)
            <input
              type="number"
              min={0}
              className={fieldCls}
              value={transportAllowanceNgn}
              onChange={(e) => setTransportAllowanceNgn(e.target.value)}
              disabled={!canViewAmounts}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Level
            <input
              type="number"
              min={1}
              className={fieldCls}
              value={salaryLevel}
              onChange={(e) => setSalaryLevel(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Step
            <input
              type="number"
              min={1}
              className={fieldCls}
              value={salaryStep}
              onChange={(e) => setSalaryStep(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            Reason (audit trail)
            <input
              className={fieldCls}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual increment 2026, promotion to senior officer"
              required
              minLength={3}
            />
          </label>
        </div>
        {delta != null && delta !== 0 ? (
          <p className="text-xs font-semibold text-slate-600">
            Change vs last recorded: {delta > 0 ? '+' : ''}
            {formatNgn(delta)} ({((delta / Math.max(1, prevBase)) * 100).toFixed(1)}%)
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !canViewAmounts}
          className="rounded-xl bg-[#134e4a] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Apply increment'}
        </button>
      </form>

      <div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Salary history</h4>
        {loading && history.length === 0 ? (
          <p className="text-sm text-slate-600">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-600">No salary changes recorded yet.</p>
        ) : (
          <AppTableWrap>
            <AppTable role="numeric">
              <AppTableThead>
                <AppTableTh>Effective</AppTableTh>
                <AppTableTh>Level / step</AppTableTh>
                <AppTableTh align="right">Base</AppTableTh>
                <AppTableTh>Reason</AppTableTh>
              </AppTableThead>
              <AppTableBody>
                {history.map((h) => (
                  <AppTableTr key={h.id}>
                    <AppTableTd>{h.effectiveFromIso}</AppTableTd>
                    <AppTableTd>
                      {h.salaryLevel != null ? `L${h.salaryLevel}` : '—'}
                      {h.salaryStep != null ? ` / S${h.salaryStep}` : ''}
                    </AppTableTd>
                    <AppTableTd align="right">
                      {h.amountsRedacted || h.baseSalaryNgn == null ? '—' : formatNgn(h.baseSalaryNgn)}
                    </AppTableTd>
                    <AppTableTd title={h.reason}>{h.reason || '—'}</AppTableTd>
                  </AppTableTr>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableWrap>
        )}
      </div>
    </div>
  );
}
