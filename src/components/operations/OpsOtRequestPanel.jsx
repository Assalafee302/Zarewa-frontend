import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { appConfirm } from '../../lib/appConfirm';
import {
  buildOtRequestBody,
  emptyOtFormState,
  formStateFromOtDetail,
  OT_STATUS,
} from '../../lib/otConstants';
import {
  createOtRequest,
  deleteOtRequest,
  getOtRequest,
  listOtRequests,
  submitOtRequest,
  updateOtRequest,
} from '../../lib/otRequestsApi';
import { ModalFrame } from '../layout/ModalFrame';
import { OtRequestForm } from '../ot/OtRequestForm';
import { OtRequestList } from '../ot/OtRequestList';
import { OtStatusChip, OtStatusTimeline } from '../ot/OtStatusTimeline';
import { OtPaymentCalcFields } from '../ot/OtPaymentCalcFields';

/**
 * Operations desk — create/edit/submit branch OT pay requests.
 */
export function OpsOtRequestPanel() {
  const ws = useWorkspace();
  const { show: showToast } = useToast();
  const canRequest = Boolean(ws?.hasPermission?.('ot.request') || ws?.hasPermission?.('*'));
  const userId = ws?.session?.user?.id || '';

  const [filter, setFilter] = useState('mine');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(() => emptyOtFormState());
  const [mode, setMode] = useState(/** @type {'list'|'create'|'edit'|'view'} */ ('list'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  const loadList = useCallback(async () => {
    if (!canRequest) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = { limit: 100 };
    if (filter === 'draft') params.status = OT_STATUS.DRAFT;
    if (filter === 'pending') params.status = OT_STATUS.PENDING_BM;
    if (filter === 'mine' && userId) params.createdByUserId = userId;
    const res = await listOtRequests(params).catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setRows([]);
      setError(res.data?.error || 'Could not load OT requests.');
      return;
    }
    setError('');
    let list = Array.isArray(res.data?.rows) ? res.data.rows : [];
    if (filter === 'mine' && userId) {
      list = list.filter((r) => String(r.createdByUserId) === String(userId));
    }
    setRows(list);
  }, [canRequest, filter, userId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const closeFormModal = useCallback(() => {
    if (savingRef.current) return;
    setMode((m) => (m === 'create' || m === 'edit' ? (selectedId ? 'view' : 'list') : m));
    setError('');
  }, [selectedId]);

  const openDetail = useCallback(
    async (id, { editDraft = false } = {}) => {
      setSelectedId(id);
      const res = await getOtRequest(id).catch(() => ({ ok: false }));
      if (!res.ok || res.data?.ok === false) {
        showToast(res.data?.error || 'Could not open OT request', { variant: 'error' });
        return;
      }
      setDetail(res.data);
      const st = res.data?.request?.status;
      const owner =
        String(res.data?.request?.createdByUserId || '') === String(userId);
      if (st === OT_STATUS.DRAFT && owner && editDraft !== false) {
        setForm(formStateFromOtDetail(res.data));
        setMode('edit');
      } else {
        setMode('view');
      }
    },
    [showToast, userId]
  );

  const startCreate = () => {
    setSelectedId('');
    setDetail(null);
    setForm(emptyOtFormState());
    setError('');
    setMode('create');
  };

  const withSaveLock = async (fn) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await fn();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSaveDraft = () =>
    withSaveLock(async () => {
      const body = buildOtRequestBody(form);
      let res;
      if (mode === 'edit' && selectedId) {
        res = await updateOtRequest(selectedId, body).catch(() => ({ ok: false }));
      } else {
        res = await createOtRequest(body).catch(() => ({ ok: false }));
      }
      if (!res.ok || res.data?.ok === false) {
        setError(res.data?.error || 'Save failed');
        return;
      }
      showToast('Draft saved', { variant: 'success' });
      const id = res.data?.request?.id;
      await loadList();
      if (id) await openDetail(id, { editDraft: true });
    });

  const handleSubmit = () =>
    withSaveLock(async () => {
      const body = buildOtRequestBody(form);
      let id = selectedId;
      if (mode === 'create' || !id) {
        const created = await createOtRequest(body).catch(() => ({ ok: false }));
        if (!created.ok || created.data?.ok === false) {
          setError(created.data?.error || 'Create failed');
          return;
        }
        id = created.data.request.id;
        setSelectedId(id);
      } else {
        const upd = await updateOtRequest(id, body).catch(() => ({ ok: false }));
        if (!upd.ok || upd.data?.ok === false) {
          setError(upd.data?.error || 'Update failed');
          return;
        }
      }
      const sub = await submitOtRequest(id).catch(() => ({ ok: false }));
      if (!sub.ok || sub.data?.ok === false) {
        setError(sub.data?.error || 'Submit failed');
        return;
      }
      showToast('Submitted for branch manager approval', { variant: 'success' });
      await loadList();
      await openDetail(id, { editDraft: false });
    });

  const handleDelete = async (id) => {
    const targetId = id || selectedId;
    if (!targetId || savingRef.current) return;
    const ok = await appConfirm({
      title: 'Delete OT request?',
      message: `Remove ${targetId}? Only drafts and rejected requests can be deleted.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await withSaveLock(async () => {
      const res = await deleteOtRequest(targetId).catch(() => ({ ok: false }));
      if (!res.ok || res.data?.ok === false) {
        showToast(res.data?.error || 'Delete failed', { variant: 'error' });
        setError(res.data?.error || 'Delete failed');
        return;
      }
      showToast('OT request deleted', { variant: 'success' });
      if (selectedId === targetId) {
        setSelectedId('');
        setDetail(null);
        setMode('list');
      }
      await loadList();
    });
  };

  const isDraftOwner =
    detail?.request?.status === OT_STATUS.DRAFT &&
    String(detail?.request?.createdByUserId || '') === String(userId);

  const canDeleteSelected =
    detail?.request &&
    String(detail.request.createdByUserId || '') === String(userId) &&
    (detail.request.status === OT_STATUS.DRAFT || detail.request.status === OT_STATUS.REJECTED);

  const formModalOpen = mode === 'create' || (mode === 'edit' && isDraftOwner);

  if (!canRequest) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
        You need <code className="font-mono text-xs">ot.request</code> to create overtime pay requests.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="ops-ot-request-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black tracking-tight text-zarewa-teal">
            <Clock size={16} aria-hidden /> Overtime pay requests
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Draft → BM approval → cashier mark-paid. One open request per day + quotation/PO.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zarewa-teal px-3 py-2 text-ui-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-teal-800"
        >
          <Plus size={14} aria-hidden /> New OT request
        </button>
      </div>

      {error && mode === 'list' ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">{error}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-2 min-h-[20rem]">
          <OtRequestList
            rows={rows}
            loading={loading}
            selectedId={selectedId}
            onSelect={(id) => void openDetail(id, { editDraft: false })}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          {!detail?.request ? (
            <p className="py-12 text-center text-xs text-slate-500">
              Select a request or create a new OT pay draft.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-slate-900">{detail.request.id}</span>
                <OtStatusChip status={detail.request.status} />
                <div className="ml-auto flex flex-wrap gap-2">
                  {isDraftOwner ? (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(formStateFromOtDetail(detail));
                        setMode('edit');
                        setError('');
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                    >
                      Edit draft
                    </button>
                  ) : null}
                  {canDeleteSelected ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleDelete(detail.request.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-ui-xs font-bold uppercase tracking-wide text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 size={12} aria-hidden /> Delete
                    </button>
                  ) : null}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="font-bold uppercase text-slate-400">Date</dt>
                  <dd className="font-semibold text-slate-800">{detail.request.dayIso}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase text-slate-400">Type</dt>
                  <dd className="font-semibold text-slate-800">{detail.request.workType}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-bold uppercase text-slate-400">Reason</dt>
                  <dd className="font-semibold text-slate-800">{detail.request.reason || '—'}</dd>
                </div>
                {detail.request.quotationRef ? (
                  <div className="col-span-2">
                    <dt className="font-bold uppercase text-slate-400">Quotation</dt>
                    <dd className="font-semibold text-slate-800">{detail.request.quotationRef}</dd>
                  </div>
                ) : null}
                {detail.request.poId ? (
                  <div className="col-span-2">
                    <dt className="font-bold uppercase text-slate-400">PO</dt>
                    <dd className="font-semibold text-slate-800">{detail.request.poId}</dd>
                  </div>
                ) : null}
                {detail.request.rejectionReason ? (
                  <div className="col-span-2">
                    <dt className="font-bold uppercase text-slate-400">Rejection</dt>
                    <dd className="font-semibold text-rose-800">{detail.request.rejectionReason}</dd>
                  </div>
                ) : null}
              </dl>
              <OtPaymentCalcFields value={detail.paymentLine || {}} mode="readonly" onChange={() => {}} />
              <div>
                <h4 className="mb-2 text-ui-xs font-bold uppercase tracking-widest text-slate-500">Timeline</h4>
                <OtStatusTimeline history={detail.statusHistory} />
              </div>
            </div>
          )}
        </div>
      </div>

      <ModalFrame
        isOpen={formModalOpen}
        onClose={closeFormModal}
        title={mode === 'create' ? 'New OT request' : `Edit draft · ${selectedId}`}
        description="Create or edit a branch overtime pay draft."
        surface="plain"
        closeDisabled={saving}
      >
        <div className="flex max-h-[min(92dvh,900px)] w-full max-w-[min(640px,calc(100dvw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3 pr-14 sm:px-5">
            <h3 className="text-sm font-black text-zarewa-teal">
              {mode === 'create' ? 'New OT request' : `Edit draft · ${selectedId}`}
            </h3>
            <p className="mt-0.5 text-ui-xs text-slate-500">
              Same day + quotation/PO cannot be duplicated while an open request exists.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <OtRequestForm
              form={form}
              onChange={setForm}
              saving={saving}
              submitError={error}
              mode={mode}
              onSaveDraft={handleSaveDraft}
              onSubmit={handleSubmit}
              onCancel={closeFormModal}
            />
          </div>
        </div>
      </ModalFrame>
    </div>
  );
}

export default OpsOtRequestPanel;
