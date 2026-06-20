import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';
import { updateStaffProbation } from '../../lib/hrStaffDirectoryApi';
import { isOnProbation, isProbationEndingSoon, probationBadge } from '../../lib/hrStaffDirectoryUi';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import { HrCard } from './hrPageUi';

/**
 * Guided probation confirm / extend workflow for employee profiles.
 */
export function HrStaffProbationPanel({ staff, canManage, onUpdated }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [note, setNote] = useState('');

  if (!staff) return null;
  const onProbation = isOnProbation(staff);
  const endingSoon = isProbationEndingSoon(staff);
  const status = staff.profileExtra?.probationStatus;
  const badge = probationBadge(staff);
  const confirmed = status === 'confirmed' || (!onProbation && staff.profileExtra?.probationConfirmedAtIso);

  if (!onProbation && !endingSoon && !confirmed && !staff.probationEndIso) return null;

  const run = async (action) => {
    setBusy(action);
    setErr('');
    const body = { action, note: note.trim() || undefined };
    if (action === 'extend') body.newEndIso = extendDate;
    const { ok, data } = await updateStaffProbation(staff.userId, body);
    setBusy('');
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Probation update failed.');
      return;
    }
    setNote('');
    onUpdated?.(data);
  };

  return (
    <HrCard
      title="Probation"
      subtitle="Confirm employment or extend probation before issuing confirmation letters."
    >
      <div className="space-y-3 text-sm">
        {badge ? (
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${badge.cls}`}>
            {badge.label}
          </span>
        ) : null}
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Probation end</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{staff.probationEndIso || '—'}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-400">Status</dt>
            <dd className="mt-0.5 font-medium text-slate-800">
              {confirmed ? 'Confirmed' : status === 'extended' ? 'Extended' : onProbation ? 'Active' : 'Ended'}
            </dd>
          </div>
        </dl>
        {confirmed ? (
          <p className="flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 size={14} aria-hidden />
            Confirmed {staff.profileExtra?.probationConfirmedAtIso ? `on ${staff.profileExtra.probationConfirmedAtIso}` : ''}
          </p>
        ) : null}
        {canManage && (onProbation || endingSoon) ? (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <label className="block text-xs font-semibold text-slate-600">
              Note (optional)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className={`${HR_FIELD_CLASS} mt-1`}
                placeholder="Reason for confirmation or extension…"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={HR_BTN_PRIMARY}
                disabled={!!busy}
                onClick={() => {
                  if (!window.confirm(`Confirm ${staff.displayName} has completed probation?`)) return;
                  run('confirm');
                }}
              >
                {busy === 'confirm' ? 'Confirming…' : 'Confirm probation'}
              </button>
              <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                <Clock size={14} aria-hidden />
                Extend to
                <input
                  type="date"
                  value={extendDate}
                  onChange={(e) => setExtendDate(e.target.value)}
                  className={HR_FIELD_CLASS}
                />
                <button
                  type="button"
                  className={HR_BTN_SECONDARY}
                  disabled={!!busy || !extendDate}
                  onClick={() => run('extend')}
                >
                  {busy === 'extend' ? 'Saving…' : 'Extend'}
                </button>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              After confirmation, issue a{' '}
              <Link to="/hr/letters?template=confirmation" className="font-bold text-[#134e4a] hover:underline">
                confirmation letter
              </Link>
              .
            </p>
            {err ? <p className="text-xs text-red-700">{err}</p> : null}
          </div>
        ) : null}
      </div>
    </HrCard>
  );
}
