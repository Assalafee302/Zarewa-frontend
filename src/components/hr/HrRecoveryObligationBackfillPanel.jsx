import React, { useState } from 'react';
import { backfillRecoveryObligations } from '../../lib/hrStaffObligations';
import { HrAlert, HrCard, HrButton, HrAddButton } from './hrPageUi';
import { HR_BTN_SECONDARY } from './hrFormStyles';

/**
 * One-time / maintenance backfill of discipline recovery schedules into the obligation ledger.
 */
export function HrRecoveryObligationBackfillPanel() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const res = await backfillRecoveryObligations();
    setBusy(false);
    const data = res.data || res;
    if (!res.ok || !data?.ok) {
      setError(data?.error || 'Backfill failed.');
      return;
    }
    if (data.tablesNotReady) {
      setMessage('Obligation ledger not ready on this server — run migrations first.');
      return;
    }
    setMessage(`Done — created ${data.created ?? 0}, already linked ${data.skipped ?? 0}.`);
  };

  return (
    <HrCard
      title="Recovery obligation backfill"
      subtitle="Link existing discipline recovery schedules to the unified staff obligation ledger."
    >
      {error ? (
        <div className="mb-3">
          <HrAlert tone="error">{error}</HrAlert>
        </div>
      ) : null}
      {message ? (
        <div className="mb-3">
          <HrAlert tone="success">{message}</HrAlert>
        </div>
      ) : null}
      <p className="text-sm text-slate-600">
        Safe to run more than once — schedules already linked are skipped.
      </p>
      <button type="button" onClick={run} disabled={busy} className={`mt-3 ${HR_BTN_SECONDARY}`}>
        {busy ? 'Running…' : 'Backfill recovery obligations'}
      </button>
    </HrCard>
  );
}
