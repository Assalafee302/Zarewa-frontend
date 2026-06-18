import React, { useCallback, useEffect, useState } from 'react';
import {
  applyCaseDecision,
  DECISION_TYPE_OPTIONS,
  fetchCaseClosureCheck,
} from '../../lib/hrIncidents';
import { mapManagementDecisionToType } from '../../lib/hrAccountabilityStageProgress';
import { patchDisciplineCase } from '../../lib/hrDisciplineCases';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

export default function HrCaseClosureChecklist({ caseId, canManage, detail, recoveryCount = 0, onUpdated }) {
  const [check, setCheck] = useState({ ok: false, blockers: [] });
  const [decisionType, setDecisionType] = useState(detail?.decisionType || '');
  const [lossValueNgn, setLossValueNgn] = useState(detail?.lossValueNgn ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const decisionApplied =
    Boolean(detail?.decisionType) &&
    (detail.decisionType !== 'deduction' || recoveryCount > 0 || detail.status === 'action_issued');

  const refresh = useCallback(async () => {
    const { ok, data } = await fetchCaseClosureCheck(caseId);
    if (ok && data?.ok !== undefined) setCheck({ ok: data.ok, blockers: data.blockers || [] });
  }, [caseId]);

  useEffect(() => {
    refresh();
  }, [refresh, detail?.status, detail?.decisionType, recoveryCount]);

  useEffect(() => {
    if (detail?.decisionType) {
      setDecisionType(detail.decisionType);
    } else if (detail?.managementDecision) {
      const mapped = mapManagementDecisionToType(detail.managementDecision);
      if (mapped) setDecisionType(mapped);
    }
    if (detail?.lossValueNgn != null) setLossValueNgn(detail.lossValueNgn);
  }, [detail?.decisionType, detail?.managementDecision, detail?.lossValueNgn]);

  const saveLoss = async () => {
    setBusy(true);
    const { ok, data } = await patchDisciplineCase(caseId, { lossValueNgn: Number(lossValueNgn) || 0 });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not save loss value.');
      return;
    }
    onUpdated?.();
    await refresh();
  };

  const applyDecision = async () => {
    if (decisionApplied) return;
    setErr('');
    setBusy(true);
    const { ok, data } = await applyCaseDecision(caseId, { decisionType });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not apply decision.');
      return;
    }
    onUpdated?.();
    await refresh();
  };

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

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4 mt-4">
      <h4 className="text-sm font-semibold text-slate-800">Closure checklist</h4>
      <ul className="text-sm space-y-1">
        {(check.blockers?.length ? check.blockers : ['All closure requirements met']).map((b, i) => (
          <li key={i} className={check.ok ? 'text-emerald-700' : 'text-amber-900'}>
            {check.ok ? '✓' : '○'} {b}
          </li>
        ))}
      </ul>
      {canManage ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="number"
            className={HR_FIELD_CLASS}
            placeholder="Loss value (NGN)"
            value={lossValueNgn}
            onChange={(e) => setLossValueNgn(e.target.value)}
          />
          <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={saveLoss}>
            Save loss value
          </button>
          <select
            className={HR_FIELD_CLASS}
            value={decisionType}
            disabled={decisionApplied}
            onChange={(e) => setDecisionType(e.target.value)}
          >
            <option value="">Decision type…</option>
            {DECISION_TYPE_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !decisionType || decisionApplied}
            className={HR_BTN_SECONDARY}
            onClick={applyDecision}
          >
            {decisionApplied ? 'Decision already applied' : 'Apply decision (triggers payroll/letter)'}
          </button>
          {decisionApplied ? (
            <p className="sm:col-span-2 text-xs text-emerald-800 rounded-lg bg-emerald-50 border border-emerald-100 p-2">
              Structured decision <strong>{detail.decisionType}</strong> is on file
              {recoveryCount > 0 ? ` with ${recoveryCount} recovery schedule(s)` : ''}.
              Issue required letters above, then close.
            </p>
          ) : null}
          {!decisionApplied && decisionType === 'deduction' && Number(lossValueNgn) > 0 ? (
            <p className="sm:col-span-2 text-xs text-slate-600 rounded-lg bg-slate-50 p-2">
              <strong>Step 2 of 2:</strong> After recording management approval in Workflow, choose{' '}
              <em>Salary deduction / recovery</em> here and apply. This creates payroll schedules and draft recovery
              letters for each responsible party. Submit, approve, and <strong>issue</strong> each letter before close.
            </p>
          ) : null}
          <button type="button" disabled={busy || !check.ok} className={HR_BTN_PRIMARY} onClick={closeCase}>
            Close case
          </button>
        </div>
      ) : null}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
    </div>
  );
}
