import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileText } from 'lucide-react';
import {
  createCaseRecoverySchedules,
  fetchCaseRecoverySchedules,
  fetchCaseResponsibility,
} from '../../lib/hrIncidents';
import { formatNgn } from '../../lib/hrFormat';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

function settlementLabel(p) {
  if (p.collectionChannel === 'cashier') {
    const account = p.treasuryAccountName ? ` → ${p.treasuryAccountName}` : '';
    return `Cashier collected ${formatNgn(p.amountNgn)} on ${p.paymentDateIso || p.createdAtIso?.slice(0, 10)}${account}`;
  }
  return `Paid ${formatNgn(p.amountNgn)} on ${p.paymentDateIso || p.createdAtIso?.slice(0, 10)}`;
}

export default function HrCaseRecoveryPanel({
  caseId,
  detail,
  responsibilityOk = false,
  onUpdated,
}) {
  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState([]);
  const [busy, setBusy] = useState(false);
  const [durationMonths, setDurationMonths] = useState('12');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const lossNgn = Math.round(Number(detail?.lossValueNgn) || 0);
  const isDeduction = detail?.decisionType === 'deduction';

  const load = useCallback(async () => {
    if (!caseId) return;
    setBusy(true);
    setErr('');
    const [schedRes, respRes] = await Promise.all([
      fetchCaseRecoverySchedules(caseId),
      fetchCaseResponsibility(caseId),
    ]);
    setBusy(false);
    if (schedRes.ok && schedRes.data?.ok) setRows(schedRes.data.schedules || []);
    else setRows([]);
    if (respRes.ok && respRes.data?.ok) setParties(respRes.data.parties || []);
    else setParties([]);
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load, detail?.decisionType, detail?.lossValueNgn]);

  const preview = useMemo(() => {
    const months = Math.max(1, Math.round(Number(durationMonths) || 12));
    return parties
      .filter((p) => String(p.userId || '').trim())
      .map((p) => {
        const weight = Number(p.responsibilityWeight) || 0;
        const total = Math.round((lossNgn * weight) / 100);
        const installment = total > 0 ? Math.max(1, Math.round(total / months)) : 0;
        return {
          userId: p.userId,
          name: p.staffDisplayName || p.userId,
          weight,
          total,
          installment,
        };
      })
      .filter((p) => p.total > 0);
  }, [parties, lossNgn, durationMonths]);

  const prerequisites = useMemo(() => {
    const items = [];
    if (!isDeduction) items.push({ ok: false, text: 'Apply sanction type “Salary deduction / recovery” first.' });
    else items.push({ ok: true, text: 'Salary deduction sanction is on file.' });
    if (lossNgn <= 0) items.push({ ok: false, text: 'Enter loss value (NGN) on the sanction form and save.' });
    else items.push({ ok: true, text: `Loss value set: ${formatNgn(lossNgn)}` });
    if (!responsibilityOk) {
      items.push({ ok: false, text: 'Complete the responsibility map (must total 100%) in Investigate phase.' });
    } else {
      items.push({ ok: true, text: `Responsibility map ready (${parties.length} staff)` });
    }
    return items;
  }, [isDeduction, lossNgn, responsibilityOk, parties.length]);

  const canInitiate = prerequisites.every((p) => p.ok) && preview.length > 0;

  const initiateRecovery = async () => {
    setErr('');
    setMsg('');
    if (!canInitiate) {
      setErr('Complete all checklist items before sending to the cashier desk.');
      return;
    }
    setBusy(true);
    const { ok, data } = await createCaseRecoverySchedules(caseId, {
      durationMonths: Math.max(1, Math.round(Number(durationMonths) || 12)),
      activate: true,
    });
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not create recovery schedules.');
      return;
    }
    setMsg(
      `Recovery sent to cashier desk for ${(data.schedules || []).length} staff member(s). They can now pay at Finance → Desk.`
    );
    await load();
    onUpdated?.();
  };

  if (!isDeduction && !rows.length) {
    return (
      <div className="space-y-2 border-t border-slate-200 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-slate-800">Recovery amount (HR initiates)</h4>
        <p className="text-xs text-slate-500">
          Choose sanction type <strong>Salary deduction / recovery</strong> to set what staff must repay. The branch
          cashier records actual payments.
        </p>
      </div>
    );
  }

  const needsInitiation = isDeduction && rows.length === 0;

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
          <strong>HR sets the amount owed</strong> below, then staff pay at the branch cashier. The cashier records
          payment date and which bank or cash account was credited — HR does not post payments here.
        </p>
        <p className="text-xs text-violet-900/80 flex items-center gap-1.5">
          <Building2 size={14} aria-hidden />
          Cashier desk: Finance → Desk → Staff recoveries
        </p>
      </div>

      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      {needsInitiation ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-4">
          <p className="text-sm font-semibold text-amber-950">Send recovery to cashier desk</p>
          <ul className="space-y-1.5 text-xs">
            {prerequisites.map((p) => (
              <li key={p.text} className={p.ok ? 'text-emerald-800' : 'text-amber-900 font-medium'}>
                {p.ok ? '✓' : '○'} {p.text}
              </li>
            ))}
          </ul>

          {canInitiate ? (
            <>
              <label className="block text-xs font-semibold text-slate-700">
                Repayment period (months)
                <input
                  type="number"
                  min={1}
                  max={60}
                  className={`mt-1 ${HR_FIELD_CLASS}`}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                />
              </label>
              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount per staff (HR sets)</p>
                {preview.map((p) => (
                  <div key={p.userId} className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-800">
                      {p.name} <span className="text-slate-500">({p.weight}%)</span>
                    </span>
                    <span className="tabular-nums font-bold text-[#134e4a]">
                      {formatNgn(p.total)}
                      <span className="text-xs font-normal text-slate-500 ml-1">
                        · {formatNgn(p.installment)}/mo
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <button type="button" disabled={busy} className={HR_BTN_PRIMARY} onClick={initiateRecovery}>
                {busy ? 'Creating…' : 'Create recovery & send to cashier desk'}
              </button>
            </>
          ) : (
            <p className="text-xs text-amber-900">
              Complete the checklist above, then return here to send amounts to the cashier desk.
            </p>
          )}
        </div>
      ) : null}

      {rows.length === 0 && !needsInitiation ? (
        <p className="text-xs text-slate-500">{busy ? 'Loading…' : 'No recovery schedules on this case.'}</p>
      ) : null}

      {rows.length > 0 ? (
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
      ) : null}

      <button type="button" className={HR_BTN_SECONDARY} onClick={load} disabled={busy}>
        Refresh
      </button>
    </div>
  );
}
