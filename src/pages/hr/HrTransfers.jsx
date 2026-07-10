import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useHrListLoad } from '../../hooks/useHrListLoad';
import { canEndorseBranchHr, canGenerateHrLetters, canGmApproveHrRequests, canManageHrTransfers } from '../../lib/hrAccess';
import { apiFetch } from '../../lib/apiBase';
import { fetchHrTransferRecommendations, reviewHrTransferRecommendation } from '../../lib/hrExtended';
import {
  TRANSFER_QUEUE_SCOPES,
  TRANSFER_TYPES,
  createHrTransferRequest,
  fetchHrTransferRequests,
  patchHrTransferRequest,
} from '../../lib/hrTransfers';
import { fetchHrDepartments } from '../../lib/hrMasterData';
import { HR_EMPLOYEES } from '../../lib/hrRoutes';
import { HrAddFormButton, HrFormModal } from '../../components/hr/HrFormModal';
import HrTransferStageBar from '../../components/hr/HrTransferStageBar';
import HrTransfersOverview from '../../components/hr/HrTransfersOverview';
import { HrCard, HrEmptyState } from '../../components/hr/hrPageUi';
import { HrDualView } from '../../components/hr/HrDualView';
import { HrMobileCard, HrMobileCardList } from '../../components/hr/HrMobileCard';
import { HrStatusBadge } from '../../components/hr/HrStatusBadge';
import { HrTableEmptyRow, HrTableLoadingRow } from '../../components/hr/HrTableBodyState';
import { HrResponsiveTable } from '../../components/hr/HrResponsiveTable';
import { useAppTablePaging } from '../../lib/appDataTable';
import {
  AppTable, AppTableBody, AppTablePager, AppTableTd, AppTableTh, AppTableThead, AppTableTr, AppTableWrap,
} from '../../components/ui/AppDataTable';
import { HR_BTN_PRIMARY, HR_BTN_SECONDARY, HR_FIELD_CLASS } from '../../components/hr/hrFormStyles';
import { navigateToHrLetter, transferLetterKind } from '../../lib/hrLetterDeepLink';

const emptyForm = () => ({
  userId: '',
  transferType: 'inter_branch',
  toBranchId: '',
  toDepartment: '',
  toDesignation: '',
  effectiveDateIso: new Date().toISOString().slice(0, 10),
  reason: '',
  notes: '',
  mdPolicyException: false,
  policyExceptionReason: '',
  submit: true,
});

const TRANSFER_VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'queue', label: 'Pending queue' },
  { id: 'all', label: 'All transfers' },
];

export default function HrTransfers({ embedded = false } = {}) {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { show: toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const transferIdParam = searchParams.get('transferId') || '';
  const scopeParam = searchParams.get('scope') || '';
  const viewParam = searchParams.get('transferView') || 'overview';
  const perms = ws?.permissions || [];
  const canManage = canManageHrTransfers(perms);
  const canEndorse = canEndorseBranchHr(perms);
  const canGm = canGmApproveHrRequests(perms);
  const canLetter = canGenerateHrLetters(perms);

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
  const [transferView, setTransferView] = useState(
    TRANSFER_VIEWS.some((v) => v.id === viewParam) ? viewParam : 'overview'
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [detailTransfer, setDetailTransfer] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalException, setApprovalException] = useState({ mdPolicyException: false, policyExceptionReason: '' });

  useHrListLoad(async () => {
    const [staffRes, deptRes] = await Promise.all([apiFetch('/api/hr/staff'), fetchHrDepartments()]);
    if (staffRes.ok && staffRes.data?.ok) setStaff(staffRes.data.staff || []);
    if (deptRes.ok && deptRes.data?.ok) setDepartments(deptRes.data.departments || []);
    return { hasData: true };
  }, []);

  const { loading, error, reload } = useHrListLoad(async () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    else if (transferView === 'queue') params.pending = '1';
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
  }, [statusFilter, transferView]);

  useEffect(() => {
    if (scopeParam && TRANSFER_QUEUE_SCOPES[scopeParam]) {
      setStatusFilter(TRANSFER_QUEUE_SCOPES[scopeParam]);
      if (transferView === 'overview') setTransferView('queue');
    }
  }, [scopeParam, transferView]);

  useEffect(() => {
    if (transferIdParam && !loading) {
      const match = transfers.find((t) => t.id === transferIdParam);
      if (match) setDetailTransfer(match);
    }
  }, [transferIdParam, transfers, loading]);

  const setTransferViewAndUrl = (viewId, extra = {}) => {
    setTransferView(viewId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('transferView', viewId);
      if (extra.scope) next.set('scope', extra.scope);
      else if (viewId === 'overview') {
        next.delete('scope');
        next.delete('transferId');
      }
      if (extra.clearTransferId) next.delete('transferId');
      return next;
    });
  };

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
      const msg = data?.error || 'Could not create transfer.';
      toast(
        data?.policyBlocked
          ? `${msg} Check “MD / GMHR policy exception” and enter the exception memo reason.`
          : msg,
        { variant: 'error' }
      );
      return;
    }
    toast('Transfer request submitted.', { variant: 'success' });
    setModalOpen(false);
    setForm(emptyForm());
    reload();
  };

  const doAction = async (id, action, extra = {}) => {
    if (
      (action === 'approve' || action === 'gm_approval') &&
      approvalException.mdPolicyException &&
      !String(approvalException.policyExceptionReason || '').trim()
    ) {
      toast('Enter the MD / GMHR exception reason before continuing.', { variant: 'error' });
      return;
    }
    setBusy(true);
    const payload = { action, ...extra };
    if (action === 'approve' || action === 'gm_approval') {
      if (approvalException.mdPolicyException) {
        payload.mdPolicyException = true;
        payload.policyExceptionReason = approvalException.policyExceptionReason;
      }
    }
    const { ok, data } = await patchHrTransferRequest(id, payload);
    setBusy(false);
    if (!ok || !data?.ok) {
      const msg = data?.error || 'Action failed.';
      toast(
        data?.policyBlocked
          ? `${msg} Record MD/GMHR exception below, then approve again.`
          : msg,
        { variant: 'error' }
      );
      return;
    }
    toast(`Transfer ${action.replace(/_/g, ' ')}.`, { variant: 'success' });
    setDetailTransfer(null);
    setRejectReason('');
    setApprovalException({ mdPolicyException: false, policyExceptionReason: '' });
    reload();
  };

  const transferNeedsTenureGate = (t) =>
    t &&
    ((t.status === 'gm_approval' && (canGm || canManage)) ||
      (t.status === 'hr_review' && canManage));

  const transferActions = (t) => {
    const actions = [];
    if (t.status === 'branch_review' && (canManage || canEndorse)) {
      actions.push({ key: 'hr_review', label: 'Endorse → HR' });
    }
    if (t.status === 'hr_review' && canManage) {
      actions.push({
        key: 'approve',
        label: t.requiresGmApproval ? 'Send to GM/MD' : 'Approve',
      });
    }
    if (t.status === 'gm_approval' && canGm) {
      actions.push({ key: 'approve', label: 'GM approve' });
    }
    if (t.status === 'approved' && canManage) {
      actions.push({ key: 'complete', label: 'Complete transfer' });
    }
    if (t.status === 'rejected' && canManage) {
      actions.push({ key: 'resubmit', label: 'Resubmit' });
    }
    if (canManage && !['completed', 'cancelled', 'rejected'].includes(t.status)) {
      actions.push({ key: 'reject', label: 'Reject', variant: 'danger' });
    }
    return actions;
  };

  const reviewRec = async (id, status) => {
    const { ok, data } = await reviewHrTransferRecommendation(id, { status });
    if (ok && data?.ok) {
      toast(`Recommendation ${status}.`, { variant: 'success' });
      reload();
    }
  };

  const pendingCount = transfers.filter((t) => ['submitted', 'branch_review', 'hr_review', 'gm_approval', 'approved'].includes(t.status)).length;
  const transferPaging = useAppTablePaging(transfers, 20, statusFilter, transferView);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {!embedded ? (
          <p className="text-sm text-slate-600 max-w-2xl">
            Branch review → HR review → GM approval (when required) → complete on effective date. Profile updates on completion.
          </p>
        ) : null}
        {canManage ? (
          <HrAddFormButton onClick={() => { setForm(emptyForm()); setModalOpen(true); }}>Initiate transfer</HrAddFormButton>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
        {TRANSFER_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setTransferViewAndUrl(v.id, { clearTransferId: true })}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              transferView === v.id ? 'bg-teal-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {transferView === 'overview' ? (
        <HrTransfersOverview
          canManage={canManage || canEndorse}
          onOpenQueue={(scope) => {
            setStatusFilter(TRANSFER_QUEUE_SCOPES[scope] || '');
            setTransferViewAndUrl('queue', { scope });
          }}
        />
      ) : null}

      {(transferView === 'queue' || transferView === 'all') ? (
        <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HrCard className="!p-3">
          <p className="text-xs font-black uppercase text-slate-500">Pending</p>
          <p className="text-xl font-black tabular-nums text-amber-900">{pendingCount}</p>
        </HrCard>
        <HrCard className="!p-3">
          <p className="text-xs font-black uppercase text-slate-500">Completed</p>
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
        {!loading && !transfers.length ? (
          <HrEmptyState title="No transfer requests" description="Initiate a transfer to move staff between branches or departments." />
        ) : (
          <HrDualView
            mobile={
              <HrMobileCardList loading={loading && !transfers.length} loadingMessage="Loading transfers…" emptyMessage="No transfer requests.">
                {transferPaging.slice.map((t) => (
                  <HrMobileCard
                    key={t.id}
                    title={t.staffDisplayName}
                    titleLink={`${HR_EMPLOYEES}/${encodeURIComponent(t.userId)}`}
                    badge={<HrStatusBadge status={t.status} variant="transfer" />}
                    fields={[
                      { label: 'Type', value: String(t.transferType || '').replace(/_/g, ' ') },
                      { label: 'Route', value: `${branchName[t.fromBranchId] || t.fromBranchId || '—'} → ${branchName[t.toBranchId] || t.toDepartment || '—'}`, colSpan: 2 },
                      { label: 'Effective', value: t.effectiveDateIso || '—' },
                    ]}
                    footer={
                      <button type="button" className="text-xs font-bold uppercase text-zarewa-teal" onClick={() => setDetailTransfer(t)}>
                        Details
                      </button>
                    }
                  />
                ))}
              </HrMobileCardList>
            }
            desktop={
              <AppTableWrap>
                <AppTable>
                  <AppTableThead>
                    <AppTableTh>Employee</AppTableTh>
                    <AppTableTh>Type</AppTableTh>
                    <AppTableTh>Route</AppTableTh>
                    <AppTableTh>Effective</AppTableTh>
                    <AppTableTh>Status</AppTableTh>
                    <AppTableTh align="right">Action</AppTableTh>
                  </AppTableThead>
                  <AppTableBody>
                    {loading && !transfers.length ? (
                      <HrTableLoadingRow colSpan={6} message="Loading transfers…" />
                    ) : null}
                    {transferPaging.slice.map((t) => (
                      <AppTableTr key={t.id}>
                        <AppTableTd>
                          <Link to={`${HR_EMPLOYEES}/${encodeURIComponent(t.userId)}`} className="font-semibold text-zarewa-teal hover:underline">
                            {t.staffDisplayName}
                          </Link>
                        </AppTableTd>
                        <AppTableTd>{String(t.transferType || '').replace(/_/g, ' ')}</AppTableTd>
                        <AppTableTd>{`${branchName[t.fromBranchId] || t.fromBranchId || '—'} → ${branchName[t.toBranchId] || t.toDepartment || '—'}`}</AppTableTd>
                        <AppTableTd>{t.effectiveDateIso || '—'}</AppTableTd>
                        <AppTableTd><HrStatusBadge status={t.status} variant="transfer" /></AppTableTd>
                        <AppTableTd align="right" truncate={false}>
                          <button type="button" className="text-xs font-bold uppercase text-zarewa-teal" onClick={() => setDetailTransfer(t)}>Details</button>
                        </AppTableTd>
                      </AppTableTr>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableWrap>
            }
          />
        )}
        {transferPaging.total > transferPaging.pageSize ? (
          <AppTablePager
            showingFrom={transferPaging.showingFrom}
            showingTo={transferPaging.showingTo}
            total={transferPaging.total}
            hasPrev={transferPaging.hasPrev}
            hasNext={transferPaging.hasNext}
            onPrev={transferPaging.goPrev}
            onNext={transferPaging.goNext}
          />
        ) : null}
      </HrCard>
        </>
      ) : null}

      {transferView === 'all' && recommendations.length > 0 ? (
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
          <div className="sm:col-span-2 rounded-lg border border-amber-100 bg-amber-50/60 p-3 space-y-2">
            <p className="text-xs text-amber-900">
              Tenure policy: branch transfers require 3 years; internal rotations require 2 years (branch managers exempt from internal minimum).
            </p>
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={Boolean(form.mdPolicyException)}
                onChange={(e) => setForm({ ...form, mdPolicyException: e.target.checked })}
              />
              MD / GMHR policy exception (written memo on file)
            </label>
            {form.mdPolicyException ? (
              <label className="block text-xs font-semibold text-slate-600">
                Exception reason
                <textarea
                  className={HR_FIELD_CLASS}
                  rows={2}
                  value={form.policyExceptionReason}
                  onChange={(e) => setForm({ ...form, policyExceptionReason: e.target.value })}
                  placeholder="Reference MD memo, date, and business justification"
                  required
                />
              </label>
            ) : null}
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={busy} className={HR_BTN_PRIMARY}>{busy ? 'Submitting…' : 'Submit transfer'}</button>
            <button type="button" className={HR_BTN_SECONDARY} onClick={() => setModalOpen(false)}>Cancel</button>
          </div>
        </form>
      </HrFormModal>

      <HrFormModal
        isOpen={Boolean(detailTransfer)}
        onClose={() => {
          setDetailTransfer(null);
          setRejectReason('');
          setApprovalException({ mdPolicyException: false, policyExceptionReason: '' });
        }}
        title="Transfer details"
        size="lg"
      >
        {detailTransfer ? (
          <div className="space-y-4 text-sm">
            <HrTransferStageBar transferType={detailTransfer.transferType} status={detailTransfer.status} />
            <div className="grid gap-2 sm:grid-cols-2">
              <p><span className="text-slate-500">Employee:</span> <strong>{detailTransfer.staffDisplayName}</strong></p>
              <p><span className="text-slate-500">Type:</span> {String(detailTransfer.transferType || '').replace(/_/g, ' ')}</p>
              <p><span className="text-slate-500">Status:</span> <HrStatusBadge status={detailTransfer.status} variant="transfer" /></p>
              <p><span className="text-slate-500">Effective:</span> {detailTransfer.effectiveDateIso || '—'}</p>
              <p className="sm:col-span-2"><span className="text-slate-500">Route:</span> {branchName[detailTransfer.fromBranchId] || detailTransfer.fromBranchId} → {branchName[detailTransfer.toBranchId] || detailTransfer.toDepartment || '—'}</p>
              <p className="sm:col-span-2"><span className="text-slate-500">Reason:</span> {detailTransfer.reason || '—'}</p>
              {detailTransfer.notes ? (
                <p className="sm:col-span-2 text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                  <span className="font-semibold text-slate-500">Notes:</span> {detailTransfer.notes}
                </p>
              ) : null}
              {detailTransfer.rejectionReason ? (
                <p className="sm:col-span-2 text-red-800 bg-red-50 rounded-lg px-3 py-2"><span className="font-semibold">Rejection:</span> {detailTransfer.rejectionReason}</p>
              ) : null}
            </div>
            {(detailTransfer.timeline || []).length ? (
              <div>
                <p className="text-ui-xs font-black uppercase tracking-widest text-slate-400 mb-2">Approval timeline</p>
                <ol className="space-y-2 border-l-2 border-zarewa-teal/20 pl-3">
                  {detailTransfer.timeline.map((ev, idx) => (
                    <li key={idx} className="text-xs">
                      <span className="font-bold text-zarewa-teal">{ev.status?.replace(/_/g, ' ')}</span>
                      {' · '}
                      {ev.at?.slice(0, 16).replace('T', ' ')}
                      {ev.note ? ` — ${ev.note}` : ''}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {detailTransfer.rejecting ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="block text-xs font-semibold text-slate-600">
                  Rejection reason
                  <textarea className={HR_FIELD_CLASS} rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required />
                </label>
                <button
                  type="button"
                  className={HR_BTN_PRIMARY}
                  disabled={!rejectReason.trim() || busy}
                  onClick={() => doAction(detailTransfer.id, 'reject', { rejectionReason: rejectReason.trim() })}
                >
                  Confirm rejection
                </button>
              </div>
            ) : null}
            {canLetter && detailTransfer.status === 'completed' ? (
              <button
                type="button"
                className={HR_BTN_SECONDARY}
                onClick={() => navigateToHrLetter(navigate, {
                  letterKind: transferLetterKind(detailTransfer.transferType),
                  userId: detailTransfer.userId,
                  sourceRecordId: detailTransfer.id,
                  sourceRecordKind: 'transfer',
                  extra: {
                    fromBranch: branchName[detailTransfer.fromBranchId] || detailTransfer.fromBranchId,
                    toBranch: branchName[detailTransfer.toBranchId] || detailTransfer.toBranchId,
                    toDepartment: detailTransfer.toDepartment,
                    toDesignation: detailTransfer.toDesignation,
                    effectiveDate: detailTransfer.effectiveDateIso,
                    sourceRecordId: detailTransfer.id,
                  },
                })}
              >
                Generate transfer letter
              </button>
            ) : null}
            {transferNeedsTenureGate(detailTransfer) && !detailTransfer.rejecting ? (
              <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 space-y-2">
                <p className="text-xs text-amber-900">
                  Tenure is checked before sending to GM and at final approval. Use MD exception only when a written memo is on file.
                </p>
                <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={approvalException.mdPolicyException}
                    onChange={(e) =>
                      setApprovalException((prev) => ({ ...prev, mdPolicyException: e.target.checked }))
                    }
                  />
                  MD / GMHR policy exception
                </label>
                {approvalException.mdPolicyException ? (
                  <textarea
                    className={HR_FIELD_CLASS}
                    rows={2}
                    value={approvalException.policyExceptionReason}
                    onChange={(e) =>
                      setApprovalException((prev) => ({ ...prev, policyExceptionReason: e.target.value }))
                    }
                    placeholder="Exception memo reference and justification"
                  />
                ) : null}
              </div>
            ) : null}
            {canManage && !detailTransfer.rejecting ? (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {transferActions(detailTransfer).map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    className={a.variant === 'danger' ? `${HR_BTN_SECONDARY} !text-red-700 !border-red-200` : HR_BTN_PRIMARY}
                    disabled={busy}
                    onClick={() => {
                      if (a.key === 'reject') {
                        setDetailTransfer({ ...detailTransfer, rejecting: true });
                        return;
                      }
                      doAction(detailTransfer.id, a.key === 'resubmit' ? 'resubmit' : a.key, a.key === 'resubmit' ? { reason: detailTransfer.reason } : {});
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </HrFormModal>
    </div>
  );
}
