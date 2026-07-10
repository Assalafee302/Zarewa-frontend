import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useCallback, useEffect, useState } from 'react';
import { fetchCaseClosureCheck } from '../../lib/hrIncidents';
import { patchDisciplineCase } from '../../lib/hrDisciplineCases';
import { HR_BTN_PRIMARY } from './hrFormStyles';

/**
 * @param {{ variant?: 'close' | 'full' }} props — `close` shows checklist + close button only (sanction is phase 3).
 */
export default function HrCaseClosureChecklist({
  caseId,
  canManage,
  detail,
  recoveryCount = 0,
  onUpdated,
  variant = 'close',
}) {
  const [check, setCheck] = useState({ ok: false, blockers: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    const { ok, data } = await fetchCaseClosureCheck(caseId);
    if (ok && data?.ok !== undefined) setCheck({ ok: data.ok, blockers: data.blockers || [] });
  }, [caseId]);

  useEffect(() => {
    refresh();
  }, [refresh, detail?.status, detail?.decisionType, recoveryCount]);

  const closeCase = async () => {
    setErr('');
    setBusy(true);
    const { ok, data } = await patchDisciplineCase(caseId, { action: 'close' });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || (data?.blockers || []).join(' ') || 'Could not close case.');
      return;
    }
    onUpdated?.();
  };

  if (variant !== 'close') {
    return null;
  }

  return (
    <div className="space-y-3">
      <ul className="text-sm space-y-1">
        {(check.blockers?.length ? check.blockers : ['All closure requirements met']).map((b, i) => (
          <li key={i} className={check.ok ? 'text-emerald-700' : 'text-amber-900'}>
            {check.ok ? '✓' : '○'} {b}
          </li>
        ))}
      </ul>
      {canManage ? (
        <HrButton type="button" disabled={busy || !check.ok}  onClick={closeCase}>
          {busy ? 'Closing…' : 'Close case'}
        </HrButton>
      ) : null}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
    </div>
  );
}
