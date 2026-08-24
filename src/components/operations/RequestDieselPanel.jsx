import React, { useCallback, useEffect, useState } from 'react';
import { Droplet } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { FIELD } from '../../lib/designTokens';
import { FormField, FormModal, FormModalFooter } from '../layout';
import { isFuelConsumingMachineType, MACHINE_TYPE_LABELS } from '../../shared/maintenanceRegistry';
import { OPS_TOOL_BTN } from './operationsDeskUi';

function fuelMachines(list) {
  return (Array.isArray(list) ? list : []).filter(
    (m) =>
      String(m.status || 'active') !== 'decommissioned' && isFuelConsumingMachineType(m.machineType || m.machine_type)
  );
}

/**
 * Store diesel request bound to the generator or forklift plant file.
 * Creates a Fuel & lubricant payment request and a standing fuel log.
 */
export function RequestDieselPanel({ branchId = '', onCreated, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [machines, setMachines] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [machineId, setMachineId] = useState('');
  const [litres, setLitres] = useState('');
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [note, setNote] = useState('');
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
    const next = fuelMachines(res.data?.machines);
    setMachines(next);
    setMachineId((prev) => (next.some((m) => m.id === prev) ? prev : ''));
  }, []);

  useEffect(() => {
    if (open) void loadMachines();
  }, [open, loadMachines]);

  const closeModal = () => {
    if (busy) return;
    setOpen(false);
    setOkMsg('');
    setError('');
    setLoadError('');
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
    const res = await apiFetch('/api/maintenance/fuel-requests', {
      method: 'POST',
      body: {
        machineId,
        litres: Number(litres) || 0,
        amountNgn: Math.round(Number(amount) || 0),
        payeeName: payee.trim(),
        note: note.trim(),
        fuelKind: 'diesel',
        branchId: branchId || undefined,
      },
    }).catch(() => ({ ok: false }));
    setBusy(false);
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Could not submit the diesel request.');
      return;
    }
    const prId = res.data?.requestID || '';
    setOkMsg(
      `Diesel request submitted${prId ? ` as ${prId}` : ''}. Branch Manager approves; cashier pays Fuel & lubricant.`
    );
    setLitres('');
    setAmount('');
    setPayee('');
    setNote('');
    onCreated?.(res.data);
  };

  const noMachines = loaded && !loadError && machines.length === 0;
  const submitted = Boolean(okMsg);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? 'Connect to the live workspace to request diesel' : undefined}
        onClick={() => {
          setOpen(true);
          setError('');
          setOkMsg('');
          setLoadError('');
          setLoaded(false);
        }}
        className={OPS_TOOL_BTN}
      >
        <Droplet size={14} aria-hidden /> Request diesel
      </button>

      <FormModal
        isOpen={open}
        onClose={closeModal}
        title="Request diesel"
        eyebrow="Store desk"
        description="Posts to the generator or forklift file. Cashier pays after Branch Manager approval — not a work order."
        size="md"
        formId="request-diesel-form"
        onSubmit={submit}
        closeDisabled={busy}
        footer={
          <FormModalFooter
            onCancel={closeModal}
            confirmType="submit"
            form="request-diesel-form"
            confirmLabel={submitted ? 'Done' : 'Submit request'}
            confirmDisabled={
              busy ||
              (!submitted && (noMachines || Boolean(loadError) || !machineId || !(Number(litres) > 0) || !(Number(amount) > 0)))
            }
            busy={busy}
          />
        }
      >
        {error ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
            {error}
          </p>
        ) : null}
        {okMsg ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-950">
            {okMsg}
          </p>
        ) : null}
        {loadError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-950">
            {loadError} Refresh and try again. Branch Manager registers the generator and forklift on Expenses →
            Machines.
          </p>
        ) : noMachines ? (
          <p className="rounded-md border border-dashed border-[var(--z-border)] bg-[var(--z-surface-muted)] px-3 py-4 text-sm text-[var(--z-text)]">
            No generator or forklift on the plant register. Branch Manager must register them on Expenses → Machines
            before diesel can be requested against the machine file.
          </p>
        ) : submitted ? null : (
          <div className="space-y-4">
            <FormField label="Machine" htmlFor="diesel-machine" required>
              <select
                id="diesel-machine"
                className={FIELD.compact}
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                required
              >
                <option value="">{loaded ? 'Select generator or forklift…' : 'Loading machines…'}</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.machineCode ? ` (${m.machineCode})` : ''}
                    {MACHINE_TYPE_LABELS[m.machineType] ? ` — ${MACHINE_TYPE_LABELS[m.machineType]}` : ''}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Litres" htmlFor="diesel-litres" required>
              <input
                id="diesel-litres"
                type="number"
                min="0.1"
                step="0.1"
                className={FIELD.compact}
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Estimated amount (₦)" htmlFor="diesel-amount" required>
              <input
                id="diesel-amount"
                type="number"
                min="1"
                step="1"
                className={FIELD.compact}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Payee" htmlFor="diesel-payee" hint="Filling station or supplier.">
              <input
                id="diesel-payee"
                className={FIELD.compact}
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
              />
            </FormField>
            <FormField label="Note (optional)" htmlFor="diesel-note">
              <textarea
                id="diesel-note"
                className={`${FIELD.compact} min-h-[4rem]`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Hours run, tank level, or why this top-up is needed."
              />
            </FormField>
          </div>
        )}
      </FormModal>
    </>
  );
}
