import React, { useCallback, useEffect, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import {
  buildOtRequestBody,
  emptyOtFormState,
  formStateFromOtDetail,
  OT_STATUS,
} from '../../lib/otConstants';
import {
  createOtRequest,
  getOtRequest,
  listOtRequests,
  submitOtRequest,
  updateOtRequest,
} from '../../lib/otRequestsApi';
import { OtRequestForm } from '../ot/OtRequestForm';
import { OtRequestList } from '../ot/OtRequestList';
import { OtStatusChip, OtStatusTimeline } from '../ot/OtStatusTimeline';
import { OtPaymentCalcFields } from '../ot/OtPaymentCalcFields';

/**
 * Operations desk — create/edit/submit branch OT pay requests.
 */
export function OpsOtRequestPanel() {
  const ws = useWorkspace();
  const { showToast } = useToast();
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

  const openDetail = useCallback(async (id) => {
    setSelectedId(id);
    const res = await getOtRequest(id).catch(() => ({ ok: false }));
    if (!res.ok || res.data?.ok === false) {
      showToast(res.data?.error || 'Could not open OT request', { variant: 'error' });
      return;
    }
    setDetail(res.data);
    const st = res.data?.request?.status;
    if (st === OT_STATUS.DRAFT) {
      setForm(formStateFromOtDetail(res.data));
      setMode('edit');
    } else {
      setMode('view');
    }
  }, [showToast]);

  const startCreate = () => {
    setSelectedId('');
    setDetail(null);
    setForm(emptyOtFormState());
    setError('');
    setMode('create');
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    const body = buildOtRequestBody(form);
    let res;
    if (mode === 'edit' && selectedId) {
      res = await updateOtRequest(selectedId, body).catch(() => ({ ok: false }));
    } else {
      res = await createOtRequest(body).catch(() => ({ ok: false }));
    }
    setSaving(false);
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Save failed');
      return;
    }
    showToast('Draft saved', { variant: 'success' });
    const id = res.data?.request?.id;
    await loadList();
    if (id) await openDetail(id);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const body = buildOtRequestBody(form);
    let id = selectedId;
    if (mode === 'create' || !id) {
      const created = await createOtRequest(body).catch(() => ({ ok: false }));
      if (!created.ok || created.data?.ok === false) {
        setSaving(false);
        setError(created.data?.error || 'Create failed');
        return;
      }
      id = created.data.request.id;
    } else {
      const upd = await updateOtRequest(id, body).catch(() => ({ ok: false }));
      if (!upd.ok || upd.data?.ok === false) {
        setSaving(false);
        setError(upd.data?.error || 'Update failed');
        return;
      }
    }
    const sub = await submitOtRequest(id).catch(() => ({ ok: false }));
    setSaving(false);
    if (!sub.ok || sub.data?.ok === false) {
      setError(sub.data?.error || 'Submit failed');
      setSelectedId(id);
      return;
    }
    showToast('Submitted for branch manager approval', { variant: 'success' });
    await loadList();
    await openDetail(id);
  };

  const isDraftOwner =
    detail?.request?.status === OT_STATUS.DRAFT &&
    String(detail?.request?.createdByUserId || '') === String(userId);

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
            Store desk · draft → BM approval → cashier mark-paid. Roster staff only.
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
            onSelect={(id) => void openDetail(id)}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          {mode === 'list' ? (
            <p className="py-12 text-center text-xs text-slate-500">
              Select a request or create a new OT pay draft.
            </p>
          ) : null}
          {mode === 'create' || (mode === 'edit' && isDraftOwner) ? (
            <>
              <h3 className="mb-3 text-ui-xs font-bold uppercase tracking-widest text-slate-500">
                {mode === 'create' ? 'New draft' : `Edit draft · ${selectedId}`}
              </h3>
              <OtRequestForm
                form={form}
                onChange={setForm}
                saving={saving}
                submitError={error}
                mode={mode}
                onSaveDraft={handleSaveDraft}
                onSubmit={handleSubmit}
              />
            </>
          ) : null}
          {mode === 'view' || (mode === 'edit' && !isDraftOwner) ? (
            detail?.request ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-900">{detail.request.id}</span>
                  <OtStatusChip status={detail.request.status} />
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
                </dl>
                <OtPaymentCalcFields value={detail.paymentLine || {}} mode="readonly" onChange={() => {}} />
                <div>
                  <h4 className="mb-2 text-ui-xs font-bold uppercase tracking-widest text-slate-500">Timeline</h4>
                  <OtStatusTimeline history={detail.statusHistory} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Loading detail…</p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default OpsOtRequestPanel;
