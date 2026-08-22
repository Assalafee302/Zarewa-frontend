import React, { useMemo, useState } from 'react';
import { AlertTriangle, Building2, Pencil, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { ModalFrame } from '../layout';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import { appConfirm } from '../../lib/appConfirm';

const EMPTY_FORM = {
  name: '',
  staffType: 'Driver',
  phone: '',
  status: 'Active',
  bankAccountName: '',
  bankName: '',
  bankAccountNo: '',
  notes: '',
};

function bankDetailsComplete(row) {
  return Boolean(
    String(row?.bankAccountName || row?.bank_account_name || '').trim() &&
      String(row?.bankName || row?.bank_name || '').trim() &&
      String(row?.bankAccountNo || row?.bank_account_no || '').trim()
  );
}

export function ManagerAssociatedStaffPanel() {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const policyEnabled = Boolean(ws?.snapshot?.associatedStaffPolicy?.enabled);
  const rows = useMemo(
    () => (Array.isArray(ws?.snapshot?.associatedStaff) ? ws.snapshot.associatedStaff : []),
    [ws?.snapshot?.associatedStaff]
  );
  const rowsFiltered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    return rows.filter((row) => {
      const type = String(row?.staffType || row?.staff_type || '').toLowerCase();
      if (typeFilter !== 'all' && type !== typeFilter) return false;
      if (!q) return true;
      const blob = [
        row?.id,
        row?.name,
        row?.phone,
        row?.staffType,
        row?.staff_type,
        row?.bankName,
        row?.bank_name,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ');
      return blob.includes(q);
    });
  }, [rows, search, typeFilter]);
  const activeCount = useMemo(
    () => rows.filter((r) => String(r?.status || 'Active').trim().toLowerCase() === 'active').length,
    [rows]
  );
  const driverCount = useMemo(
    () =>
      rows.filter((r) =>
        String(r?.staffType || r?.staff_type || '')
          .trim()
          .toLowerCase()
          .includes('driver')
      ).length,
    [rows]
  );
  const installerCount = useMemo(
    () =>
      rows.filter((r) =>
        String(r?.staffType || r?.staff_type || '')
          .trim()
          .toLowerCase()
          .includes('install')
      ).length,
    [rows]
  );
  const payoutReadyCount = useMemo(
    () => rows.filter((r) => bankDetailsComplete(r)).length,
    [rows]
  );
  const formBankComplete = useMemo(
    () =>
      Boolean(form.bankAccountName.trim() && form.bankName.trim() && form.bankAccountNo.trim()),
    [form.bankAccountName, form.bankName, form.bankAccountNo]
  );

  const openCreate = () => {
    setEditingId('');
    setForm(EMPTY_FORM);
    setIsOpen(true);
  };

  const openEdit = (row) => {
    const profile = row?.profile && typeof row.profile === 'object' ? row.profile : {};
    setEditingId(String(row?.id || '').trim());
    setForm({
      name: String(row?.name || '').trim(),
      staffType: String(row?.staffType || row?.staff_type || 'Driver').trim() || 'Driver',
      phone: String(row?.phone || '').trim(),
      status: String(row?.status || 'Active').trim() || 'Active',
      bankAccountName: String(row?.bankAccountName || row?.bank_account_name || '').trim(),
      bankName: String(row?.bankName || row?.bank_name || '').trim(),
      bankAccountNo: String(row?.bankAccountNo || row?.bank_account_no || '').trim(),
      notes: String(profile?.notes || '').trim(),
    });
    setIsOpen(true);
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Enter partner name.', { variant: 'error' });
      return;
    }
    if (!ws?.canMutate) {
      showToast('Reconnect to save associated staff — read-only workspace.', { variant: 'info' });
      return;
    }
    const payload = {
      name: form.name.trim(),
      staffType: form.staffType,
      phone: form.phone.trim(),
      status: form.status,
      bankAccountName: form.bankAccountName.trim(),
      bankName: form.bankName.trim(),
      bankAccountNo: form.bankAccountNo.trim(),
      profile: { notes: form.notes.trim() },
    };
    const { ok, data } = editingId
      ? await apiFetch(`/api/associated-staff/${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      : await apiFetch('/api/associated-staff', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not save associated staff profile.', { variant: 'error' });
      return;
    }
    await ws.refresh();
    setIsOpen(false);
    setEditingId('');
    showToast(editingId ? 'Associated staff updated.' : 'Associated staff registered.');
  };

  const onDelete = async (row) => {
    if (!(await appConfirm({ message: `Deactivate profile "${row.name}"?`, variant: 'danger' }))) return;
    if (!ws?.canMutate) {
      showToast('Reconnect to manage associated staff — read-only workspace.', { variant: 'info' });
      return;
    }
    const { ok, data } = await apiFetch(`/api/associated-staff/${encodeURIComponent(row.id)}`, {
      method: 'DELETE',
    });
    if (!ok || !data?.ok) {
      showToast(data?.error || 'Could not deactivate profile.', { variant: 'error' });
      return;
    }
    await ws.refresh();
    showToast('Associated staff profile deactivated.');
  };

  return (
    <div id="manager-associated-staff" className="space-y-4 scroll-mt-20">
      <section
        className={`rounded-xl border p-4 sm:p-5 ${
          policyEnabled
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Users size={14} className="text-zarewa-teal" />
              Installers & Drivers
            </p>
            <p className="mt-1 text-ui-xs text-slate-600 max-w-2xl">
              Company partners for transport and installation — not customers or HR staff. Profiles here
              appear on quotation service lines and support controlled refund splits to agents.
            </p>
            <p
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-ui-xs font-semibold ${
                policyEnabled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {policyEnabled ? <ShieldCheck size={12} /> : <Building2 size={12} />}
              Policy {policyEnabled ? 'active' : 'standby'} —{' '}
              {policyEnabled
                ? 'assignments & agent splits enforced on quotations/refunds'
                : 'enable ZAREWA_ASSOCIATED_STAFF_POLICY_V1 on server to enforce'}
            </p>
          </div>
          <button type="button" onClick={openCreate} className="z-btn-primary shrink-0">
            <UserPlus size={14} />
            Register profile
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-ui-xs">
          <div className="rounded-lg border border-slate-200 bg-white/80 px-2.5 py-2">
            <p className="text-slate-500">Total</p>
            <p className="font-bold text-slate-800">{rows.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
            <p className="text-emerald-700">Active</p>
            <p className="font-bold text-emerald-900">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2">
            <p className="text-sky-700">Drivers</p>
            <p className="font-bold text-sky-900">{driverCount}</p>
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-2">
            <p className="text-violet-700">Installers</p>
            <p className="font-bold text-violet-900">{installerCount}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
            <p className="text-amber-700">Payout ready</p>
            <p className="font-bold text-amber-900">{payoutReadyCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="mb-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, phone, bank..."
            className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-zarewa-teal/15"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="driver">Drivers</option>
            <option value="installer">Installers</option>
          </select>
        </div>
        {rowsFiltered.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              {rows.length === 0 ? 'No installer or driver profiles yet' : 'No profiles match this filter'}
            </p>
            <p className="text-ui-xs text-slate-500 max-w-md mx-auto">
              {rows.length === 0
                ? 'Register transporters and installers with bank details so sales can assign them on quotations.'
                : 'Try clearing search or changing the type filter.'}
            </p>
            {rows.length === 0 ? (
              <button type="button" onClick={openCreate} className="z-btn-primary mt-2">
                <UserPlus size={14} />
                Register first profile
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-2">
            {rowsFiltered.map((row) => {
              const payoutReady = bankDetailsComplete(row);
              const isActive = String(row?.status || 'Active').trim().toLowerCase() === 'active';
              const staffType = row.staffType || row.staff_type || '—';
              return (
                <li
                  key={row.id}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 flex items-start justify-between gap-3 hover:border-zarewa-teal/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-zarewa-teal truncate">{row.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.status || 'Active'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        {staffType}
                      </span>
                      {!payoutReady ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <AlertTriangle size={10} />
                          Bank incomplete
                        </span>
                      ) : null}
                    </div>
                    <p className="text-ui-xs font-mono text-slate-500 truncate mt-0.5">{row.id}</p>
                    <p className="text-ui-xs text-slate-600 truncate mt-1">
                      {row.phone || 'No phone'}
                      {payoutReady
                        ? ` · ${row.bankName || row.bank_name} · ${row.bankAccountNo || row.bank_account_no}`
                        : ' · add bank details for payouts'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-zarewa-teal"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(row)}
                      className="p-1.5 rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      title="Deactivate"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ModalFrame isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="z-modal-panel max-w-lg max-h-[min(92vh,720px)] overflow-y-auto custom-scrollbar p-8">
          <h3 className="text-xl font-bold text-zarewa-teal mb-1">
            {editingId ? 'Edit installer / driver profile' : 'New installer / driver profile'}
          </h3>
          <p className="text-ui-xs text-slate-500 mb-5">
            Used on quotation transport/installation lines. Bank details are required before payouts.
          </p>
          <form className="space-y-4" onSubmit={onSave}>
            <input
              required
              placeholder="Partner name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm font-bold"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={form.staffType}
                onChange={(e) => setForm((f) => ({ ...f, staffType: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm bg-white"
              >
                <option value="Driver">Driver</option>
                <option value="Installer">Installer</option>
              </select>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm"
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              <p className="text-ui-xs font-bold uppercase tracking-wide text-slate-500">Payout account</p>
              <input
                placeholder="Bank name"
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm"
              />
              <input
                placeholder="Account number"
                value={form.bankAccountNo}
                onChange={(e) => setForm((f) => ({ ...f, bankAccountNo: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm font-mono"
              />
              <input
                placeholder="Account name"
                value={form.bankAccountName}
                onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm"
              />
              {!formBankComplete ? (
                <p className="text-ui-xs text-amber-700 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Complete all three bank fields so refunds and payouts are not blocked later.
                </p>
              ) : null}
            </div>
            <textarea
              placeholder="Notes (optional)"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm"
            />
            <button type="submit" className="z-btn-primary w-full justify-center py-3">
              {editingId ? 'Update profile' : 'Save profile'}
            </button>
          </form>
        </div>
      </ModalFrame>
    </div>
  );
}

export default ManagerAssociatedStaffPanel;
