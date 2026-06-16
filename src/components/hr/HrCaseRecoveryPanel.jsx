import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCaseRecoverySchedules } from '../../lib/hrIncidents';
import { formatNgn } from '../../lib/hrFormat';
import { HR_BTN_SECONDARY } from './hrFormStyles';

export default function HrCaseRecoveryPanel({ caseId, detail }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!caseId) return;
    setBusy(true);
    const { ok, data } = await fetchCaseRecoverySchedules(caseId);
    setBusy(false);
    if (ok && data?.ok) setRows(data.schedules || []);
    else setRows([]);
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load, detail?.decisionType]);

  if (!detail?.decisionType && !rows.length) {
    return (
      <div className="space-y-2 border-t border-slate-200 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-slate-800">Payroll recovery</h4>
        <p className="text-xs text-slate-500">Apply a salary deduction decision to generate recovery schedules.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">Payroll recovery schedules</h4>
        <Link to="/hr/payroll" className="text-xs font-bold text-[#134e4a] hover:underline">
          Open payroll →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">{busy ? 'Loading…' : 'No schedules yet — apply a deduction decision first.'}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((s) => (
            <li key={s.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 flex flex-wrap justify-between gap-2">
              <span>{s.userId}</span>
              <span className="tabular-nums">
                {formatNgn(s.installmentAmountNgn)}/mo · outstanding {formatNgn(s.principalOutstandingNgn)} · {s.status}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={HR_BTN_SECONDARY} onClick={load} disabled={busy}>
        Refresh schedules
      </button>
    </div>
  );
}
