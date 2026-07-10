import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { recordGatePassEvent } from '../../lib/hrIncidents';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_CARD, HR_INPUT, HR_MUTED, HR_SECTION_TITLE } from './hrPageUi';

export default function HrGatePassLogPanel({ canManage }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    passDateIso: new Date().toISOString().slice(0, 10),
    direction: 'out',
    personnelSummary: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      const { ok, data } = await apiFetch('/api/security/gate-pass-events');
      if (!ok || !data?.ok) {
        setErr(data?.error || 'Failed to load gate pass log');
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.events) ? data.events : []);
    } catch (e) {
      setErr(e?.message || 'Failed to load gate pass log');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setBusy(true);
    setErr('');
    try {
      const { ok, data } = await recordGatePassEvent(form);
      if (!ok || !data?.ok) {
        setErr(data?.error || 'Failed to record gate pass');
        return;
      }
      setForm({
        passDateIso: new Date().toISOString().slice(0, 10),
        direction: 'out',
        personnelSummary: '',
        notes: '',
      });
      await load();
    } catch (ex) {
      setErr(ex?.message || 'Failed to record gate pass');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={HR_CARD}>
      <h3 className={`${HR_SECTION_TITLE} mb-3`}>Gate pass log</h3>
      {err ? <p className="text-red-600 text-sm mb-2">{err}</p> : null}
      {canManage ? (
        <form onSubmit={submit} className="grid gap-2 mb-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Pass date
            <input type="date" className={HR_INPUT} value={form.passDateIso} onChange={(ev) => setForm((f) => ({ ...f, passDateIso: ev.target.value }))} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Direction
            <select className={HR_INPUT} value={form.direction} onChange={(ev) => setForm((f) => ({ ...f, direction: ev.target.value }))} aria-label="Gate pass direction">
              <option value="out">Exit (out)</option>
              <option value="in">Entry (in)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Personnel / asset summary
            <input className={HR_INPUT} placeholder="Who or what passed through" value={form.personnelSummary} onChange={(ev) => setForm((f) => ({ ...f, personnelSummary: ev.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Notes
            <input className={HR_INPUT} placeholder="Optional notes" value={form.notes} onChange={(ev) => setForm((f) => ({ ...f, notes: ev.target.value }))} />
          </label>
          <button type="submit" className={HR_BTN_PRIMARY} disabled={busy}>Record pass</button>
        </form>
      ) : null}
      <ul className="space-y-2 text-sm max-h-64 overflow-auto">
        {rows.map((r) => (
          <li key={r.id} className="border-b border-slate-100 pb-2">
            <span className="font-medium">{r.direction}</span>
            {r.pass_date_iso ? ` · ${r.pass_date_iso}` : ''}
            {r.personnel_summary ? ` — ${r.personnel_summary}` : ''}
            {r.created_at_iso ? <span className={HR_MUTED}> · {r.created_at_iso.slice(0, 16)}</span> : null}
          </li>
        ))}
        {!rows.length && !busy ? <li className={HR_MUTED}>No gate pass entries.</li> : null}
      </ul>
      <button type="button" className={`${HR_BTN_SECONDARY} mt-3`} onClick={load} disabled={busy}>Refresh</button>
    </div>
  );
}
