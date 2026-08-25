import React, { useMemo, useState } from 'react';
import { HrFormModal } from './HrFormModal';
import { HrButton } from './hrPageUi';
import { HR_FIELD_CLASS } from './hrFormStyles';
import { bulkDeleteHrStaffPermanently } from '../../lib/hrStaffExtras';

const CONFIRM_PHRASE = 'DELETE';

/**
 * Confirm permanent removal of one or more staff from the directory.
 * @param {{
 *   isOpen: boolean;
 *   staff: object[];
 *   selectedIds: string[];
 *   onClose: () => void;
 *   onDone: (result: object) => void;
 *   layer?: 'default' | 'nested';
 * }} props
 */
export function HrStaffBulkDeleteModal({ isOpen, staff, selectedIds, onClose, onDone, layer = 'default' }) {
  const [reason, setReason] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(() => {
    const ids = new Set(selectedIds);
    return (staff || []).filter((s) => ids.has(s.userId));
  }, [staff, selectedIds]);

  const shown = selected.slice(0, 8);
  const extraCount = Math.max(0, selected.length - shown.length);

  const reset = () => {
    setReason('');
    setConfirmPhrase('');
    setError('');
    setBusy(false);
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const runDelete = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { ok, data } = await bulkDeleteHrStaffPermanently({
      userIds: selectedIds,
      reason: reason.trim(),
      confirmPhrase: confirmPhrase.trim(),
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setError(data?.error || 'Could not delete selected staff.');
      return;
    }
    if (!data.deleted) {
      const first = Array.isArray(data.errors) && data.errors[0]?.error;
      setError(first || 'Could not delete the selected staff. Reassign line managers first, and MD/admin accounts are protected.');
      return;
    }
    reset();
    onDone(data);
  };

  return (
    <HrFormModal
      isOpen={isOpen}
      onClose={close}
      title="Delete staff permanently"
      description="This removes the login and HR file. It cannot be undone."
      size="md"
      trackUnsaved={false}
      closeDisabled={busy}
      layer={layer}
    >
      <form onSubmit={runDelete} className="space-y-4">
        <p className="text-sm text-slate-700">
          For people who left the company, use <strong>Separation / exit</strong> on their profile so payroll and
          audit history stay. Permanent delete is for mistaken registrations, test logins, or duplicates that should
          never have existed.
        </p>
        <div className="rounded-md border border-red-200 bg-red-50/60 px-3 py-2">
          <p className="text-xs font-semibold text-red-800">
            {selectedIds.length} staff will be deleted
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-red-900">
            {shown.map((s) => (
              <li key={s.userId} className="truncate">
                {s.displayName || s.username || s.userId}
                {s.employeeNo ? <span className="text-red-700"> · {s.employeeNo}</span> : null}
              </li>
            ))}
            {extraCount ? <li className="text-xs text-red-700">and {extraCount} more</li> : null}
            {!shown.length ? (
              <li className="text-xs text-red-700">Selected staff are not on this page — they will still be deleted.</li>
            ) : null}
          </ul>
        </div>
        <label className="block text-xs font-semibold text-slate-700">
          Reason (required)
          <input
            className={`${HR_FIELD_CLASS} mt-1`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Duplicate import, test account, registered in error…"
            required
            minLength={3}
            disabled={busy}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          Type {CONFIRM_PHRASE} to confirm
          <input
            className={`${HR_FIELD_CLASS} mt-1 font-mono uppercase`}
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            required
            autoComplete="off"
            disabled={busy}
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <HrButton type="submit" variant="destructive" disabled={busy || selectedIds.length === 0}>
            {busy ? 'Deleting…' : `Delete ${selectedIds.length} permanently`}
          </HrButton>
          <HrButton type="button" variant="secondary" disabled={busy} onClick={close}>
            Cancel
          </HrButton>
        </div>
      </form>
    </HrFormModal>
  );
}
