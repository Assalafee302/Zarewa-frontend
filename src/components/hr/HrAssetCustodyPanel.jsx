import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { recordCustodyEvent } from '../../lib/hrIncidents';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_CARD, HR_INPUT, HR_MUTED, HR_SECTION_TITLE } from './hrPageUi';

export default function HrAssetCustodyPanel({ assetId, machineId, canManage }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ eventType: 'assign', note: '' });

  const load = useCallback(async () => {
    if (!assetId && !machineId) return;
    setBusy(true);
    setErr('');
    try {
      const path = assetId
        ? `/api/assets/${encodeURIComponent(assetId)}/custody-timeline`
        : `/api/assets/_/custody-timeline?machineId=${encodeURIComponent(machineId)}`;
      const { ok, data } = await apiFetch(path);
      if (!ok || !data?.ok) {
        setErr(data?.error || 'Failed to load custody events');
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.events) ? data.events : []);
    } catch (e) {
      setErr(e?.message || 'Failed to load custody events');
    } finally {
      setBusy(false);
    }
  }, [assetId, machineId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canManage || (!assetId && !machineId)) return;
    setBusy(true);
    setErr('');
    try {
      const { ok, data } = await recordCustodyEvent({
        assetId: assetId || null,
        machineId: machineId || null,
        eventType: form.eventType,
        note: form.note,
      });
      if (!ok || !data?.ok) {
        setErr(data?.error || 'Failed to record custody event');
        return;
      }
      setForm({ eventType: 'assign', note: '' });
      await load();
    } catch (ex) {
      setErr(ex?.message || 'Failed to record custody event');
    } finally {
      setBusy(false);
    }
  };

  if (!assetId && !machineId) {
    return (
      <div className={HR_CARD}>
        <p className={HR_MUTED}>Set an asset or machine on the case to track custody.</p>
      </div>
    );
  }

  return (
    <div className={HR_CARD}>
      <h3 className={`${HR_SECTION_TITLE} mb-3`}>Asset custody</h3>
      {err ? <p className="text-red-600 text-sm mb-2">{err}</p> : null}
      {canManage ? (
        <form onSubmit={submit} className="grid gap-2 mb-4 sm:grid-cols-3">
          <select className={HR_INPUT} value={form.eventType} onChange={(ev) => setForm((f) => ({ ...f, eventType: ev.target.value }))}>
            <option value="assign">Assign</option>
            <option value="transfer">Transfer</option>
            <option value="confirm_present">Confirm present</option>
            <option value="report_missing">Report missing</option>
          </select>
          <input className={HR_INPUT} placeholder="Notes" value={form.note} onChange={(ev) => setForm((f) => ({ ...f, note: ev.target.value }))} />
          <button type="submit" className={HR_BTN_PRIMARY} disabled={busy}>Record event</button>
        </form>
      ) : null}
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="border-b border-slate-100 pb-2">
            <span className="font-medium">{r.event_type || r.eventType}</span>
            {r.custodian_user_id ? ` · ${r.custodian_user_id}` : ''}
            {r.note ? ` — ${r.note}` : ''}
            {r.created_at_iso ? <span className={HR_MUTED}> · {r.created_at_iso.slice(0, 16)}</span> : null}
          </li>
        ))}
        {!rows.length && !busy ? <li className={HR_MUTED}>No custody events.</li> : null}
      </ul>
      <button type="button" className={`${HR_BTN_SECONDARY} mt-3`} onClick={load} disabled={busy}>Refresh</button>
    </div>
  );
}
