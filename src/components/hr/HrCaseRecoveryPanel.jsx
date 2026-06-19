import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileText } from 'lucide-react';
import { fetchCaseRecoverySchedules } from '../../lib/hrIncidents';
import { formatNgn } from '../../lib/hrFormat';
import { HR_BTN_SECONDARY } from './hrFormStyles';

function settlementLabel(p) {
  if (p.collectionChannel === 'cashier') {
    const account = p.treasuryAccountName ? ` → ${p.treasuryAccountName}` : '';
    return `Cashier collected ${formatNgn(p.amountNgn)} on ${p.paymentDateIso || p.createdAtIso?.slice(0, 10)}${account}`;
  }
  return `Paid ${formatNgn(p.amountNgn)} on ${p.paymentDateIso || p.createdAtIso?.slice(0, 10)}`;
}

export default function HrCaseRecoveryPanel({ caseId, detail, onUpdated }) {
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
        <h4 className="text-sm font-semibold text-slate-800">Recovery amount (HR initiates)</h4>
        <p className="text-xs text-slate-500">
          Apply a salary deduction decision to set what the staff member must repay. The branch cashier records
          actual payments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">Recovery amount (HR initiates)</h4>
        <Link to="/hr/payroll" className="text-xs font-bold text-[#134e4a] hover:underline">
          Open payroll →
        </Link>
      </div>

      <div className="rounded-xl border border-violet-200 bg-violet-50/40 px-4 py-3 space-y-2">
        <p className="text-xs text-violet-950 leading-relaxed">
          <strong>HR sets the amount owed</strong> when you apply the sanction. Issue the salary recovery letter, then
          send the staff member to the branch cashier. The cashier records the payment date and which bank or cash
          account was credited — you do not post payments here.
        </p>
        <p className="text-xs text-violet-900/80 flex items-center gap-1.5">
          <Building2 size={14} aria-hidden />
          Cashier desk: Finance → Desk → Staff recoveries
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">{busy ? 'Loading…' : 'No recovery schedules yet — apply a deduction decision first.'}</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {rows.map((s) => {
            const onCashierDesk = s.status === 'active' && Number(s.principalOutstandingNgn) > 0;
            return (
              <li key={s.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{s.staffDisplayName || s.userId}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      HR initiated {formatNgn(s.totalAmountNgn)}
                      {s.initiatedByName ? ` · by ${s.initiatedByName}` : ''}
                      {s.activatedAtIso ? ` · ${s.activatedAtIso.slice(0, 10)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Still due</p>
                    <p className="text-xl font-black tabular-nums text-[#134e4a]">
                      {formatNgn(s.principalOutstandingNgn)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatNgn(s.installmentAmountNgn)}/mo payroll · {s.status}
                    </p>
                  </div>
                </div>

                {onCashierDesk ? (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    <FileText size={12} aria-hidden />
                    On branch cashier desk — awaiting payment
                  </p>
                ) : null}

                {(s.settlements || []).length ? (
                  <ul className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600 space-y-1.5">
                    <li className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Payments recorded</li>
                    {(s.settlements || []).map((p) => (
                      <li key={p.id} className="flex flex-wrap gap-x-2">
                        <span>{settlementLabel(p)}</span>
                        {p.note ? <span className="text-slate-400">— {p.note}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : onCashierDesk ? (
                  <p className="mt-2 text-xs text-slate-500">No cashier payment recorded yet.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className={HR_BTN_SECONDARY} onClick={load} disabled={busy}>
        Refresh
      </button>
    </div>
  );
}
