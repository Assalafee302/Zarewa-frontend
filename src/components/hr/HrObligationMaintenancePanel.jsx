import React, { useState } from 'react';
import { formatNgn } from '../../lib/hrFormat';
import {
  chairmanWaiveObligation,
  maintainObligationAccount,
  patchObligationDeductionPause,
} from '../../lib/hrStaffObligations';
import { canChairmanWaiveObligation, canMaintainStaffObligations } from '../../lib/hrAccess';
import { useWorkspace } from '../../context/WorkspaceContext';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

/**
 * HR maintenance — pause/resume payroll deductions, adjust schedule, close, Chairman waiver.
 */
export function HrObligationMaintenancePanel({ account, onUpdated }) {
  const ws = useWorkspace();
  const permissions = ws?.permissions || ws?.session?.permissions || [];
  const roleKey = ws?.session?.roleKey || ws?.roleKey || '';
  const canMaintain = canMaintainStaffObligations(permissions);
  const canWaive = canChairmanWaiveObligation(permissions, roleKey);

  const [pauseReason, setPauseReason] = useState('');
  const [pauseUntil, setPauseUntil] = useState('');
  const [installment, setInstallment] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [maintNote, setMaintNote] = useState('');
  const [waiverNote, setWaiverNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!account || account.kind === 'recovery') return null;
  if (!canMaintain && !canWaive) return null;
  if (account.status !== 'active' && !(canWaive && account.principalOutstandingNgn > 0)) return null;

  const isPaused =
    account.status === 'active' &&
    account.principalOutstandingNgn > 0 &&
    account.deductionsActive === false;

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setMessage('');
    const r = await fn();
    setBusy(false);
    const data = r.data || r;
    if (!r.ok || !data?.ok) {
      setError(data?.error || 'Action failed.');
      return;
    }
    setMessage('Saved.');
    onUpdated?.(data.account);
  };

  const togglePause = async (pause) => {
    await run(() =>
      patchObligationDeductionPause(account.id, {
        pause,
        resume: !pause,
        reason: pause ? pauseReason.trim() : undefined,
        pauseUntilIso: pause && pauseUntil ? pauseUntil : undefined,
      })
    );
    if (pause) {
      setPauseReason('');
      setPauseUntil('');
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    const body = { note: maintNote.trim() || undefined };
    if (installment.trim()) body.installmentNgn = Math.round(Number(installment) || 0);
    if (termMonths.trim()) body.termMonths = Math.round(Number(termMonths) || 0);
    await run(() => maintainObligationAccount(account.id, body));
  };

  const closeLoan = async () => {
    if (!window.confirm('Write off remaining balance and close this obligation?')) return;
    await run(() =>
      maintainObligationAccount(account.id, {
        closeLoan: true,
        note: maintNote.trim() || 'Closed by HR',
      })
    );
  };

  const submitWaiver = async (e) => {
    e.preventDefault();
    if (!window.confirm('Chairman waiver will write off the full outstanding balance. Continue?')) return;
    await run(() => chairmanWaiveObligation(account.id, { note: waiverNote.trim() }));
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pt-3">
      <p className="text-[10px] font-bold uppercase text-slate-500">Account maintenance</p>
      {message ? <p className="text-xs font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {isPaused ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-bold">Payroll deductions paused</p>
          {account.pauseReason ? <p className="mt-1">{account.pauseReason}</p> : null}
          {account.pauseUntilIso ? (
            <p className="mt-1 text-amber-800">Until {String(account.pauseUntilIso).slice(0, 10)}</p>
          ) : (
            <p className="mt-1 text-amber-800">No end date — resume manually when ready.</p>
          )}
        </div>
      ) : null}

      {canMaintain && account.status === 'active' && account.principalOutstandingNgn > 0 ? (
        <div className="space-y-3">
          {!isPaused ? (
            <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-xs font-bold text-slate-700">Pause payroll deductions</p>
              <label className="block text-xs font-semibold text-slate-600">
                Reason
                <input
                  className={HR_FIELD_CLASS}
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="e.g. hardship — medical leave"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Resume on (optional)
                <input
                  type="date"
                  className={HR_FIELD_CLASS}
                  value={pauseUntil}
                  onChange={(e) => setPauseUntil(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busy || pauseReason.trim().length < 3}
                className={HR_BTN_SECONDARY}
                onClick={() => togglePause(true)}
              >
                Pause deductions
              </button>
            </div>
          ) : (
            <button type="button" disabled={busy} className={HR_BTN_PRIMARY} onClick={() => togglePause(false)}>
              Resume payroll deductions
            </button>
          )}

          <form onSubmit={submitAdjust} className="space-y-2 rounded-lg border border-slate-100 p-3">
            <p className="text-xs font-bold text-slate-700">Adjust schedule</p>
            <p className="text-[11px] text-slate-500">
              Lump-sum repayments do not change the monthly installment unless you adjust it here.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Monthly installment (₦)
                <input
                  type="number"
                  min={1}
                  className={HR_FIELD_CLASS}
                  value={installment}
                  onChange={(e) => setInstallment(e.target.value)}
                  placeholder={String(account.installmentNgn || '')}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Term (months)
                <input
                  type="number"
                  min={account.monthsPaid || 0}
                  className={HR_FIELD_CLASS}
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  placeholder={String(account.termMonths || '')}
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-600">
              Note
              <input className={HR_FIELD_CLASS} value={maintNote} onChange={(e) => setMaintNote(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={HR_BTN_SECONDARY}>
                Save adjustment
              </button>
              <button
                type="button"
                disabled={busy}
                className={HR_BTN_SECONDARY}
                onClick={() =>
                  run(() => maintainObligationAccount(account.id, { recalculateInstallment: true }))
                }
              >
                Recalculate monthly from balance
              </button>
              <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={closeLoan}>
                Close / write off
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {canWaive && account.principalOutstandingNgn > 0 ? (
        <form onSubmit={submitWaiver} className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/50 p-3">
          <p className="text-xs font-bold text-violet-900">Chairman waiver</p>
          <p className="text-[11px] text-violet-800">
            Waives {formatNgn(account.principalOutstandingNgn)} — for exceptional loans approved under Chairman policy.
          </p>
          <label className="block text-xs font-semibold text-slate-600">
            Waiver note
            <textarea
              className={`${HR_FIELD_CLASS} min-h-[56px]`}
              value={waiverNote}
              onChange={(e) => setWaiverNote(e.target.value)}
              required
              minLength={3}
              placeholder="Board / Chairman approval reference"
            />
          </label>
          <button type="submit" disabled={busy || waiverNote.trim().length < 3} className={HR_BTN_PRIMARY}>
            Waive balance
          </button>
        </form>
      ) : null}
    </div>
  );
}
