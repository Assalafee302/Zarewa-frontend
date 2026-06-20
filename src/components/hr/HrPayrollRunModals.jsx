import React, { useEffect, useMemo, useState } from 'react';
import { ModalFrame } from '../layout/ModalFrame';
import { formatNgn } from '../../lib/hrFormat';
import {
  PAYROLL_MONTH_NAMES,
  formatPayrollPeriodLabel,
  parsePayrollPeriod,
  periodYyyymmFromParts,
  payrollPeriodsInUse,
} from '../../lib/hrPayroll';
import { currentPeriodYyyymm } from '../../lib/hrRequests';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

const MODAL_PANEL =
  'z-modal-panel w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-4 shadow-xl max-h-[min(92dvh,720px)] overflow-y-auto sm:p-6';

/** Generic yes/no confirmation popup for payroll actions. */
export function HrPayrollConfirmModal({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmTone = 'primary',
  busy = false,
  onConfirm,
  children,
}) {
  if (!isOpen) return null;
  const confirmCls =
    confirmTone === 'danger'
      ? `${HR_BTN_PRIMARY} bg-red-800 hover:bg-red-900`
      : confirmTone === 'purple'
        ? `${HR_BTN_PRIMARY} bg-purple-800 hover:bg-purple-900`
        : HR_BTN_PRIMARY;

  return (
    <ModalFrame isOpen={isOpen} onClose={busy ? undefined : onClose} title={title} surface="plain">
      <div className={MODAL_PANEL}>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        {children ? <div className={description ? 'mt-4' : ''}>{children}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className={HR_BTN_SECONDARY}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={confirmCls}>
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

/** Start a new monthly payroll run — month name + year (one run per month). */
export function HrPayrollStartRunModal({ isOpen, onClose, runs = [], busy = false, onSubmit }) {
  const usedPeriods = useMemo(() => payrollPeriodsInUse(runs), [runs]);
  const current = parsePayrollPeriod(currentPeriodYyyymm());
  const [year, setYear] = useState(current?.year || new Date().getFullYear());
  const [month, setMonth] = useState(current?.month || new Date().getMonth() + 1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const c = parsePayrollPeriod(currentPeriodYyyymm());
    setYear(c?.year || new Date().getFullYear());
    setMonth(c?.month || new Date().getMonth() + 1);
    setNotes('');
  }, [isOpen]);

  const periodYyyymm = periodYyyymmFromParts(year, month);
  const periodTaken = periodYyyymm && usedPeriods.has(periodYyyymm);
  const periodLabel = periodYyyymm ? formatPayrollPeriodLabel(periodYyyymm) : '';

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!periodYyyymm || periodTaken) return;
    onSubmit({ periodYyyymm, notes: notes.trim() || undefined });
  };

  if (!isOpen) return null;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      title="Start monthly payroll"
      description="One payroll run per calendar month for branch, HQ admin, and mining staff."
      surface="plain"
    >
      <form className={MODAL_PANEL} onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Month
            <select
              className={HR_FIELD_CLASS}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              required
            >
              {PAYROLL_MONTH_NAMES.map((name, i) => {
                const m = i + 1;
                const yyyymm = periodYyyymmFromParts(year, m);
                const taken = yyyymm && usedPeriods.has(yyyymm);
                return (
                  <option key={name} value={m} disabled={taken}>
                    {name}
                    {taken ? ' (already started)' : ''}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Year
            <select className={HR_FIELD_CLASS} value={year} onChange={(e) => setYear(Number(e.target.value))} required>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        {periodTaken ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {periodLabel} already has a payroll run. Choose another month or open the existing run.
          </p>
        ) : periodLabel ? (
          <p className="mt-3 text-xs text-slate-600">
            You are starting payroll for <strong className="text-slate-800">{periodLabel}</strong>.
          </p>
        ) : null}

        <label className="mt-4 block text-xs font-semibold text-slate-600">
          Notes <span className="font-normal text-slate-400">(optional)</span>
          <textarea
            className={`${HR_FIELD_CLASS} min-h-[72px] resize-y font-medium text-gray-800`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. includes new hires from Kaduna"
          />
        </label>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className={HR_BTN_SECONDARY}>
            Cancel
          </button>
          <button type="submit" disabled={busy || periodTaken || !periodYyyymm} className={HR_BTN_PRIMARY}>
            {busy ? 'Creating…' : 'Start payroll'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

/** Adjust PAYE for one staff member on a draft run. */
export function HrPayrollPayeAdjustModal({ isOpen, onClose, line, busy = false, onSave }) {
  const [taxNgn, setTaxNgn] = useState('');

  useEffect(() => {
    if (isOpen && line) {
      setTaxNgn(String(Math.round(Number(line.taxNgn) || 0)));
    }
  }, [isOpen, line]);

  if (!isOpen || !line) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(line.userId, Math.round(Number(taxNgn) || 0));
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      title="Adjust PAYE"
      description={line.displayName || line.userId}
      surface="plain"
    >
      <form className={MODAL_PANEL} onSubmit={handleSubmit}>
        <label className="text-xs font-semibold text-slate-600">
          Monthly PAYE (₦)
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className={HR_FIELD_CLASS}
            value={taxNgn}
            onChange={(e) => setTaxNgn(e.target.value)}
            required
            autoFocus
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">Fixed monthly PAYE from the staff profile. Adjust here only for this run.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className={HR_BTN_SECONDARY}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
            {busy ? 'Saving…' : 'Save PAYE'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

/** Mark payroll paid and post treasury movement. */
export function HrPayrollMarkPaidModal({
  isOpen,
  onClose,
  run,
  totals,
  bankTreasuryAccounts = [],
  treasuryAccountId,
  onTreasuryAccountChange,
  busy = false,
  onConfirm,
}) {
  if (!isOpen || !run) return null;

  const netTotal = totals && !totals.amountsRedacted ? totals.netTotalNgn : null;
  const periodLabel = formatPayrollPeriodLabel(run.periodYyyymm);

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      title="Post payroll payment"
      description={`Mark ${periodLabel} as paid and record treasury outflow.`}
      surface="plain"
    >
      <div className={MODAL_PANEL}>
        {netTotal != null ? (
          <p className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
            Net payable: <strong className="tabular-nums">{formatNgn(netTotal)}</strong>
          </p>
        ) : null}

        {bankTreasuryAccounts.length ? (
          <label className="mt-4 block text-xs font-semibold text-slate-600">
            Pay from account
            <select
              className={HR_FIELD_CLASS}
              value={treasuryAccountId}
              onChange={(e) => onTreasuryAccountChange?.(e.target.value)}
              aria-label="Treasury account for payroll payout"
            >
              {bankTreasuryAccounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name || a.bankName || `Account ${a.id}`}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Add a treasury bank account in Finance, or set a default under Payroll → Statutory.
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className={HR_BTN_SECONDARY}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !treasuryAccountId}
            className={`${HR_BTN_PRIMARY} bg-emerald-700 hover:bg-emerald-800`}
          >
            {busy ? 'Posting…' : 'Mark paid & post treasury'}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
