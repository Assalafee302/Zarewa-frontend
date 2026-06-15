import React, { useEffect, useState } from 'react';
import { applyCaseDecision, DECISION_TYPE_OPTIONS, fetchCaseClosureCheck } from '../../lib/hrIncidents';
import { patchDisciplineCase } from '../../lib/hrDisciplineCases';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

export default function HrCaseClosureChecklist({ caseId, canManage, detail, onUpdated }) {
  const [check, setCheck] = useState({ ok: false, blockers: [] });
  const [decisionType, setDecisionType] = useState(detail?.decisionType || '');
  const [lossValueNgn, setLossValueNgn] = useState(detail?.lossValueNgn ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const refresh = async () => {
    const { ok, data } = await fetchCaseClosureCheck(caseId);
    if (ok && data?.ok !== undefined) setCheck({ ok: data.ok, blockers: data.blockers || [] });
  };

  useEffect(() => {
    refresh();
  }, [caseId, detail?.status, detail?.decisionType]);

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
          <select className={HR_FIELD_CLASS} value={decisionType} onChange={(e) => setDecisionType(e.target.value)}>
            <option value="">Decision type…</option>
            {DECISION_TYPE_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <button type="button" disabled={busy || !decisionType} className={HR_BTN_SECONDARY} onClick={applyDecision}>
            Apply decision (triggers payroll/letter)
          </button>
          <button type="button" disabled={busy || !check.ok} className={HR_BTN_PRIMARY} onClick={closeCase}>
            Close case
          </button>
        </div>
      ) : null}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
    </div>
  );
}
