import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCaseRecoverySchedules, settleRecoverySchedule } from '../../lib/hrIncidents';
import { formatNgn } from '../../lib/hrFormat';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from './hrFormStyles';

const EMPTY_SETTLE = {
  amountNgn: '',
  payInFull: true,
  paymentReference: '',
  paymentDateIso: new Date().toISOString().slice(0, 10),
  note: '',
};

function RecoverySettleForm({ schedule, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    ...EMPTY_SETTLE,
    amountNgn: String(schedule.principalOutstandingNgn || ''),
    payInFull: true,
  });

  useEffect(() => {
    if (form.payInFull) {
      setForm((prev) => ({ ...prev, amountNgn: String(schedule.principalOutstandingNgn || '') }));
    }
  }, [form.payInFull, schedule.principalOutstandingNgn]);

  return (
    <form
      className="mt-3 rounded-lg border border-teal-100 bg-white p-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          payInFull: form.payInFull,
          amountNgn: form.payInFull ? undefined : Number(form.amountNgn) || 0,
          paymentReference: form.paymentReference.trim() || undefined,
          paymentDateIso: form.paymentDateIso || undefined,
          note: form.note.trim() || undefined,
        });
      }}
    >
      <p className="text-xs font-semibold text-slate-700">Record direct payment (cash / transfer)</p>
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={form.payInFull}
          onChange={(e) => setForm({ ...form, payInFull: e.target.checked })}
        />
        Pay full outstanding ({formatNgn(schedule.principalOutstandingNgn)})
      </label>
      {!form.payInFull ? (
        <input
          type="number"
          min={1}
          max={schedule.principalOutstandingNgn}
          className={HR_FIELD_CLASS}
          placeholder="Partial amount (NGN)"
          value={form.amountNgn}
          onChange={(e) => setForm({ ...form, amountNgn: e.target.value })}
          required
        />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="date"
          className={HR_FIELD_CLASS}
          value={form.paymentDateIso}
          onChange={(e) => setForm({ ...form, paymentDateIso: e.target.value })}
        />
        <input
          className={HR_FIELD_CLASS}
          placeholder="Payment reference / receipt no."
          value={form.paymentReference}
          onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
        />
      </div>
      <input
        className={HR_FIELD_CLASS}
        placeholder="Note (optional)"
        value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>
          {busy ? 'Saving…' : 'Record payment'}
        </button>
        <button type="button" disabled={busy} className={HR_BTN_SECONDARY} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function HrCaseRecoveryPanel({ caseId, detail, canManage, onUpdated }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [settleId, setSettleId] = useState('');

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

  const submitSettlement = async (scheduleId, body) => {
    setErr('');
    setMsg('');
    setBusy(true);
    const { ok, data } = await settleRecoverySchedule(scheduleId, body);
    setBusy(false);
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Could not record payment.');
      return;
    }
    setSettleId('');
    setMsg('Payment recorded. Payroll deductions stop automatically when balance is cleared.');
    await load();
    onUpdated?.();
  };

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
      <p className="text-xs text-slate-500">
        Monthly payroll deducts installments automatically. Staff may also pay cash or transfer — record that here to
        reduce or clear the balance and stop further deductions.
      </p>
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">{busy ? 'Loading…' : 'No schedules yet — apply a deduction decision first.'}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((s) => {
            const canSettle =
              canManage &&
              s.status === 'active' &&
              Number(s.principalOutstandingNgn) > 0 &&
              s.deductionsActive !== false;
            return (
              <li key={s.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium text-slate-800">{s.staffDisplayName || s.userId}</span>
                  <span className="tabular-nums text-slate-600">
                    {formatNgn(s.installmentAmountNgn)}/mo · outstanding {formatNgn(s.principalOutstandingNgn)} ·{' '}
                    {s.status}
                  </span>
                </div>
                {(s.settlements || []).length ? (
                  <ul className="mt-2 text-xs text-slate-600 space-y-1">
                    {(s.settlements || []).map((p) => (
                      <li key={p.id}>
                        Paid {formatNgn(p.amountNgn)} on {p.paymentDateIso || p.createdAtIso?.slice(0, 10)}
                        {p.paymentReference ? ` · ${p.paymentReference}` : ''}
                        {p.note ? ` — ${p.note}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {canSettle ? (
                  settleId === s.id ? (
                    <RecoverySettleForm
                      schedule={s}
                      busy={busy}
                      onCancel={() => setSettleId('')}
                      onSubmit={(body) => submitSettlement(s.id, body)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-teal-800 hover:underline"
                      onClick={() => {
                        setSettleId(s.id);
                        setErr('');
                        setMsg('');
                      }}
                    >
                      Record lump-sum / direct payment
                    </button>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" className={HR_BTN_SECONDARY} onClick={load} disabled={busy}>
        Refresh schedules
      </button>
    </div>
  );
}
