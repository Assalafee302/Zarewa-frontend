import { HrButton, HrAddButton } from '../../components/hr/hrPageUi';
import React, { useState } from 'react';
import { HrFormModal } from './HrFormModal';
import { HrManagerPicker } from './HrManagerPicker';
import { appConfirm } from '../../lib/appConfirm';
import { bulkUpdateHrStaff } from '../../lib/hrStaffExtras';
import { HR_FIELD_CLASS } from './hrFormStyles';

/**
 * @param {{
 *   selectedIds: string[];
 *   staff: object[];
 *   branches?: { id: string; name: string }[];
 *   onClear: () => void;
 *   onDone: (result: object) => void;
 * }} props
 */
export function HrStaffDirectoryBulkBar({ selectedIds, staff, branches = [], onClear, onDone }) {
  const [managerOpen, setManagerOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [managerId, setManagerId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  if (!selectedIds.length) return null;

  const runBulk = async (payload) => {
    setBusy(payload.action || 'bulk');
    setErr('');
    const { ok, data } = await bulkUpdateHrStaff({ userIds: selectedIds, ...payload });
    setBusy('');
    if (!ok || !data?.ok) {
      setErr(data?.error || 'Bulk update failed.');
      return;
    }
    setManagerOpen(false);
    onDone(data);
  };

  const exportSelectedCsv = () => {
    const selected = new Set(selectedIds);
    const rows = staff.filter((s) => selected.has(s.userId));
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Name', 'EmployeeNo', 'Branch', 'Department', 'JobTitle', 'Status'];
    const lines = rows.map((s) =>
      [s.displayName, s.employeeNo, s.branchId, s.department, s.jobTitle, s.status].map(esc).join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-selected-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zarewa-teal/20 bg-teal-50/50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-zarewa-teal">
          {selectedIds.length} selected
        </p>
        <HrButton type="button" variant="secondary" onClick={() => setManagerOpen(true)} disabled={!!busy}>
          Assign manager
        </HrButton>
        {branches.length ? (
          <HrButton type="button" variant="secondary" onClick={() => setBranchOpen(true)} disabled={!!busy}>
            Assign branch
          </HrButton>
        ) : null}
        <HrButton
          type="button"
          variant="secondary"
          disabled={!!busy}
          onClick={() => runBulk({ flagForReview: true, action: 'review' })}
        >
          Flag for review
        </HrButton>
        <HrButton
          type="button"
          variant="secondary"
          disabled={!!busy}
          onClick={async () => {
            if (!(await appConfirm({
              title: 'Deactivate',
              message: `Deactivate ${selectedIds.length} account(s)? They will lose login access.`,
              variant: 'danger',
            }))) return;
            runBulk({ accountStatus: 'inactive', action: 'deactivate' });
          }}
        >
          Deactivate
        </HrButton>
        <HrButton
          type="button"
          variant="secondary"
          disabled={!!busy}
          onClick={() => runBulk({ accountStatus: 'active', action: 'activate' })}
        >
          Reactivate
        </HrButton>
        <HrButton type="button" variant="secondary" onClick={exportSelectedCsv}>
          Export selected
        </HrButton>
        <button type="button" className="text-xs font-bold uppercase text-slate-500 hover:underline" onClick={onClear}>
          Clear
        </button>
        {err ? <p className="w-full text-xs text-red-700">{err}</p> : null}
      </div>

      <HrFormModal isOpen={managerOpen} onClose={() => setManagerOpen(false)} title="Assign line manager" size="md">
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Line manager for {selectedIds.length} staff
            <HrManagerPicker staff={staff} value={managerId} onChange={setManagerId} className={`${HR_FIELD_CLASS} mt-1`} />
          </label>
          <div className="flex gap-2">
            <HrButton
              type="button"
              
              disabled={!!busy}
              onClick={() => runBulk({ lineManagerUserId: managerId || null, action: 'manager' })}
            >
              {busy ? 'Saving…' : 'Apply to selected'}
            </HrButton>
            <HrButton type="button" variant="secondary" onClick={() => setManagerOpen(false)}>
              Cancel
            </HrButton>
          </div>
        </div>
      </HrFormModal>

      <HrFormModal isOpen={branchOpen} onClose={() => setBranchOpen(false)} title="Assign branch" size="md">
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Branch for {selectedIds.length} staff
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={`${HR_FIELD_CLASS} mt-1`}>
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <HrButton
              type="button"
              
              disabled={!!busy || !branchId}
              onClick={() => runBulk({ branchId, action: 'branch' })}
            >
              {busy ? 'Saving…' : 'Apply to selected'}
            </HrButton>
            <HrButton type="button" variant="secondary" onClick={() => setBranchOpen(false)}>
              Cancel
            </HrButton>
          </div>
        </div>
      </HrFormModal>
    </>
  );
}
