import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import { userMaySeeManagementApprovalQueues } from '../../lib/workItemPersonalInbox.js';
import {
  coilRequestIsApproved,
  coilRequestIsPending,
  coilRequestQtyUnit,
  coilRequestStatusLabel,
  formatCoilRequestQty,
  STORE_STOCK_BUY_PATH,
} from '../../lib/coilRequestStatus';

/** Avoid "0.24mm mm" when gauge already includes mm from master data. */
function formatGaugeDisplay(raw) {
  const g = String(raw ?? '').trim();
  if (!g) return '—';
  if (/mm$/i.test(g)) return g;
  return `${g} mm`;
}

/**
 * Coil / material request triage — BM approves pending stock requests for buy path.
 */
export default function WorkspaceCoilMaterialPanel({ item, onDone }) {
  const ws = useWorkspace();
  const wsRefresh = ws?.refresh;
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [materialRows, setMaterialRows] = useState([]);

  const sourceKind = String(item?.sourceKind || '').trim().toLowerCase();
  const sourceId = String(item?.sourceId || '').trim();
  const permissions = ws?.snapshot?.permissions ?? ws?.snapshot?.session?.permissions ?? [];
  const roleKey = ws?.snapshot?.session?.user?.roleKey;
  const canBmApprove = useMemo(
    () => userMaySeeManagementApprovalQueues(roleKey, permissions),
    [roleKey, permissions]
  );

  const coilRow = useMemo(() => {
    if (sourceKind !== 'coil_request' || !sourceId) return null;
    const rows = Array.isArray(ws?.snapshot?.coilRequests) ? ws.snapshot.coilRequests : [];
    return rows.find((r) => String(r.id || '').trim() === sourceId) || null;
  }, [sourceKind, sourceId, ws?.snapshot?.coilRequests]);

  useEffect(() => {
    if (sourceKind !== 'material_request' || !sourceId) {
      setMaterialRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch('/api/material-requests');
      if (cancelled) return;
      if (!ok || !data?.ok) {
        setMaterialRows([]);
        return;
      }
      const list = Array.isArray(data.requests) ? data.requests : [];
      setMaterialRows(list.filter((r) => String(r.id || '').trim() === sourceId));
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceKind, sourceId]);

  const approveCoil = useCallback(async () => {
    if (!sourceId || sourceKind !== 'coil_request') return;
    if (!canBmApprove) {
      showToast('Branch manager (or MD) must approve stock requests.', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const { ok, data } = await apiFetch(`/api/coil-requests/${encodeURIComponent(sourceId)}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      if (!ok || data?.ok === false) {
        showToast(data?.error || 'Could not approve.', { variant: 'error' });
        return;
      }
      showToast('Approved — MD/Procurement can buy.');
      await wsRefresh?.();
      onDone?.();
    } finally {
      setBusy(false);
    }
  }, [onDone, showToast, sourceId, sourceKind, canBmApprove, wsRefresh]);

  const mr = materialRows[0];
  const pendingCoil = coilRow && coilRequestIsPending(coilRow.status);
  const approvedCoil = coilRow && coilRequestIsApproved(coilRow.status);
  const qtyUnit = coilRow ? coilRequestQtyUnit(coilRow) : 'kg';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-white px-4 py-5">
      <p className="text-ui-xs font-semibold uppercase tracking-wide text-teal-900/80">Stock request</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{item?.title || 'Material request'}</h2>
      <p className="mt-2 text-sm text-slate-600">{item?.summary || '—'}</p>
      <p className="mt-1 font-mono text-xs text-slate-500">{sourceId}</p>

      {sourceKind === 'coil_request' && coilRow ? (
        <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm">
          <p>
            <span className="font-medium text-slate-700">Gauge:</span> {formatGaugeDisplay(coilRow.gauge)}
          </p>
          <p>
            <span className="font-medium text-slate-700">Colour:</span> {coilRow.colour ?? '—'}
          </p>
          <p>
            <span className="font-medium text-slate-700">Material:</span> {coilRow.materialType ?? '—'}
          </p>
          <p>
            <span className="font-medium text-slate-700">Requested:</span>{' '}
            {coilRow.requestedKg != null ? formatCoilRequestQty(coilRow.requestedKg, qtyUnit) : '—'}
          </p>
          <p>
            <span className="font-medium text-slate-700">Status:</span>{' '}
            <span
              className={`inline-flex rounded-md px-1.5 py-0.5 text-ui-xs font-bold ${
                pendingCoil
                  ? 'bg-amber-50 text-amber-950 border border-amber-200'
                  : approvedCoil
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-slate-100 text-slate-700'
              }`}
            >
              {coilRequestStatusLabel(coilRow.status)}
            </span>
          </p>
        </div>
      ) : null}

      {sourceKind === 'material_request' && mr ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm text-slate-800">
          <p className="font-medium text-slate-700">Material request record</p>
          <p className="mt-1 text-xs text-slate-600">Status: {String(mr.status || '—')}</p>
          {mr.summary ? <p className="mt-2 text-sm">{mr.summary}</p> : null}
        </div>
      ) : sourceKind === 'material_request' ? (
        <p className="mt-4 text-sm text-amber-800">Could not load material request details.</p>
      ) : null}

      {sourceKind === 'coil_request' && pendingCoil && canBmApprove ? (
        <div className="mt-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => void approveCoil()}
            className="inline-flex items-center gap-2 rounded-xl bg-zarewa-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0f3d3a] disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Approve for purchase'}
          </button>
          <p className="mt-2 text-xs text-slate-500">{STORE_STOCK_BUY_PATH}.</p>
        </div>
      ) : sourceKind === 'coil_request' && pendingCoil && !canBmApprove ? (
        <p className="mt-6 text-sm text-amber-900">Awaiting branch manager approval before procurement can buy.</p>
      ) : sourceKind === 'coil_request' && approvedCoil ? (
        <p className="mt-6 text-sm text-emerald-800">Approved — MD/Procurement can raise the PO.</p>
      ) : sourceKind === 'coil_request' ? (
        <p className="mt-6 text-sm text-slate-600">This stock request is not awaiting approval.</p>
      ) : sourceKind === 'material_request' ? (
        <p className="mt-6 text-sm text-slate-600">
          This material request is tracked in the workspace; fulfilment is handled by procurement and operations using
          their standard workflows.
        </p>
      ) : (
        <p className="mt-6 text-sm text-slate-600">Unsupported material source.</p>
      )}
    </div>
  );
}
