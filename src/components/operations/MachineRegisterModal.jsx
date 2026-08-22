import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiBase';
import { FIELD } from '../../lib/designTokens';
import { FormField, FormGrid, FormModal, FormModalFooter } from '../layout';
import {
  MACHINE_STATUSES,
  MACHINE_STATUS_LABELS,
  MACHINE_TYPE_LABELS,
  MACHINE_TYPES,
} from '../../shared/maintenanceRegistry';

const emptyForm = () => ({
  name: '',
  machineCode: '',
  machineType: 'corrugation',
  lineName: '',
  serialNo: '',
  modelNo: '',
  manufacturer: '',
  status: 'active',
  installedAtIso: '',
  notes: '',
  assetId: '',
});

function formFromMachine(m) {
  if (!m) return emptyForm();
  return {
    name: m.name || '',
    machineCode: m.machineCode || '',
    machineType: m.machineType || 'other',
    lineName: m.lineName || '',
    serialNo: m.serialNo || '',
    modelNo: m.modelNo || '',
    manufacturer: m.manufacturer || '',
    status: m.status || 'active',
    installedAtIso: String(m.installedAtIso || '').slice(0, 10),
    notes: m.notes || '',
    assetId: m.linkedAssets?.[0]?.assetId || m.assetId || '',
  };
}

/**
 * Create / edit the standing plant file. Branch Manager Expenses → Machines only.
 */
export function MachineRegisterModal({
  isOpen,
  onClose,
  machine = null,
  branchId = '',
  onSaved,
}) {
  const editingId = machine?.id || null;
  const [form, setForm] = useState(emptyForm);
  const [assets, setAssets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm(formFromMachine(machine));
    setError('');
    void apiFetch('/api/maintenance/machines/linkable-assets')
      .catch(() => ({ ok: false }))
      .then((res) => {
        setAssets(Array.isArray(res.data?.assets) ? res.data.assets : []);
      });
  }, [isOpen, machine]);

  const save = async (event) => {
    event?.preventDefault?.();
    const name = form.name.trim();
    if (!name) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    const body = {
      name,
      machineCode: form.machineCode.trim(),
      machineType: form.machineType,
      lineName: form.lineName.trim(),
      serialNo: form.serialNo.trim(),
      modelNo: form.modelNo.trim(),
      manufacturer: form.manufacturer.trim(),
      status: form.status,
      installedAtIso: form.installedAtIso || null,
      notes: form.notes.trim(),
      assetId: form.assetId || null,
      branchId: branchId || undefined,
    };
    const res = editingId
      ? await apiFetch(`/api/maintenance/machines/${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          body,
        }).catch(() => ({ ok: false }))
      : await apiFetch('/api/maintenance/machines', { method: 'POST', body }).catch(() => ({ ok: false }));
    setSaving(false);
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Save failed.');
      return;
    }
    onSaved?.(res.data);
    onClose?.();
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={() => !saving && onClose?.()}
      title={editingId ? 'Edit machine' : 'Register machine'}
      eyebrow="Plant register"
      description="This is the standing file. Faults, parts, lodging and labour hang off work orders on this machine."
      formId="machine-register-form"
      onSubmit={save}
      closeDisabled={saving}
      trackHydrateKey={editingId || 'new'}
      footer={
        <FormModalFooter
          onCancel={() => onClose?.()}
          confirmType="submit"
          form="machine-register-form"
          confirmLabel={editingId ? 'Save machine' : 'Register'}
          confirmLoading={saving}
          confirmDisabled={!form.name.trim()}
          cancelDisabled={saving}
        />
      }
    >
      {error ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
          {error}
        </p>
      ) : null}
      <FormGrid>
        <FormField label="Name" htmlFor="machine-name" required>
          <input
            id="machine-name"
            className={FIELD.compact}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </FormField>
        <FormField label="Plant code" htmlFor="machine-code">
          <input
            id="machine-code"
            className={FIELD.compact}
            value={form.machineCode}
            onChange={(e) => setForm((f) => ({ ...f, machineCode: e.target.value }))}
          />
        </FormField>
        <FormField label="Type" htmlFor="machine-type">
          <select
            id="machine-type"
            className={FIELD.compact}
            value={form.machineType}
            onChange={(e) => setForm((f) => ({ ...f, machineType: e.target.value }))}
          >
            {MACHINE_TYPES.map((t) => (
              <option key={t} value={t}>
                {MACHINE_TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Line / hall" htmlFor="machine-line">
          <input
            id="machine-line"
            className={FIELD.compact}
            value={form.lineName}
            onChange={(e) => setForm((f) => ({ ...f, lineName: e.target.value }))}
          />
        </FormField>
        <FormField label="Serial" htmlFor="machine-serial">
          <input
            id="machine-serial"
            className={FIELD.compact}
            value={form.serialNo}
            onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))}
          />
        </FormField>
        <FormField label="Status" htmlFor="machine-status">
          <select
            id="machine-status"
            className={FIELD.compact}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {MACHINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MACHINE_STATUS_LABELS[s] || s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Manufacturer" htmlFor="machine-mfr">
          <input
            id="machine-mfr"
            className={FIELD.compact}
            value={form.manufacturer}
            onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
          />
        </FormField>
        <FormField label="Installed" htmlFor="machine-installed">
          <input
            id="machine-installed"
            type="date"
            className={FIELD.compact}
            value={form.installedAtIso}
            onChange={(e) => setForm((f) => ({ ...f, installedAtIso: e.target.value }))}
          />
        </FormField>
        <FormField label="Fixed asset" htmlFor="machine-asset" hint="Links purchase cost for repair-vs-replace.">
          <select
            id="machine-asset"
            className={FIELD.compact}
            value={form.assetId}
            onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))}
          >
            <option value="">— Not linked —</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </FormField>
      </FormGrid>
      <FormField label="Notes" htmlFor="machine-notes" className="mt-4">
        <textarea
          id="machine-notes"
          className={`${FIELD.compact} min-h-[4rem]`}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </FormField>
    </FormModal>
  );
}
