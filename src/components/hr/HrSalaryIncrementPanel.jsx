import React, { useEffect, useState } from 'react';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { applyHrSalaryIncrement, fetchHrSalaryHistory } from '../../lib/hrStaff';
import { fetchDraftPayrollRuns, recomputePayrollRun } from '../../lib/hrExtended';
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

/**
 * @param {{ userId: string; staff: object; canViewAmounts: boolean; onUpdated?: () => void }} props
 */
export function HrSalaryIncrementPanel({ userId, staff, canViewAmounts, onUpdated }) {
  const [modalOpen, setModalOpen] = useState(false);
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
  const [draftRuns, setDraftRuns] = useState([]);
  const [recomputeBusy, setRecomputeBusy] = useState(false);

  useEffect(() => {
    if (!staff) return;
    setBaseSalaryNgn(staff.baseSalaryNgn != null ? String(staff.baseSalaryNgn) : '');
    setHousingAllowanceNgn(staff.housingAllowanceNgn != null ? String(staff.housingAllowanceNgn) : '');
    setTransportAllowanceNgn(staff.transportAllowanceNgn != null ? String(staff.transportAllowanceNgn) : '');
    setSalaryLevel(staff.salaryLevel != null ? String(staff.salaryLevel) : '');
    setSalaryStep(staff.salaryStep != null ? String(staff.salaryStep) : '1');
  }, [staff?.userId, staff?.baseSalaryNgn]);

  useHrListLoad(async () => {
    const { ok, data } = await fetchDraftPayrollRuns();
    if (ok && data?.ok) setDraftRuns(data.runs || []);
    return { hasData: true };
  }, []);

  const recomputeDrafts = async () => {
    if (!draftRuns.length) return;
    setRecomputeBusy(true);
    let okCount = 0;
    for (const run of draftRuns) {
      const { ok, data } = await recomputePayrollRun(run.id);
      if (ok && data?.ok) okCount += 1;
    }
    setRecomputeBusy(false);
    setMessage(`Recomputed ${okCount} draft payroll run(s).`);
  };

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
    setMessage('Salary increment recorded.');
    setModalOpen(false);
    const { ok: drOk, data: drData } = await fetchDraftPayrollRuns();
    if (drOk && drData?.ok) setDraftRuns(drData.runs || []);
    setReason('');
    await reload();
    onUpdated?.();
  };

  const prev = history[0];
  const prevBase = prev?.amountsRedacted ? null : prev?.baseSalaryNgn;
  const newBase = Number(baseSalaryNgn) || 0;
  const delta = prevBase != null && canViewAmounts ? newBase - Number(prevBase) : null;

  // Promotion eligibility: find most recent entry where reason mentions 'promotion'
  const lastPromoEntry = history.find((h) => /promotion/i.test(h.reason || ''));
  const yearsFromLastPromo = lastPromoEntry?.effectiveFromIso
    ? (Date.now() - new Date(lastPromoEntry.effectiveFromIso).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    : null;
  const nextEligibleDate = lastPromoEntry?.effectiveFromIso
    ? new Date(new Date(lastPromoEntry.effectiveFromIso).getTime() + 3 * 365.25 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;
  const isManagement = /manager|director|head|chief/i.test(staff?.jobTitle || '');
  const suggestedIncrement = isManagement ? '35%' : '25%';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Salary history</h4>
        {canViewAmounts ? (
          <HrAddFormButton onClick={() => setModalOpen(true)}>Record increment</HrAddFormButton>
        ) : null}
      </div>

      {/* Promotion eligibility notice */}
      {history.length > 0 && (
        yearsFromLastPromo != null ? (
          yearsFromLastPromo < 3 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Not yet eligible for regular promotion (next eligible: {nextEligibleDate}). Suggested increment: {suggestedIncrement}.
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              ✓ Eligible for regular promotion. Suggested increment: {suggestedIncrement}.
            </div>
          )
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            ✓ No prior promotion on record — eligible for promotion. Suggested increment: {suggestedIncrement}.
          </div>
        )
      )}

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record salary increment" size="lg">
        <form onSubmit={submit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Effective from
              <input
                type="date"
                className={HR_FIELD_CLASS}
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
                className={HR_FIELD_CLASS}
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
                className={HR_FIELD_CLASS}
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
                className={HR_FIELD_CLASS}
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
                className={HR_FIELD_CLASS}
                value={salaryLevel}
                onChange={(e) => setSalaryLevel(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Step
              <input
                type="number"
                min={1}
                className={HR_FIELD_CLASS}
                value={salaryStep}
                onChange={(e) => setSalaryStep(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Reason (audit trail)
              <input
                className={HR_FIELD_CLASS}
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
          <button type="submit" disabled={busy || !canViewAmounts} className={HR_BTN_PRIMARY}>
            {busy ? 'Saving…' : 'Apply increment'}
          </button>
        </form>
      </HrFormModal>

      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
          {draftRuns.length ? (
            <button
              type="button"
              disabled={recomputeBusy}
              onClick={recomputeDrafts}
              className="mt-2 block rounded-lg bg-[#134e4a] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {recomputeBusy ? 'Recomputing…' : `Recompute ${draftRuns.length} draft payroll run(s)`}
            </button>
          ) : null}
        </div>
      ) : null}

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
  );
}
