import React, { useMemo, useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { canManageHrTransfers } from '../../lib/hrAccess';
import { createHrTransferRequest, TRANSFER_TYPES } from '../../lib/hrTransfers';
import { HrFormModal } from './HrFormModal';
import { HR_BTN_PRIMARY, HR_FIELD_CLASS } from './hrFormStyles';

/**
 * Inline transfer wizard from employee profile.
 */
export function HrStaffTransferQuickStart({ userId, staff, onCreated }) {
  const ws = useWorkspace();
  const { show: toast } = useToast();
  const canManage = canManageHrTransfers(ws?.permissions || []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    transferType: 'inter_branch',
    toBranchId: '',
    toDepartment: staff?.department || '',
    toDesignation: staff?.jobTitle || '',
    effectiveDateIso: new Date().toISOString().slice(0, 10),
    reason: '',
    notes: '',
    mdPolicyException: false,
    policyExceptionReason: '',
    submit: true,
  });

  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return list.map((b) => ({ id: b.id, name: b.name || b.id }));
  }, [ws?.snapshot?.workspaceBranches, ws?.session?.branches]);

  if (!canManage || !userId) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast('Enter a reason for the transfer.', { variant: 'error' });
      return;
    }
    setBusy(true);
    const payload = {
      ...form,
      userId,
      fromBranchId: staff?.branchId,
      fromDepartment: staff?.department,
      fromDesignation: staff?.jobTitle,
    };
    const { ok, data } = await createHrTransferRequest(payload);
    setBusy(false);
    if (!ok || !data?.ok) {
      toast(data?.error || 'Could not create transfer.', { variant: 'error' });
      return;
    }
    toast('Transfer request submitted.', { variant: 'success' });
    setOpen(false);
    onCreated?.(data);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex rounded-xl border border-zarewa-teal/30 bg-zarewa-teal/5 px-3 py-1.5 text-xs font-bold uppercase text-zarewa-teal hover:bg-zarewa-teal/10"
      >
        Start transfer request
      </button>
      <HrFormModal open={open} onClose={() => setOpen(false)} title="Initiate transfer" size="lg">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            Employee
            <input className={`${HR_FIELD_CLASS} mt-1`} value={staff?.displayName || userId} readOnly />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Transfer type
            <select
              className={`${HR_FIELD_CLASS} mt-1`}
              value={form.transferType}
              onChange={(e) => setForm((f) => ({ ...f, transferType: e.target.value }))}
            >
              {TRANSFER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Effective date
            <input
              type="date"
              className={`${HR_FIELD_CLASS} mt-1`}
              value={form.effectiveDateIso}
              onChange={(e) => setForm((f) => ({ ...f, effectiveDateIso: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            To branch
            <select
              className={`${HR_FIELD_CLASS} mt-1`}
              value={form.toBranchId}
              onChange={(e) => setForm((f) => ({ ...f, toBranchId: e.target.value }))}
            >
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            To department
            <input
              className={`${HR_FIELD_CLASS} mt-1`}
              value={form.toDepartment}
              onChange={(e) => setForm((f) => ({ ...f, toDepartment: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            New designation
            <input
              className={`${HR_FIELD_CLASS} mt-1`}
              value={form.toDesignation}
              onChange={(e) => setForm((f) => ({ ...f, toDesignation: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            Reason (required)
            <input
              className={`${HR_FIELD_CLASS} mt-1`}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              required
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className={HR_BTN_PRIMARY} disabled={busy}>
              {busy ? 'Submitting…' : 'Submit transfer'}
            </button>
            <button type="button" className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase text-slate-600" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </HrFormModal>
    </>
  );
}
