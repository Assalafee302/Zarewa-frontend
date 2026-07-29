import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Wrench } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { ModalFrame } from '../layout';
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
  branchesServedText: '',
  payeeName: '',
  accountNo: '',
  bankName: '',
  status: 'active',
  notes: '',
});

/**
 * Operations Overview — maintenance vendor registry (BM/MD edit; ops read-only).
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
      branchesServedText: branchId || '',
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
      branchesServedText: (v.branchesServed || []).join(', '),
      payeeName: v.bankDetails?.payeeName || '',
      accountNo: v.bankDetails?.accountNo || '',
      bankName: v.bankDetails?.bankName || '',
      status: v.status || 'active',
      notes: v.notes || '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError('');
    const body = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      specialty: form.specialty,
      branchesServed: form.branchesServedText
        .split(/[,;]/)
        .map((x) => x.trim())
        .filter(Boolean),
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

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15';

  return (
    <section className="flex flex-col rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <header className="shrink-0 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <span className="mt-0.5 text-zarewa-teal">
              <Wrench size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase tracking-widest text-zarewa-teal">
                Maintenance vendors
              </h3>
              <p className="mt-0.5 text-ui-xs font-medium text-slate-500 leading-snug">
                Branch contractors for plant repairs — not procurement suppliers.
                {canEdit ? '' : ' Read-only for Operations.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-ui-xs font-bold text-slate-700"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="">All</option>
            </select>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-zarewa-teal hover:text-zarewa-teal"
              aria-label="Refresh vendors"
            >
              <RefreshCw size={14} />
            </button>
            {canEdit ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1 rounded-lg bg-zarewa-teal px-2.5 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-white"
              >
                <Plus size={14} /> Add vendor
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="p-4 text-xs">
        {error ? (
          <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-950 font-semibold">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="text-slate-500 py-4 text-center">Loading vendors…</p>
        ) : vendors.length === 0 ? (
          <p className="text-slate-500 py-4 text-center">No vendors yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-ui-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">Name</th>
                  <th className="px-3 py-2 font-bold">Specialty</th>
                  <th className="px-3 py-2 font-bold">Branches</th>
                  <th className="px-3 py-2 font-bold">Phone</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  {canEdit ? <th className="px-3 py-2 font-bold" /> : null}
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">
                      {v.name}
                      {v.contactPerson ? (
                        <span className="block text-ui-xs font-medium text-slate-500">{v.contactPerson}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {MAINTENANCE_SPECIALTY_LABELS[v.specialty] || v.specialty}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {(v.branchesServed || [])
                        .map((id) => branchNameById.get(id) || id)
                        .join(', ') || '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-700">{v.phone || '—'}</td>
                    <td className="px-3 py-2 capitalize text-slate-700">{v.status}</td>
                    {canEdit ? (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-ui-xs font-bold uppercase text-zarewa-teal hover:underline"
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

      <ModalFrame
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit vendor' : 'Add vendor'}
        surface="plain"
      >
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-black text-zarewa-teal">{editingId ? 'Edit vendor' : 'Add vendor'}</p>
          </div>
          <div className="max-h-[min(70dvh,520px)] overflow-auto space-y-3 p-4">
            <label className="block text-ui-xs font-bold uppercase text-slate-500">
              Name
              <input
                className={`mt-1 ${inputClass}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Contact
                <input
                  className={`mt-1 ${inputClass}`}
                  value={form.contactPerson}
                  onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                />
              </label>
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Phone
                <input
                  className={`mt-1 ${inputClass}`}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
            </div>
            <label className="block text-ui-xs font-bold uppercase text-slate-500">
              Specialty
              <select
                className={`mt-1 ${inputClass}`}
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
              >
                {MAINTENANCE_SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {MAINTENANCE_SPECIALTY_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-ui-xs font-bold uppercase text-slate-500">
              Branches served (IDs, comma-separated)
              <input
                className={`mt-1 ${inputClass}`}
                value={form.branchesServedText}
                onChange={(e) => setForm((f) => ({ ...f, branchesServedText: e.target.value }))}
                placeholder="BR-KD, BR-YL"
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Payee name
                <input
                  className={`mt-1 ${inputClass}`}
                  value={form.payeeName}
                  onChange={(e) => setForm((f) => ({ ...f, payeeName: e.target.value }))}
                />
              </label>
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Account no
                <input
                  className={`mt-1 ${inputClass}`}
                  value={form.accountNo}
                  onChange={(e) => setForm((f) => ({ ...f, accountNo: e.target.value }))}
                />
              </label>
              <label className="block text-ui-xs font-bold uppercase text-slate-500">
                Bank
                <input
                  className={`mt-1 ${inputClass}`}
                  value={form.bankName}
                  onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                />
              </label>
            </div>
            <label className="block text-ui-xs font-bold uppercase text-slate-500">
              Status
              <select
                className={`mt-1 ${inputClass}`}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="block text-ui-xs font-bold uppercase text-slate-500">
              Notes
              <textarea
                className={`mt-1 ${inputClass} min-h-[4rem]`}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-ui-xs font-bold uppercase text-slate-600"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !form.name.trim()}
              className="rounded-lg bg-zarewa-teal px-3 py-1.5 text-ui-xs font-bold uppercase text-white disabled:opacity-50"
              onClick={() => void save()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </ModalFrame>
    </section>
  );
}
