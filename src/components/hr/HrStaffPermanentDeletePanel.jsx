import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteHrStaffPermanently } from '../../lib/hrStaffExtras';
import { HR_FIELD_CLASS } from './hrFormStyles';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';

/**
 * @param {{
 *   staff: { userId: string; displayName?: string; username?: string; employeeNo?: string };
 *   onDeleted?: () => void;
 *   redirectAfterDelete?: boolean;
 * }} props
 */
export function HrStaffPermanentDeletePanel({ staff, onDeleted, redirectAfterDelete = true }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmUsername, setConfirmUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const username = staff?.username || '';
  const displayName = staff?.displayName || staff?.userId || 'Staff';

  const runDelete = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { ok, data } = await deleteHrStaffPermanently(staff.userId, {
      reason: reason.trim(),
      confirmUsername: confirmUsername.trim(),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not delete staff account.');
      return;
    }
    onDeleted?.();
    if (redirectAfterDelete) {
      navigate(HR_EMPLOYEES, { replace: true });
    }
  };

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50/40 p-4 sm:p-5">
      <div className="flex gap-2">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-black uppercase tracking-widest text-red-800">Permanent removal</h4>
          <p className="mt-2 text-sm text-red-900/90">
            For staff who <strong>left the company</strong>, use <strong>Separation / exit</strong> above — that keeps
            payroll and audit history. Permanent delete is only for mistaken registrations, test logins, or duplicate
            accounts that should never have existed.
          </p>
          <p className="mt-2 text-xs text-red-800/80">
            This removes the login, HR profile, documents, and operational HR rows. It cannot be undone. MD and admin
            accounts are protected.
          </p>
          {!open ? (
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-800 hover:bg-red-50"
              onClick={() => setOpen(true)}
            >
              <Trash2 size={14} aria-hidden />
              Delete staff completely…
            </button>
          ) : (
            <form onSubmit={runDelete} className="mt-4 space-y-3 rounded-xl border border-red-200 bg-white p-4">
              <p className="text-sm font-semibold text-red-900">
                Delete {displayName}
                {username ? <span className="font-normal text-red-700"> ({username})</span> : null} permanently?
              </p>
              <label className="block text-xs font-semibold text-slate-700">
                Reason (required)
                <input
                  className={`${HR_FIELD_CLASS} mt-1`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Duplicate import, test account, registered in error…"
                  required
                  minLength={3}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Type login username to confirm
                <span className="ml-1 font-mono text-ui-xs text-red-700">{username || '—'}</span>
                <input
                  className={`${HR_FIELD_CLASS} mt-1 font-mono`}
                  value={confirmUsername}
                  onChange={(e) => setConfirmUsername(e.target.value)}
                  placeholder={username || 'username'}
                  required
                  autoComplete="off"
                />
              </label>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl border border-red-600 bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? 'Deleting…' : 'Delete permanently'}
                </button>
                <HrButton
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setOpen(false);
                    setReason('');
                    setConfirmUsername('');
                    setError('');
                  }}
                >
                  Cancel
                </HrButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
