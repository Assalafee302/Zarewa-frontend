import { useEffect, useState } from 'react';
import { applyCaseDecision, DECISION_TYPE_OPTIONS } from '../../lib/hrIncidents';
import { mapManagementDecisionToType } from '../../lib/hrAccountabilityStageProgress';
import { patchDisciplineCase } from '../../lib/hrDisciplineCases';
import { HrCard } from './hrPageUi';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';
import HrCaseRecoveryPanel from './HrCaseRecoveryPanel';
import HrCasePartyLettersPanel from './HrCasePartyLettersPanel';

/**
 * Phase 3 — one place for management decision, apply sanction, recovery, and letters.
 */
export default function HrCaseSanctionPhase({
  caseId,
  detail,
  canManage,
  canApprove,
  recoveryCount,
  onUpdated,
  workflow,
  setWorkflow,
}) {
  const [decisionType, setDecisionType] = useState(detail?.decisionType || '');
  const [lossValueNgn, setLossValueNgn] = useState(detail?.lossValueNgn ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const decisionApplied =
    Boolean(detail?.decisionType) &&
    (detail.decisionType !== 'deduction' || recoveryCount > 0 || detail.status === 'action_issued');

  useEffect(() => {
    if (detail?.decisionType) {
      setDecisionType(detail.decisionType);
    } else if (workflow.managementDecision) {
      const mapped = mapManagementDecisionToType(workflow.managementDecision);
      if (mapped) setDecisionType(mapped);
    }
    if (detail?.lossValueNgn != null) setLossValueNgn(detail.lossValueNgn);
  }, [detail?.decisionType, detail?.lossValueNgn, workflow.managementDecision]);

  useEffect(() => {
    if (!decisionApplied && workflow.managementDecision) {
      const mapped = mapManagementDecisionToType(workflow.managementDecision);
      if (mapped && !decisionType) setDecisionType(mapped);
    }
  }, [workflow.managementDecision, decisionApplied, decisionType]);

  const applySanction = async () => {
    setErr('');
    setMsg('');
    if (!workflow.managementDecision.trim()) {
      setErr('Enter the management decision in plain language first.');
      return;
    }
    if (!decisionType) {
      setErr('Choose a sanction type (warning, deduction, suspension, etc.).');
      return;
    }
    setBusy(true);

    const patchRes = await patchDisciplineCase(caseId, {
      managementDecision: workflow.managementDecision.trim(),
      sanction: workflow.sanction.trim(),
      lossValueNgn: Number(lossValueNgn) || 0,
    });
    if (!patchRes.ok || !patchRes.data?.ok) {
      setBusy(false);
      setErr(patchRes.data?.error || 'Could not save management decision.');
      return;
    }

    if (!decisionApplied) {
      const { ok, data } = await applyCaseDecision(caseId, { decisionType });
      setBusy(false);
      if (!ok || !data?.ok) {
        setErr(data?.error || 'Could not apply sanction (payroll / letters).');
        onUpdated?.();
        return;
      }
      setMsg('Sanction applied — recovery schedules and draft letters were created where needed.');
    } else {
      setBusy(false);
      setMsg('Management decision updated on file.');
    }
    onUpdated?.();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
        <strong>One action:</strong> write what management decided, pick the sanction type, then click{' '}
        <em>Apply sanction</em>. This saves the narrative and triggers payroll recovery + draft letters (no separate
        “apply decision” step elsewhere).
      </p>

      {canManage ? (
        <HrCard title="Management sanction" subtitle="Decision in plain language + structured type for payroll">
          {msg ? <p className="text-sm text-emerald-800 mb-2">{msg}</p> : null}
          {err ? <p className="text-sm text-red-700 mb-2">{err}</p> : null}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600">
              Management decision
              <textarea
                className={`${HR_FIELD_CLASS} min-h-[72px] mt-1`}
                value={workflow.managementDecision}
                onChange={(e) => setWorkflow({ ...workflow, managementDecision: e.target.value })}
                placeholder="e.g. Salary deduction per responsibility map — recover ₦250,000 over 6 months"
                disabled={decisionApplied}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Sanction label (optional)
              <input
                className={HR_FIELD_CLASS}
                value={workflow.sanction}
                onChange={(e) => setWorkflow({ ...workflow, sanction: e.target.value })}
                placeholder="e.g. Written warning + recovery"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-600">
                Loss value (NGN)
                <input
                  type="number"
                  className={HR_FIELD_CLASS}
                  value={lossValueNgn}
                  onChange={(e) => setLossValueNgn(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Sanction type
                <select
                  className={HR_FIELD_CLASS}
                  value={decisionType}
                  disabled={decisionApplied}
                  onChange={(e) => setDecisionType(e.target.value)}
                >
                  <option value="">Select type…</option>
                  {DECISION_TYPE_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {decisionApplied ? (
              <p className="text-xs text-emerald-800 rounded-lg bg-emerald-50 border border-emerald-100 p-2">
                Sanction <strong>{detail.decisionType}</strong> is on file
                {recoveryCount > 0 ? ` · ${recoveryCount} recovery schedule(s)` : ''}. Issue letters in phase 4 to close.
              </p>
            ) : (
              <button
                type="button"
                disabled={busy || !decisionType}
                className={HR_BTN_PRIMARY}
                onClick={applySanction}
              >
                {busy ? 'Applying…' : 'Apply sanction'}
              </button>
            )}
          </div>
        </HrCard>
      ) : null}

      {decisionApplied && canManage ? (
        <HrCaseRecoveryPanel caseId={caseId} detail={detail} canManage={canManage} onUpdated={onUpdated} />
      ) : null}

      {(canManage || canApprove) && (detail.relatedLetters?.length || detail.relatedLetterIds?.length) ? (
        <HrCasePartyLettersPanel
          detail={detail}
          canManage={canManage}
          canApprove={canApprove}
          onUpdated={onUpdated}
        />
      ) : null}
    </div>
  );
}
