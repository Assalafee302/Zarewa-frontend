import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Wrench } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { FIELD } from '../../lib/designTokens';
import { Button } from '../ui/button';
import { FormField, FormGrid, FormModal, FormModalFooter } from '../layout';
import {
  MAINTENANCE_SPECIALTIES,
  MAINTENANCE_SPECIALTY_LABELS,
  userMayEditMaintenanceVendors,
} from '../../shared/maintenanceRegistry';

const emptyForm = () => ({
  name: '',
  contactPerson: '',
  phone: '',
  specialty: 'general',
  branchesServed: [],
  payeeName: '',
  accountNo: '',
  bankName: '',
  status: 'active',
  notes: '',
});

/**
 * Branch Manager Spend — plant contractor registry. Operations does not manage vendors.
 */
export function MaintenanceVendorsPanel({
  roleKey = '',
  branchId = '',
  branches = [],
}) {
  const canEdit = userMayEditMaintenanceVendors(roleKey);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const branchNameById = useMemo(() => {
    const m = new Map();
    for (const b of branches || []) {
      const id = String(b.id || b.branchId || '').trim();
      if (id) m.set(id, String(b.name || b.label || id));
    }
    return m;
  }, [branches]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const q = new URLSearchParams();
    if (statusFilter) q.set('status', statusFilter);
    const res = await apiFetch(`/api/maintenance/vendors?${q.toString()}`).catch(() => ({
      ok: false,
    }));
    setLoading(false);
    if (!res.ok) {
      setError(res.data?.error || 'Could not load vendors.');
      setVendors([]);
      return;
    }
    setVendors(Array.isArray(res.data?.vendors) ? res.data.vendors : []);
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      branchesServed: branchId ? [branchId] : [],
    });
    setModalOpen(true);
  };

  const openEdit = (v) => {
    setEditingId(v.id);
    setForm({
      name: v.name || '',
      contactPerson: v.contactPerson || '',
      phone: v.phone || '',
      specialty: v.specialty || 'general',
      branchesServed: Array.isArray(v.branchesServed) ? v.branchesServed : [],
      payeeName: v.bankDetails?.payeeName || '',
      accountNo: v.bankDetails?.accountNo || '',
      bankName: v.bankDetails?.bankName || '',
      status: v.status || 'active',
      notes: v.notes || '',
    });
    setModalOpen(true);
  };

  const save = async (event) => {
    event?.preventDefault?.();
    if (!canEdit) return;
    setSaving(true);
    setError('');
    const body = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      specialty: form.specialty,
      branchesServed: form.branchesServed,
      bankDetails: {
        payeeName: form.payeeName.trim(),
        accountNo: form.accountNo.trim(),
        bankName: form.bankName.trim(),
      },
      status: form.status,
      notes: form.notes.trim(),
    };
    const res = editingId
      ? await apiFetch(`/api/maintenance/vendors/${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          body,
        }).catch(() => ({ ok: false }))
      : await apiFetch('/api/maintenance/vendors', { method: 'POST', body }).catch(() => ({
          ok: false,
        }));
    setSaving(false);
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Save failed.');
      return;
    }
    setModalOpen(false);
    void load();
  };

  const toggleBranch = (id) => {
    setForm((f) => {
      const has = f.branchesServed.includes(id);
      return {
        ...f,
        branchesServed: has ? f.branchesServed.filter((x) => x !== id) : [...f.branchesServed, id],
      };
    });
  };

  return (
    <section className="flex flex-col overflow-hidden rounded-md border border-[var(--z-border)] bg-white shadow-[var(--shadow-zarewa-card)]">
      <header className="shrink-0 border-b border-[var(--z-border-subtle)] bg-[var(--z-surface-muted)]/40 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 text-zarewa-teal">
              <Wrench size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zarewa-teal">
                Maintenance vendors
              </h3>
              <p className="mt-0.5 text-ui-xs font-medium leading-snug text-[var(--z-text-muted)]">
                Contractors for plant jobs — not procurement suppliers. Assign them on Approvals → Issues.
                {canEdit ? '' : ' Read-only for this role.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${FIELD.compact} min-h-9 w-auto py-1.5`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="">All</option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void load()}
              aria-label="Refresh vendors"
              className="h-9 w-9 min-h-9 min-w-9"
            >
              <RefreshCw size={14} />
            </Button>
            {canEdit ? (
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus size={14} /> Add vendor
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="p-4 text-xs">
        {error ? (
          <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 font-semibold text-amber-950">
            {error}
          </p>
        ) : null}
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading vendors">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-[var(--z-surface-muted)]" />
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--z-border)] bg-[var(--z-surface-muted)] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[var(--z-text)]">No contractors on file</p>
            <p className="mt-1 text-ui-xs text-[var(--z-text-muted)]">
              Add contractors used for plant repairs. Store reports faults from Operations; you assign the job here.
            </p>
            {canEdit ? (
              <Button type="button" size="sm" className="mt-3" onClick={openCreate}>
                Add vendor
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[var(--z-border)]">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[var(--z-surface-muted)] text-ui-xs uppercase tracking-wide text-[var(--z-text-muted)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Specialty</th>
                  <th className="px-3 py-2 font-semibold">Branches</th>
                  <th className="px-3 py-2 font-semibold">Phone</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  {canEdit ? <th className="px-3 py-2 font-semibold" /> : null}
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-t border-[var(--z-border-subtle)]">
                    <td className="px-3 py-2 font-semibold text-[var(--z-text)]">
                      {v.name}
                      {v.contactPerson ? (
                        <span className="mt-0.5 block text-ui-xs font-medium text-[var(--z-text-muted)]">
                          {v.contactPerson}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-[var(--z-text)]">
                      {MAINTENANCE_SPECIALTY_LABELS[v.specialty] || v.specialty}
                    </td>
                    <td className="px-3 py-2 text-[var(--z-text-muted)]">
                      {(v.branchesServed || [])
                        .map((id) => branchNameById.get(id) || id)
                        .join(', ') || '—'}
                    </td>
                    <td className="z-stencil px-3 py-2 text-[var(--z-text)]">{v.phone || '—'}</td>
                    <td className="px-3 py-2 capitalize text-[var(--z-text)]">{v.status}</td>
                    {canEdit ? (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-ui-xs font-semibold text-zarewa-teal hover:underline"
                          onClick={() => openEdit(v)}
                        >
                          Edit
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? 'Edit vendor' : 'Add vendor'}
        eyebrow="Plant contractors"
        description="Used on work orders. Cashier still pays each approved expense separately."
        formId="maintenance-vendor-form"
        onSubmit={save}
        closeDisabled={saving}
        trackHydrateKey={editingId || 'new'}
        footer={
          <FormModalFooter
            onCancel={() => setModalOpen(false)}
            confirmType="submit"
            form="maintenance-vendor-form"
            confirmLabel="Save vendor"
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
          <FormField label="Name" htmlFor="vendor-name" required>
            <input
              id="vendor-name"
              className={FIELD.compact}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Contact" htmlFor="vendor-contact">
            <input
              id="vendor-contact"
              className={FIELD.compact}
              value={form.contactPerson}
              onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
            />
          </FormField>
          <FormField label="Phone" htmlFor="vendor-phone">
            <input
              id="vendor-phone"
              className={FIELD.compact}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </FormField>
          <FormField label="Specialty" htmlFor="vendor-specialty">
            <select
              id="vendor-specialty"
              className={FIELD.compact}
              value={form.specialty}
              onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
            >
              {MAINTENANCE_SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {MAINTENANCE_SPECIALTY_LABELS[s]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Status" htmlFor="vendor-status">
            <select
              id="vendor-status"
              className={FIELD.compact}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
        </FormGrid>
        <FormField
          label="Branches served"
          htmlFor="vendor-branches"
          className="mt-4"
          hint="Tick every plant this contractor covers."
        >
          <div id="vendor-branches" className="flex flex-wrap gap-2">
            {(branches || []).length === 0 ? (
              <p className="text-ui-xs text-[var(--z-text-muted)]">No branches loaded.</p>
            ) : (
              (branches || []).map((b) => {
                const id = String(b.id || b.branchId || '').trim();
                if (!id) return null;
                const checked = form.branchesServed.includes(id);
                return (
                  <label
                    key={id}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                      checked
                        ? 'border-zarewa-teal bg-teal-50 text-zarewa-teal'
                        : 'border-[var(--z-border)] bg-white text-[var(--z-text)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBranch(id)}
                    />
                    {b.name || b.label || id}
                  </label>
                );
              })
            )}
          </div>
        </FormField>
        <FormGrid className="mt-4" cols={3}>
          <FormField label="Payee name" htmlFor="vendor-payee">
            <input
              id="vendor-payee"
              className={FIELD.compact}
              value={form.payeeName}
              onChange={(e) => setForm((f) => ({ ...f, payeeName: e.target.value }))}
            />
          </FormField>
          <FormField label="Account no" htmlFor="vendor-account">
            <input
              id="vendor-account"
              className={FIELD.compact}
              value={form.accountNo}
              onChange={(e) => setForm((f) => ({ ...f, accountNo: e.target.value }))}
            />
          </FormField>
          <FormField label="Bank" htmlFor="vendor-bank">
            <input
              id="vendor-bank"
              className={FIELD.compact}
              value={form.bankName}
              onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            />
          </FormField>
        </FormGrid>
        <FormField label="Notes" htmlFor="vendor-notes" className="mt-4">
          <textarea
            id="vendor-notes"
            className={`${FIELD.compact} min-h-[4rem]`}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </FormField>
      </FormModal>
    </section>
  );
}
