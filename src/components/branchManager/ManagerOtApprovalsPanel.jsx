import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Check, RefreshCw, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatNgn } from '../../Data/mockData';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { OT_STATUS } from '../../lib/otConstants';
import { approveOtRequest, getOtRequest, listOtRequests, rejectOtRequest } from '../../lib/otRequestsApi';
import { FinanceSequencePanel } from '../layout';
import { OtStatusChip, OtStatusTimeline } from '../ot/OtStatusTimeline';

/**
 * Branch manager — OT pay approvals (not attendance OT board).
 * Rate edit requires variance_reason when different from requested.
 */
export function ManagerOtApprovalsPanel({ branchId = '' }) {
  const ws = useWorkspace();
  const { showToast } = useToast();
  const canApprove = Boolean(ws?.hasPermission?.('ot.approve') || ws?.hasPermission?.('*'));

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [rateApproved, setRateApproved] = useState('');
  const [varianceReason, setVarianceReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!canApprove) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    // Server scopes to workspace branch via cookie; status filter is BM queue.
    const res = await listOtRequests({
      status: OT_STATUS.PENDING_BM,
      limit: 80,
    }).catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setRows([]);
      setError(res.data?.error || 'Could not load OT approval queue.');
      return;
    }
    setRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
  }, [canApprove]);

  useEffect(() => {
    void load();
  }, [load, branchId]);

  const openDetail = useCallback(async (id) => {
    setSelectedId(id);
    setRejectReason('');
    const res = await getOtRequest(id).catch(() => ({ ok: false }));
    if (!res.ok || res.data?.ok === false) {
      showToast(res.data?.error || 'Could not open request', { variant: 'error' });
      setDetail(null);
      return;
    }
    setDetail(res.data);
    const reqRate = res.data?.paymentLine?.rateRequested;
    setRateApproved(reqRate != null ? String(reqRate) : '');
    setVarianceReason('');
  }, [showToast]);

  const rateRequested = Number(detail?.paymentLine?.rateRequested) || 0;
  const rateNum = Math.round(Number(rateApproved) || 0);
  const rateChanged = rateNum > 0 && rateNum !== rateRequested;
  const previewPayable = useMemo(() => {
    const q = Number(detail?.paymentLine?.quantity) || 0;
    return Math.round(q * (rateNum || rateRequested));
  }, [detail, rateNum, rateRequested]);

  const handleApprove = async () => {
    if (!selectedId) return;
    if (!(rateNum > 0)) {
      showToast('Enter a positive approved rate', { variant: 'error' });
      return;
    }
    if (rateChanged && String(varianceReason || '').trim().length < 3) {
      showToast('Variance reason required when you change the rate', { variant: 'error' });
      return;
    }
    setBusy(true);
    const body = {
      rateApproved: rateNum,
      varianceReason: rateChanged ? String(varianceReason).trim() : undefined,
    };
    const res = await approveOtRequest(selectedId, body).catch(() => ({ ok: false }));
    setBusy(false);
    if (!res.ok || res.data?.ok === false) {
      showToast(res.data?.error || 'Approve failed', { variant: 'error' });
      return;
    }
    showToast(`Approved · payable ${formatNgn(res.data?.request?.totalPayableNgn)}`, {
      variant: 'success',
    });
    setDetail(null);
    setSelectedId('');
    await load();
  };

  const handleReject = async () => {
    if (!selectedId) return;
    if (String(rejectReason || '').trim().length < 3) {
      showToast('Rejection reason required (min 3 characters)', { variant: 'error' });
      return;
    }
    setBusy(true);
    const res = await rejectOtRequest(selectedId, { reason: rejectReason }).catch(() => ({
      ok: false,
    }));
    setBusy(false);
    if (!res.ok || res.data?.ok === false) {
      showToast(res.data?.error || 'Reject failed', { variant: 'error' });
      return;
    }
    showToast('OT request rejected (terminal — store must create a new request)', {
      variant: 'success',
    });
    setDetail(null);
    setSelectedId('');
    await load();
  };

  if (!canApprove) return null;

  return (
    <FinanceSequencePanel
      className="!min-h-0 sm:!min-h-0 overflow-hidden bg-white p-0"
      data-testid="manager-ot-approvals-panel"
    >
      <div className="flex items-start justify-between gap-3 border-b border-amber-100 bg-amber-50/40 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-900/70">
            OT pay approvals · not attendance board
          </p>
          <h3 className="mt-0.5 flex items-center gap-2 text-sm font-black tracking-tight text-amber-950">
            <Banknote size={16} aria-hidden /> Overtime pay to approve
          </h3>
          <p className="mt-0.5 text-xs text-amber-950/70">
            Pending store requests · set rate (variance reason if changed) · approve or reject
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 text-ui-xs font-bold uppercase text-amber-900 hover:underline"
          >
            <RefreshCw size={12} aria-hidden /> Refresh
          </button>
          <Link
            to="/overtime?tab=approvals"
            className="inline-flex items-center gap-1 text-ui-xs font-bold uppercase text-amber-900 no-underline hover:underline"
          >
            Full hub <ExternalLink size={11} aria-hidden />
          </Link>
        </div>
      </div>

      {error ? (
        <p className="m-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-ui-xs text-amber-950">
          {error}
        </p>
      ) : null}
      {loading ? <p className="px-4 py-8 text-center text-xs text-slate-500">Loading queue…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-slate-500">No OT pay requests awaiting your approval.</p>
      ) : null}

      {!loading && rows.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <ul className="max-h-80 overflow-auto divide-y divide-slate-100 border-b lg:border-b-0 lg:border-r border-slate-100">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => void openDetail(row.id)}
                  className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-amber-50/50 ${
                    selectedId === row.id ? 'bg-amber-50' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-800">{row.id}</span>
                    <OtStatusChip status={row.status} />
                  </div>
                  <span className="text-ui-xs text-slate-600">
                    {row.dayIso} · {row.workType} · {row.createdByName || 'Store'}
                  </span>
                  <span className="text-ui-xs text-slate-500 line-clamp-1">{row.reason || '—'}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="max-h-80 overflow-auto p-3 sm:p-4">
            {!detail ? (
              <p className="py-8 text-center text-xs text-slate-500">Select a request to review rate and approve.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black">{detail.request?.id}</span>
                  <OtStatusChip status={detail.request?.status} />
                </div>
                <p className="text-xs text-slate-700">
                  <span className="font-bold">Reason:</span> {detail.request?.reason || '—'}
                </p>
                <p className="text-xs text-slate-600">
                  {[detail.request?.quotationRef, detail.request?.poId, detail.request?.workType]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {detail.staffLines?.length ? (
                  <div>
                    <p className="text-ui-xs font-bold uppercase text-slate-400">Staff</p>
                    <ul className="mt-1 text-xs text-slate-700">
                      {detail.staffLines.map((s) => (
                        <li key={s.id || s.staffUserId}>
                          {s.displayName || s.username || s.staffUserId}
                          {s.roleLabel ? ` · ${s.roleLabel}` : ''}
                          {s.startTime ? ` · ${s.startTime}–${s.endTime}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <p className="text-ui-xs font-bold uppercase text-slate-500">Rate decision</p>
                  <p className="text-xs text-slate-600">
                    Requested: <span className="font-bold tabular-nums">₦{rateRequested.toLocaleString()}</span>
                    {' · '}Qty: <span className="font-bold tabular-nums">{detail.paymentLine?.quantity ?? '—'}</span>
                    {' · '}Category: {detail.paymentLine?.category || '—'}
                  </p>
                  <label className="block">
                    <span className="text-ui-xs font-bold uppercase text-slate-500">Rate approved (₦)</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold tabular-nums"
                      value={rateApproved}
                      onChange={(e) => setRateApproved(e.target.value)}
                    />
                  </label>
                  {rateChanged ? (
                    <label className="block">
                      <span className="text-ui-xs font-bold uppercase text-amber-800">
                        Variance reason (required)
                      </span>
                      <textarea
                        rows={2}
                        className="z-input mt-1 w-full rounded-lg border border-amber-200 px-2.5 py-1.5 text-sm font-semibold"
                        value={varianceReason}
                        onChange={(e) => setVarianceReason(e.target.value)}
                        placeholder="Why is the approved rate different?"
                      />
                    </label>
                  ) : null}
                  <p className="text-sm font-black tabular-nums text-zarewa-teal">
                    Payable at approve: {formatNgn(previewPayable)}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    This amount is locked for the cashier — they cannot change it at pay time.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleApprove()}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-ui-xs font-bold uppercase text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <Check size={14} aria-hidden /> Approve
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <label className="block">
                    <span className="text-ui-xs font-bold uppercase text-slate-500">Reject reason</span>
                    <textarea
                      rows={2}
                      className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Terminal reject — store must open a new request"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleReject()}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-ui-xs font-bold uppercase text-rose-900 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <X size={14} aria-hidden /> Reject
                  </button>
                </div>

                <div>
                  <p className="mb-1 text-ui-xs font-bold uppercase text-slate-400">Timeline</p>
                  <OtStatusTimeline history={detail.statusHistory} />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </FinanceSequencePanel>
  );
}
