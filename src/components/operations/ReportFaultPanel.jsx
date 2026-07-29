import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { ModalFrame } from '../layout';

/**
 * Storekeeper fault report → creates maintenance_work_orders (corrective / open).
 */
export function ReportFaultPanel({ branchId = '', onCreated }) {
  const [open, setOpen] = useState(false);
  const [machines, setMachines] = useState([]);
  const [machineId, setMachineId] = useState('');
  const [symptom, setSymptom] = useState('');
  const [priority, setPriority] = useState('high');
  const [attachment, setAttachment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const loadMachines = useCallback(async () => {
    const res = await apiFetch('/api/maintenance/machines').catch(() => ({ ok: false }));
    if (res.ok && Array.isArray(res.data?.machines)) {
      setMachines(res.data.machines.filter((m) => String(m.status || 'active') === 'active'));
    }
  }, []);

  useEffect(() => {
    if (open) void loadMachines();
  }, [open, loadMachines]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAttachment(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      setAttachment({
        name: file.name,
        mime: file.type || 'image/jpeg',
        dataBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    setOkMsg('');
    const body = {
      machineId,
      symptom: symptom.trim(),
      summary: symptom.trim().slice(0, 120) || 'Fault report',
      priority,
      kind: 'corrective',
      status: 'open',
      branchId: branchId || undefined,
    };
    if (attachment?.dataBase64) body.attachment = attachment;
    const res = await apiFetch('/api/maintenance/work-orders', { method: 'POST', body }).catch(() => ({
      ok: false,
    }));
    setBusy(false);
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Could not submit fault report.');
      return;
    }
    setOkMsg(
      `Fault reported${res.data?.workOrderId || res.data?.id ? ` (${res.data.workOrderId || res.data.id})` : ''}. Branch Manager will see it under Issues.`
    );
    setSymptom('');
    setAttachment(null);
    setPriority('high');
    onCreated?.(res.data);
    setTimeout(() => setOpen(false), 600);
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError('');
          setOkMsg('');
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-rose-950 hover:bg-rose-100"
      >
        <AlertTriangle size={14} /> Report a fault
      </button>

      <ModalFrame isOpen={open} onClose={() => setOpen(false)} title="Report a fault" surface="plain">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-black text-zarewa-teal">Report a fault</p>
            <p className="text-ui-xs text-slate-500">Opens a corrective work order for the Branch Manager.</p>
          </div>
          <div className="space-y-3 p-4">
            {error ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
                {error}
              </p>
            ) : null}
            {okMsg ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-950">
                {okMsg}
              </p>
            ) : null}
            <label className="block text-ui-xs font-bold uppercase text-slate-500">
              Machine
              <select
                className={`mt-1 ${inputClass}`}
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
              >
                <option value="">Select machine…</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.machineCode ? ` (${m.machineCode})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-ui-xs font-bold uppercase text-slate-500">
              Symptom / description
              <textarea
                className={`mt-1 ${inputClass} min-h-[5rem]`}
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                placeholder="What failed? What did you hear/see?"
              />
            </label>
            <label className="block text-ui-xs font-bold uppercase text-slate-500">
              Priority
              <select
                className={`mt-1 ${inputClass}`}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="machine_down">Machine down</option>
              </select>
            </label>
            <label className="block text-ui-xs font-bold uppercase text-slate-500">
              Photo (optional)
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-xs"
                onChange={onFile}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-ui-xs font-bold uppercase text-slate-600"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !machineId || !symptom.trim()}
              className="rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-bold uppercase text-white disabled:opacity-50"
              onClick={() => void submit()}
            >
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      </ModalFrame>
    </>
  );
}
