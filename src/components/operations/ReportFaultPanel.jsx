import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { FIELD } from '../../lib/designTokens';
import { FormField, FormModal, FormModalFooter } from '../layout';
import { MACHINE_STATUS_LABELS } from '../../shared/maintenanceRegistry';
import { maintenancePriorityLabel } from '../../shared/lib/maintenanceCostEnvelope';
import { OPS_TOOL_BTN } from './operationsDeskUi';

function reportableMachines(list) {
  return (Array.isArray(list) ? list : []).filter(
    (m) => String(m.status || 'active') !== 'decommissioned'
  );
}

/**
 * Storekeeper fault report → creates maintenance_work_orders (corrective / open).
 */
export function ReportFaultPanel({ branchId = '', onCreated, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [machines, setMachines] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [machineId, setMachineId] = useState('');
  const [symptom, setSymptom] = useState('');
  const [priority, setPriority] = useState('high');
  const [attachment, setAttachment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const loadMachines = useCallback(async () => {
    const res = await apiFetch('/api/maintenance/machines').catch(() => ({ ok: false }));
    setLoaded(true);
    if (!res.ok) {
      setLoadError(res.data?.error || 'Could not load the plant register.');
      setMachines([]);
      setMachineId('');
      return;
    }
    setLoadError('');
    const next = reportableMachines(res.data?.machines);
    setMachines(next);
    setMachineId((prev) => (next.some((m) => m.id === prev) ? prev : ''));
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
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const closeModal = () => {
    if (busy) return;
    setOpen(false);
    setOkMsg('');
    setError('');
    setLoadError('');
    setAttachment(null);
  };

  const submit = async (event) => {
    event?.preventDefault?.();
    if (okMsg) {
      closeModal();
      return;
    }
    if (!machines.length) return;
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
    if (attachment?.dataBase64) {
      body.attachment = {
        name: attachment.name,
        mime: attachment.mime,
        dataBase64: attachment.dataBase64,
      };
    }
    const res = await apiFetch('/api/maintenance/work-orders', { method: 'POST', body }).catch(() => ({
      ok: false,
    }));
    setBusy(false);
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Could not submit fault report.');
      return;
    }
    const woId = res.data?.workOrderId || res.data?.id;
    setOkMsg(
      `Fault reported${woId ? ` as ${woId}` : ''}. Branch Manager will see it under Approvals → Issues.`
    );
    setSymptom('');
    setAttachment(null);
    setPriority('high');
    onCreated?.(res.data);
  };

  const noMachines = loaded && !loadError && machines.length === 0;
  const selectedMachine = machines.find((m) => m.id === machineId);
  const submitted = Boolean(okMsg);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? 'Connect to the live workspace to report a fault' : undefined}
        onClick={() => {
          setOpen(true);
          setError('');
          setOkMsg('');
          setLoadError('');
          setLoaded(false);
        }}
        className={OPS_TOOL_BTN}
      >
        <AlertTriangle size={14} aria-hidden /> Report a fault
      </button>

      <FormModal
        isOpen={open}
        onClose={closeModal}
        title="Report a fault"
        eyebrow="Store desk"
        description="Opens a corrective work order. Branch Manager assigns, spends, and returns the machine on Issues."
        size="md"
        formId="report-fault-form"
        onSubmit={submit}
        closeDisabled={busy}
        footer={
          <FormModalFooter
            onCancel={closeModal}
            confirmType="submit"
            form="report-fault-form"
            confirmLabel={busy ? 'Submitting…' : submitted ? 'Done' : 'Submit fault'}
            confirmLoading={busy}
            confirmDisabled={submitted ? false : noMachines || Boolean(loadError) || !machineId || !symptom.trim()}
            cancelDisabled={busy}
            cancelLabel={submitted ? 'Close' : 'Cancel'}
          />
        }
      >
        {error ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
            {error}
          </p>
        ) : null}
        {okMsg ? (
          <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-950">
            {okMsg}
          </p>
        ) : null}
        {loadError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-950">
            {loadError} Refresh and try again. Branch Manager registers machines on Expenses → Machines.
          </p>
        ) : noMachines ? (
          <p className="rounded-md border border-dashed border-[var(--z-border)] bg-[var(--z-surface-muted)] px-3 py-4 text-sm text-[var(--z-text)]">
            No machines on the plant register. Branch Manager must register a machine
            on Expenses → Machines before a fault can be reported.
          </p>
        ) : submitted ? null : (
          <div className="space-y-4">
            <FormField label="Machine" htmlFor="fault-machine" required>
              <select
                id="fault-machine"
                className={FIELD.compact}
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                required
              >
                <option value="">{loaded ? 'Select machine…' : 'Loading machines…'}</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.machineCode ? ` (${m.machineCode})` : ''}
                    {m.status === 'under_maintenance'
                      ? ` — ${MACHINE_STATUS_LABELS.under_maintenance}`
                      : ''}
                  </option>
                ))}
              </select>
            </FormField>
            {selectedMachine?.status === 'under_maintenance' ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
                This machine is already under repair. Submit only if this is a new or extra symptom
                on the same job.
              </p>
            ) : null}
            <FormField label="Symptom / description" htmlFor="fault-symptom" required>
              <textarea
                id="fault-symptom"
                className={`${FIELD.compact} min-h-[5rem]`}
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                placeholder="What failed? What did you hear or see?"
                required
              />
            </FormField>
            <FormField
              label="Priority"
              htmlFor="fault-priority"
              hint="Only Machine down takes the plant off the line. High still leaves it running."
            >
              <select
                id="fault-priority"
                className={FIELD.compact}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">{maintenancePriorityLabel('low')}</option>
                <option value="high">{maintenancePriorityLabel('high')}</option>
                <option value="machine_down">{maintenancePriorityLabel('machine_down')}</option>
              </select>
            </FormField>
            <FormField label="Photo (optional)" htmlFor="fault-photo" hint="Helps the Branch Manager see the fault.">
              <input
                id="fault-photo"
                type="file"
                accept="image/*"
                className="block w-full text-sm text-[var(--z-text)] file:mr-3 file:rounded-md file:border file:border-[var(--z-border)] file:bg-[var(--z-surface-muted)] file:px-3 file:py-2 file:text-xs file:font-semibold"
                onChange={onFile}
              />
            </FormField>
            {attachment?.previewUrl ? (
              <img
                src={attachment.previewUrl}
                alt={attachment.name || 'Fault photo preview'}
                className="max-h-40 w-full rounded-md border border-[var(--z-border)] object-contain bg-white"
              />
            ) : null}
          </div>
        )}
      </FormModal>
    </>
  );
}
