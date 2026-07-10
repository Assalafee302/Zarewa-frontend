import { useEffect, useMemo, useState } from 'react';
import { applyCaseDecision, DECISION_TYPE_OPTIONS } from '../../lib/hrIncidents';
import { mapManagementDecisionToType } from '../../lib/hrAccountabilityStageProgress';
import { patchDisciplineCase } from '../../lib/hrDisciplineCases';
import { HrCard, HrButton, HrAddButton, HR_BTN_PRIMARY } from './hrPageUi';
import { HR_FIELD_CLASS } from './hrFormStyles';
import HrCaseRecoveryPanel from './HrCaseRecoveryPanel';
import HrCasePartyLettersPanel from './HrCasePartyLettersPanel';

/**
 * Phase 3 — management decision, apply sanction, recovery initiation, and letters.
 */
export default function HrCaseSanctionPhase({
  caseId,
  detail,
  canManage,
  canApprove,
  recoveryCount,
  responsibilityOk = false,
  onUpdated,
  workflow,
  setWorkflow,
}) {
  const [decisionType, setDecisionType] = useState(detail?.decisionType || '');
  const [lossValueNgn, setLossValueNgn] = useState(detail?.lossValueNgn ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const isDeduction = decisionType === 'deduction' || detail?.decisionType === 'deduction';
  const recoveryReady = recoveryCount > 0;

  const decisionApplied =
    Boolean(detail?.decisionType) && (detail.decisionType !== 'deduction' || recoveryReady);

  const deductionPrereqs = useMemo(() => {
    if (!isDeduction) return [];
    const loss = Math.round(Number(lossValueNgn) || 0);
    const items = [];
    if (!workflow.managementDecision.trim()) {
      items.push('Write the management decision in plain language.');
    }
    if (loss <= 0) items.push('Enter loss value (NGN) — this drives how much each staff repays.');
    if (!responsibilityOk) {
      items.push('Complete the responsibility map (100%) in the Investigate phase.');
    }
    return items;
  }, [isDeduction, lossValueNgn, workflow.managementDecision, responsibilityOk]);

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

  const saveSanctionFields = async () => {
    setErr('');
    setMsg('');
    setBusy(true);
    const patchRes = await patchDisciplineCase(caseId, {
      managementDecision: workflow.managementDecision.trim(),
      sanction: workflow.sanction.trim(),
      lossValueNgn: Number(lossValueNgn) || 0,
    });
    setBusy(false);
    if (!patchRes.ok || !patchRes.data?.ok) {
      setErr(patchRes.data?.error || 'Could not save sanction details.');
      return false;
    }
    return true;
  };

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
    if (isDeduction && deductionPrereqs.length) {
      setErr(deductionPrereqs.join(' '));
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

    if (!detail?.decisionType || (detail.decisionType === 'deduction' && !recoveryReady)) {
      const { ok, data } = await applyCaseDecision(caseId, { decisionType });
      setBusy(false);
      if (!ok || !data?.ok) {
        setErr(data?.error || 'Could not apply sanction (payroll / letters).');
        onUpdated?.();
        return;
      }
      if (decisionType === 'deduction') {
        const created = (data.actions || []).find((a) => a.kind === 'recovery_schedules');
        const count = created?.schedules?.length || 0;
        setMsg(
          count > 0
            ? `Recovery created for ${count} staff — now on the branch cashier desk.`
            : 'Sanction saved. Use “Create recovery & send to cashier desk” below if needed.'
        );
      } else {
        setMsg('Sanction applied — draft letters were created where needed.');
      }
    } else {
      setBusy(false);
      setMsg('Sanction details saved.');
    }
    onUpdated?.();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
        <strong>HR sets what is owed;</strong> the branch cashier records payment (date + bank/cash account). Write the
        management decision, pick sanction type, enter loss value for recoveries, then apply. Recovery amounts are sent
        to the cashier desk in the panel below.
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
                Loss value (NGN) {isDeduction ? <span className="text-amber-800">*</span> : null}
                <input
                  type="number"
                  min={0}
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
                  disabled={decisionApplied && !isDeduction}
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

            {isDeduction && !recoveryReady && deductionPrereqs.length ? (
              <ul className="text-xs text-amber-900 rounded-lg bg-amber-50 border border-amber-100 p-2 space-y-1">
                {deductionPrereqs.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
            ) : null}

            {decisionApplied && detail?.decisionType !== 'deduction' ? (
              <p className="text-xs text-emerald-800 rounded-lg bg-emerald-50 border border-emerald-100 p-2">
                Sanction <strong>{detail.decisionType}</strong> is on file. Issue letters in phase 4 to close.
              </p>
            ) : null}

            {isDeduction && recoveryReady ? (
              <p className="text-xs text-emerald-800 rounded-lg bg-emerald-50 border border-emerald-100 p-2">
                Recovery active — {recoveryCount} schedule(s) on cashier desk. Issue salary recovery letters in phase 4.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {!decisionApplied || (isDeduction && !recoveryReady) ? (
                <button
                  type="button"
                  disabled={busy || !decisionType || (isDeduction && deductionPrereqs.length > 0)}
                  className={HR_BTN_PRIMARY}
                  onClick={applySanction}
                >
                  {busy ? 'Saving…' : isDeduction ? 'Save sanction & prepare recovery' : 'Apply sanction'}
                </button>
              ) : null}
              <HrButton
                type="button"
                disabled={busy}
                variant="secondary"
                onClick={async () => {
                  const ok = await saveSanctionFields();
                  if (ok) {
                    setMsg('Sanction details saved.');
                    onUpdated?.();
                  }
                }}
              >
                {busy ? 'Saving…' : 'Save changes'}
              </HrButton>
            </div>
          </div>
        </HrCard>
      ) : null}

      {canManage && isDeduction ? (
        <HrCaseRecoveryPanel
          caseId={caseId}
          detail={{ ...detail, lossValueNgn: Number(lossValueNgn) || detail?.lossValueNgn }}
          responsibilityOk={responsibilityOk}
          onUpdated={onUpdated}
        />
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
