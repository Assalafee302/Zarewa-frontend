import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatNgn } from '../../Data/mockData';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { OT_STATUS } from '../../lib/otConstants';
import { getOtRequest, listOtRequests, payOtRequest } from '../../lib/otRequestsApi';
import { OtStatusChip } from '../ot/OtStatusTimeline';

/**
 * Cashier OT mark-paid queue.
 * Intentionally uses GET /api/ot/requests with status=approved_by_bm only —
 * server also hides drafts/pending from cashiers (otVisibleStatusesForUser).
 * No amount/rate fields — payable is locked at BM approve.
 */
export function CashierOtPayPanel() {
  const ws = useWorkspace();
  const { showToast } = useToast();
  const canPay = Boolean(ws?.hasPermission?.('ot.pay') || ws?.hasPermission?.('*'));

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!canPay) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    // Restricted endpoint + explicit approved-only status — not a broader list filtered client-side.
    const res = await listOtRequests({
      status: OT_STATUS.APPROVED,
      limit: 80,
    }).catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setRows([]);
      setError(res.data?.error || 'Could not load OT pay queue.');
      return;
    }
    const list = Array.isArray(res.data?.rows) ? res.data.rows : [];
    // Defensive filter still only within approved — never craft drafts from a wide fetch.
    setRows(list.filter((r) => String(r.status) === OT_STATUS.APPROVED));
  }, [canPay]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = useCallback(async (id) => {
    setSelectedId(id);
    setPaymentNote('');
    setPaymentMethod('cash');
    const res = await getOtRequest(id).catch(() => ({ ok: false }));
    if (!res.ok || res.data?.ok === false) {
      showToast(res.data?.error || 'Could not open OT request', { variant: 'error' });
      setDetail(null);
      return;
    }
    // Server returns 403 OT_STATUS_SCOPE if cashier tries non-approved.
    if (String(res.data?.request?.status) !== OT_STATUS.APPROVED) {
      showToast('This OT request is not ready for pay.', { variant: 'error' });
      setDetail(null);
      await load();
      return;
    }
    setDetail(res.data);
  }, [load, showToast]);

  const handlePay = async () => {
    if (!selectedId || !detail) return;
    setBusy(true);
    // Body: note + method only — backend ignores any amount/rate even if sent.
    const res = await payOtRequest(selectedId, {
      paymentNote,
      paymentMethod,
    }).catch(() => ({ ok: false }));
    setBusy(false);
    if (!res.ok || res.data?.ok === false) {
      showToast(res.data?.error || 'Mark paid failed', { variant: 'error' });
      return;
    }
    showToast(
      `Marked paid · ${formatNgn(res.data?.request?.totalPayableNgn)} (approve-time lock)`,
      { variant: 'success' }
    );
    setDetail(null);
    setSelectedId('');
    await load();
  };

  if (!canPay) return null;

  return (
    <div
      id="desk-queue-ot-pay"
      className="scroll-mt-20 rounded-xl border border-teal-200/80 bg-teal-50/30 shadow-sm"
      data-testid="cashier-ot-pay-panel"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-teal-100/80 px-3 py-2.5">
        <Banknote size={14} className="text-teal-900" aria-hidden />
        <span className="text-ui-xs font-black uppercase tracking-wide text-teal-950">
          Overtime pay · mark paid
        </span>
        <span className="text-ui-xs font-bold tabular-nums text-teal-900">
          {rows.length} approved
        </span>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-1 text-ui-xs font-bold uppercase text-teal-900 hover:underline"
        >
          <RefreshCw size={12} aria-hidden /> Refresh
        </button>
        <Link
          to="/overtime?tab=pay"
          className="inline-flex items-center gap-1 text-ui-xs font-bold uppercase text-teal-900 no-underline hover:underline"
        >
          Full hub <ExternalLink size={11} aria-hidden />
        </Link>
      </div>
      <p className="px-3 py-2 text-ui-xs leading-relaxed text-teal-950/80 border-b border-teal-100/60">
        Payable amounts are locked by the branch manager at approval. Confirm cash/transfer and mark paid only —
        no rate or amount editing.
      </p>

      {error ? (
        <p className="m-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-ui-xs text-amber-950">
          {error}
        </p>
      ) : null}
      {loading ? <p className="px-3 py-6 text-center text-xs text-slate-500">Loading OT pay queue…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-slate-500">No approved OT pay requests waiting.</p>
      ) : null}

      {!loading && rows.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <ul className="max-h-72 overflow-auto divide-y divide-teal-100/80 border-b lg:border-b-0 lg:border-r border-teal-100/80">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => void openDetail(row.id)}
                  className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-teal-50/80 ${
                    selectedId === row.id ? 'bg-teal-50' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-800">{row.id}</span>
                    <OtStatusChip status={row.status} />
                  </div>
                  <span className="text-ui-xs text-slate-600">
                    {row.dayIso} · {row.workType} · {row.approvedByName || 'BM'}
                  </span>
                  <span className="text-sm font-black tabular-nums text-zarewa-teal">
                    {formatNgn(row.totalPayableNgn)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="max-h-72 overflow-auto p-3">
            {!detail ? (
              <p className="py-8 text-center text-xs text-slate-500">Select an approved request to mark paid.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black">{detail.request?.id}</span>
                  <OtStatusChip status={detail.request?.status} />
                </div>
                <div className="rounded-lg border border-teal-200 bg-white p-3">
                  <p className="text-ui-xs font-bold uppercase text-slate-400">Amount to pay (locked)</p>
                  <p className="text-2xl font-black tabular-nums text-zarewa-teal">
                    {formatNgn(detail.request?.totalPayableNgn)}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Approved {detail.request?.approvedAtIso ? new Date(detail.request.approvedAtIso).toLocaleString() : ''}
                    {detail.request?.approvedByName ? ` by ${detail.request.approvedByName}` : ''}
                  </p>
                </div>
                {detail.staffLines?.length ? (
                  <ul className="text-xs text-slate-700">
                    {detail.staffLines.map((s) => (
                      <li key={s.id || s.staffUserId}>
                        {s.displayName || s.username || s.staffUserId}
                        {s.roleLabel ? ` · ${s.roleLabel}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <label className="block">
                  <span className="text-ui-xs font-bold uppercase text-slate-500">Payment method</span>
                  <select
                    className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="transfer">Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-ui-xs font-bold uppercase text-slate-500">Payment note</span>
                  <textarea
                    rows={2}
                    className="z-input mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Optional reference (receipt no, teller…)"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePay()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-zarewa-teal px-3 py-2.5 text-ui-xs font-bold uppercase tracking-wide text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} aria-hidden /> Mark paid
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
