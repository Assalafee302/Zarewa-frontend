import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canManageHrTransfers } from '../../lib/hrAccess';
import { apiFetch } from '../../lib/apiBase';
import { fetchHrTransferRecommendations, reviewHrTransferRecommendation } from '../../lib/hrExtended';
import {
  TRANSFER_TYPES,
  createHrTransferRequest,
  fetchHrTransferRequests,
  patchHrTransferRequest,
} from '../../lib/hrTransfers';
import { fetchHrDepartments } from '../../lib/hrMasterData';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import { HrCard, HrEmptyState, HrStatusPill } from '../../components/hr/hrPageUi';
import { HrResponsiveTable } from '../../components/hr/HrResponsiveTable';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';

const emptyForm = () => ({
  userId: '',
  transferType: 'inter_branch',
  toBranchId: '',
  toDepartment: '',
  toDesignation: '',
  effectiveDateIso: new Date().toISOString().slice(0, 10),
  reason: '',
  notes: '',
  submit: true,
});

export default function HrTransfers({ embedded = false } = {}) {
  const ws = useWorkspace();
  const { show: toast } = useToast();
  const perms = ws?.permissions || [];
  const canManage = canManageHrTransfers(perms);

  const branches = useMemo(() => {
    const list = ws?.snapshot?.workspaceBranches ?? ws?.session?.branches ?? [];
    return [{ id: 'HQ', name: 'HQ' }, ...list.map((b) => ({ id: b.id, name: b.name || b.id }))];
  }, [ws]);

  const branchName = useMemo(() => Object.fromEntries(branches.map((b) => [b.id, b.name])), [branches]);

  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  useHrListLoad(async () => {
    const [staffRes, deptRes] = await Promise.all([apiFetch('/api/hr/staff'), fetchHrDepartments()]);
    if (staffRes.ok && staffRes.data?.ok) setStaff(staffRes.data.staff || []);
    if (deptRes.ok && deptRes.data?.ok) setDepartments(deptRes.data.departments || []);
    return { hasData: true };
  }, []);

  const { loading, error, reload } = useHrListLoad(async () => {
    const params = statusFilter ? { status: statusFilter } : {};
    const [tr, rec] = await Promise.all([
      fetchHrTransferRequests(params),
      fetchHrTransferRecommendations(),
    ]);
    if (!tr.ok || !tr.data?.ok) {
      setTransfers([]);
      return { error: tr.data?.error || 'Could not load transfers.', hasData: false };
    }
    setTransfers(tr.data.transfers || []);
    if (rec.ok && rec.data?.ok) setRecommendations(rec.data.recommendations || []);
    return { hasData: true };
  }, [statusFilter]);

  const selectedStaff = staff.find((s) => s.userId === form.userId);

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (!canManage || !form.userId) return;
    setBusy(true);
    const payload = {
      ...form,
      fromBranchId: selectedStaff?.branchId,
      fromDepartment: selectedStaff?.department,
      fromDesignation: selectedStaff?.jobTitle,
    };
    const { ok, data } = await createHrTransferRequest(payload);
    setBusy(false);
    if (!ok || !data?.ok) {
      toast(data?.error || 'Could not create transfer.', { variant: 'error' });
      return;
    }
    toast('Transfer request submitted.', { variant: 'success' });
    setModalOpen(false);
    setForm(emptyForm());
    reload();
  };

  const doAction = async (id, action) => {
    setBusy(true);
    const { ok, data } = await patchHrTransferRequest(id, { action });
    setBusy(false);
    if (!ok || !data?.ok) {
      toast(data?.error || 'Action failed.', { variant: 'error' });
      return;
    }
    toast(`Transfer ${action.replace(/_/g, ' ')}.`, { variant: 'success' });
    setReviewModal(null);
    reload();
  };

  const reviewRec = async (id, status) => {
    const { ok, data } = await reviewHrTransferRecommendation(id, { status });
    if (ok && data?.ok) {
      toast(`Recommendation ${status}.`, { variant: 'success' });
      reload();
    }
  };

  const pendingCount = transfers.filter((t) => ['submitted', 'branch_review', 'hr_review', 'gm_approval', 'approved'].includes(t.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {!embedded ? (
          <p className="text-sm text-slate-600 max-w-2xl">
            Manage inter-branch, in-branch, and role transfers with approval workflow. Completed transfers update the employee profile.
          </p>
        ) : null}
        {canManage ? (
          <HrAddFormButton onClick={() => { setForm(emptyForm()); setModalOpen(true); }}>Initiate transfer</HrAddFormButton>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HrCard className="!p-3">
          <p className="text-[10px] font-black uppercase text-slate-500">Pending</p>
          <p className="text-xl font-black tabular-nums text-amber-900">{pendingCount}</p>
        </HrCard>
        <HrCard className="!p-3">
          <p className="text-[10px] font-black uppercase text-slate-500">Completed</p>
          <p className="text-xl font-black tabular-nums">{transfers.filter((t) => t.status === 'completed').length}</p>
        </HrCard>
      </div>

      <HrCard title="Transfer requests">
        <div className="mb-3 flex flex-wrap gap-2">
          <select className={`${HR_FIELD_CLASS} max-w-xs`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['submitted', 'branch_review', 'hr_review', 'gm_approval', 'approved', 'completed', 'rejected'].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
            <button type="button" className="ml-2 underline" onClick={reload}>Retry</button>
          </div>
        ) : null}
        {loading && !transfers.length ? <p className="text-sm text-slate-600">Loading transfers…</p> : null}
        {!loading && !transfers.length ? (
          <HrEmptyState title="No transfer requests" description="Initiate a transfer to move staff between branches or departments." />
        ) : (
          <HrResponsiveTable
            columns={[
              { key: 'staffDisplayName', label: 'Employee' },
              { key: 'transferType', label: 'Type' },
              { key: 'route', label: 'Route' },
              { key: 'effectiveDateIso', label: 'Effective' },
              { key: 'status', label: 'Status' },
            ]}
            rows={transfers.map((t) => ({
              ...t,
              transferType: String(t.transferType || '').replace(/_/g, ' '),
              route: `${branchName[t.fromBranchId] || t.fromBranchId || '—'} → ${branchName[t.toBranchId] || t.toDepartment || '—'}`,
              status: t.status,
              staffDisplayName: t.staffDisplayName || t.userId,
            }))}
          />
        )}
        {transfers.length ? (
          <div className="mt-3 space-y-2">
            {transfers.slice(0, 15).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs">
                <span>
                  <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(t.userId)}`} className="font-semibold text-[#134e4a] hover:underline">
                    {t.staffDisplayName}
                  </Link>
                  {' · '}
                  <HrStatusPill status={t.status} />
                </span>
                {canManage ? (
                  <div className="flex flex-wrap gap-1">
                    {t.status === 'submitted' ? (
                      <button type="button" className="rounded border px-2 py-0.5 font-bold text-[#134e4a]" onClick={() => doAction(t.id, 'hr_review')}>HR review</button>
                    ) : null}
                    {t.status === 'hr_review' ? (
                      <button type="button" className="rounded border px-2 py-0.5 font-bold text-emerald-800" onClick={() => doAction(t.id, 'approve')}>Approve</button>
                    ) : null}
                    {t.status === 'approved' ? (
                      <button type="button" className="rounded border px-2 py-0.5 font-bold text-[#134e4a]" onClick={() => doAction(t.id, 'complete')}>Complete</button>
                    ) : null}
                    {!['completed', 'rejected', 'cancelled'].includes(t.status) ? (
                      <button type="button" className="rounded border px-2 py-0.5 text-red-700" onClick={() => doAction(t.id, 'reject')}>Reject</button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </HrCard>

      {recommendations.length > 0 ? (
        <HrCard title="Branch manager recommendations">
          <HrResponsiveTable
            columns={[
              { key: 'staffDisplayName', label: 'Staff' },
              { key: 'route', label: 'Route' },
              { key: 'status', label: 'Status' },
            ]}
            rows={recommendations.map((r) => ({
              ...r,
              route: `${branchName[r.fromBranchId] || r.fromBranchId} → ${branchName[r.toBranchId] || r.toBranchId}`,
            }))}
          />
          {canManage ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {recommendations.filter((r) => r.status === 'pending').map((r) => (
                <div key={r.id} className="text-xs flex gap-2 items-center">
                  <span>{r.staffDisplayName}</span>
                  <button type="button" className="font-bold text-emerald-700" onClick={() => reviewRec(r.id, 'approved')}>Approve</button>
                  <button type="button" className="font-bold text-red-700" onClick={() => reviewRec(r.id, 'rejected')}>Reject</button>
                </div>
              ))}
            </div>
          ) : null}
        </HrCard>
      ) : null}

      <HrFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Initiate transfer" size="lg">
        <form onSubmit={submitTransfer} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            Employee
            <select className={HR_FIELD_CLASS} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
              <option value="">Select staff…</option>
              {staff.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.displayName} · {branchName[s.branchId] || s.branchId} · {s.department || '—'}
                </option>
              ))}
            </select>
          </label>
          {selectedStaff ? (
            <p className="sm:col-span-2 text-xs text-slate-500 rounded-lg bg-slate-50 px-3 py-2">
              Current: {branchName[selectedStaff.branchId] || selectedStaff.branchId} · {selectedStaff.department || '—'} · {selectedStaff.jobTitle || '—'}
            </p>
          ) : null}
          <label className="block text-xs font-semibold text-slate-600">
            Transfer type
            <select className={HR_FIELD_CLASS} value={form.transferType} onChange={(e) => setForm({ ...form, transferType: e.target.value })}>
              {TRANSFER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Effective date
            <input type="date" className={HR_FIELD_CLASS} value={form.effectiveDateIso} onChange={(e) => setForm({ ...form, effectiveDateIso: e.target.value })} required />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            New branch
            <select className={HR_FIELD_CLASS} value={form.toBranchId} onChange={(e) => setForm({ ...form, toBranchId: e.target.value })}>
              <option value="">— unchanged —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            New department
            <select className={HR_FIELD_CLASS} value={form.toDepartment} onChange={(e) => setForm({ ...form, toDepartment: e.target.value })}>
              <option value="">— unchanged —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            New designation
            <input className={HR_FIELD_CLASS} value={form.toDesignation} onChange={(e) => setForm({ ...form, toDesignation: e.target.value })} placeholder="Job title if changing role" />
          </label>
          <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
            Reason
            <textarea className={HR_FIELD_CLASS} rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>{busy ? 'Submitting…' : 'Submit transfer'}</button>
            <button type="button" className={HR_BTN_SECONDARY} onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </form>
      </HrFormModal>
    </div>
  );
}
