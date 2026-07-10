import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import {
  CONTRIBUTION_TYPES,
  fetchCaseResponsibility,
  RESPONSIBILITY_ROLES,
  saveCaseResponsibility,
} from '../../lib/hrIncidents';
import { HR_FIELD_CLASS } from './hrFormStyles';

export default function HrCaseResponsibilityPanel({ caseId, canManage, onSaved }) {
  const [parties, setParties] = useState([]);
  const [staff, setStaff] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!caseId) return;
    const { ok, data } = await fetchCaseResponsibility(caseId);
    if (ok && data?.ok) {
      setParties(
        (data.parties || []).map((p) => ({
          userId: p.userId,
          role: p.role,
          responsibilityWeight: p.responsibilityWeight,
          contributionType: p.contributionType,
          note: p.note || '',
        }))
      );
    }
  }, [caseId]);

  useEffect(() => {
    load();
    apiFetch('/api/hr/staff').then(({ ok, data }) => {
      if (ok && data?.ok) setStaff(data.staff || []);
    });
  }, [load]);

  const weightSum = useMemo(
    () => parties.reduce((s, p) => s + (Number(p.responsibilityWeight) || 0), 0),
    [parties]
  );

  const addParty = () => {
    setParties((prev) => [
      ...prev,
      { userId: '', role: 'custodian', responsibilityWeight: 0, contributionType: 'negligence', note: '' },
    ]);
  };

  const save = async () => {
    setErr('');
    setBusy(true);
    const { ok, data } = await saveCaseResponsibility(caseId, parties);
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not save responsibility map.');
      return;
    }
    await load();
    onSaved?.();
  };

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4 mt-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">Shared responsibility</h4>
        <span className={`text-xs font-medium ${Math.abs(weightSum - 100) < 0.01 ? 'text-emerald-700' : 'text-amber-800'}`}>
          Total: {weightSum.toFixed(1)}% (must equal 100%)
        </span>
      </div>
      {parties.map((p, idx) => (
        <div key={idx} className="grid gap-2 sm:grid-cols-4">
          <select
            className={HR_FIELD_CLASS}
            value={p.userId}
            disabled={!canManage}
            onChange={(e) => {
              const v = e.target.value;
              setParties((prev) => prev.map((x, i) => (i === idx ? { ...x, userId: v } : x)));
            }}
          >
            <option value="">Select staff…</option>
            {staff.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.displayName || s.userId}
              </option>
            ))}
          </select>
          <select
            className={HR_FIELD_CLASS}
            value={p.role}
            disabled={!canManage}
            onChange={(e) => {
              const v = e.target.value;
              setParties((prev) => prev.map((x, i) => (i === idx ? { ...x, role: v } : x)));
            }}
          >
            {RESPONSIBILITY_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            max={100}
            className={HR_FIELD_CLASS}
            disabled={!canManage}
            value={p.responsibilityWeight}
            onChange={(e) => {
              const v = Number(e.target.value);
              setParties((prev) => prev.map((x, i) => (i === idx ? { ...x, responsibilityWeight: v } : x)));
            }}
            placeholder="Weight %"
          />
          <select
            className={HR_FIELD_CLASS}
            value={p.contributionType}
            disabled={!canManage}
            onChange={(e) => {
              const v = e.target.value;
              setParties((prev) => prev.map((x, i) => (i === idx ? { ...x, contributionType: v } : x)));
            }}
          >
            {CONTRIBUTION_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <HrButton type="button" variant="secondary" onClick={addParty}>
            Add party
          </HrButton>
          <HrButton type="button" disabled={busy}  onClick={save}>
            Save responsibility map
          </HrButton>
        </div>
      ) : null}
    </div>
  );
}
