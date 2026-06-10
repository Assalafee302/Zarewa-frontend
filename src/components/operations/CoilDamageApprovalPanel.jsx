import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { apiFetch } from '../../lib/apiBase';
import { coilDamagePreview } from '../../lib/coilDamageRecordCore';
import { fmtConv2 } from '../../lib/conversionKgPerM';
import { INCIDENT_TYPES, RETURN_DISPOSITIONS } from '../../lib/materialIncidentConstants';
import { ZareApprovalHint } from '../ZareApprovalHint';

function canApproveMaterialIncident(ws) {
  const role = String(ws?.user?.roleKey || '').trim().toLowerCase();
  return (
    ws?.hasPermission?.('material_incidents.approve') ||
    ['admin', 'md', 'sales_manager', 'branch_manager', 'operations_manager'].includes(role)
  );
}

function incidentTypeLabel(id) {
  return INCIDENT_TYPES.find((t) => t.id === id)?.label || id || '—';
}

function dispositionLabel(id) {
  return RETURN_DISPOSITIONS.find((t) => t.id === id)?.label || id || '—';
}

/**
 * Branch manager queue for coil damage / production-error material incidents.
 */
export default function CoilDamageApprovalPanel() {
  const { show: showToast } = useToast();
  const ws = useWorkspace();
  const { materialIncidents, refreshInventory } = useInventory();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState({});
  const [actingId, setActingId] = useState('');

  const canApprove = canApproveMaterialIncident(ws);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiFetch('/api/coil-control/coil-damage/pending');
      if (ok && Array.isArray(data?.rows)) {
        setRows(data.rows);
        return;
      }
      const fallback = (materialIncidents || []).filter(
        (r) => r.status === 'submitted' && (r.incidentType === 'coil_stain' || r.incidentType === 'production_error')
      );
      setRows(fallback);
    } catch {
      const fallback = (materialIncidents || []).filter(
        (r) => r.status === 'submitted' && (r.incidentType === 'coil_stain' || r.incidentType === 'production_error')
      );
      setRows(fallback);
    } finally {
      setLoading(false);
    }
  }, [materialIncidents]);

  useEffect(() => {
    void loadPending();
  }, [loadPending, ws?.refreshEpoch]);

  const enrichedRows = useMemo(
    () =>
      rows.map((r) => {
        const preview =
          r.preview ||
          coilDamagePreview({
            beforeKg: r.beforeKg,
            afterKg: r.afterKg,
            meters: r.totalMeters,
            supplierConversionKgPerM: r.conversionKgPerM,
          });
        return { ...r, preview };
      }),
    [rows]
  );

  const approve = async (id) => {
    if (!canApprove) return showToast('You do not have permission to approve material incidents.', { variant: 'error' });
    setActingId(id);
    try {
      const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ managerRemark: String(remarks[id] || '').trim() || 'Approved — coil damage posted.' }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Approval failed.', { variant: 'error' });
        return;
      }
      showToast(`${id} approved — stock updated.`);
      setRemarks((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      await ws.refresh?.();
      if (refreshInventory) refreshInventory();
      await loadPending();
    } finally {
      setActingId('');
    }
  };

  const reject = async (id) => {
    if (!canApprove) return showToast('You do not have permission to reject material incidents.', { variant: 'error' });
    const remark = String(remarks[id] || '').trim();
    if (remark.length < 3) {
      return showToast('Enter a rejection reason in the remark field (at least 3 characters).', { variant: 'error' });
    }
    setActingId(id);
    try {
      const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        body: JSON.stringify({ managerRemark: remark }),
      });
      if (!ok || !data?.ok) {
        showToast(data?.error || 'Rejection failed.', { variant: 'error' });
        return;
      }
      showToast(`${id} rejected.`);
      setRemarks((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      await ws.refresh?.();
      if (refreshInventory) refreshInventory();
      await loadPending();
    } finally {
      setActingId('');
    }
  };

  if (!enrichedRows.length && !loading) return null;

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50/80 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-amber-900" aria-hidden />
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-amber-950">
              Pending coil damage approval
            </h2>
            <p className="text-[11px] text-amber-900/80 mt-0.5">
              {enrichedRows.length} incident{enrichedRows.length === 1 ? '' : 's'} awaiting branch manager sign-off
              before kg and metres post to stock.
            </p>
          </div>
        </div>
        <button type="button" className="z-btn-secondary text-[10px]" onClick={() => loadPending()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {!canApprove ? (
        <ZareApprovalHint
          context={{
            documentType: 'material_incident',
            status: 'submitted',
            canApprove: false,
            missingPermission: 'Coil damage approval requires branch manager or material_incidents.approve permission.',
            zareQuery: 'Why can’t I approve coil damage incidents?',
          }}
        />
      ) : null}

      <div className="space-y-3">
        {enrichedRows.map((r) => (
          <div key={r.id} className="rounded-xl border border-amber-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-mono font-bold text-sm text-[#134e4a]">{r.id}</p>
                <p className="text-xs text-slate-600">
                  {incidentTypeLabel(r.incidentType)} ·{' '}
                  <Link
                    to={`/operations/coils/${encodeURIComponent(r.coilNo || '')}`}
                    className="font-semibold text-sky-800 underline underline-offset-2"
                  >
                    {r.coilNo || '—'}
                  </Link>{' '}
                  · {r.gaugeLabel || '—'} {r.colour || ''}
                </p>
              </div>
              <p className="text-[10px] font-semibold text-slate-500">{r.dateISO || '—'}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-bold uppercase text-slate-400">Before kg</p>
                <p className="font-mono font-bold tabular-nums">{r.beforeKg != null ? Number(r.beforeKg).toFixed(0) : '—'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-bold uppercase text-slate-400">After kg</p>
                <p className="font-mono font-bold tabular-nums">{r.afterKg != null ? Number(r.afterKg).toFixed(0) : '—'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-bold uppercase text-slate-400">Damaged m</p>
                <p className="font-mono font-bold tabular-nums">{Number(r.totalMeters || 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-bold uppercase text-slate-400">Disposition</p>
                <p className="font-semibold text-slate-700">{dispositionLabel(r.returnDisposition)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2 text-[11px] text-slate-700">
              <span className="font-bold text-[#134e4a]">Kg removed:</span>{' '}
              <span className="font-mono tabular-nums">
                {r.preview?.kgDeducted != null ? `${r.preview.kgDeducted.toFixed(2)} kg` : '—'}
              </span>
              {' · '}
              <span className="font-bold text-[#134e4a]">Conversion:</span>{' '}
              <span className="font-mono tabular-nums">{fmtConv2(r.preview?.actualConversionKgPerM, { suffix: 'kg/m' })}</span>
              {r.preview?.variancePct != null ? (
                <span className={Math.abs(r.preview.variancePct) > 15 ? ' text-amber-800 font-semibold' : ''}>
                  {' '}
                  ({r.preview.variancePct > 0 ? '+' : ''}
                  {r.preview.variancePct}% vs supplier)
                </span>
              ) : null}
            </div>

            {(r.storekeeperRemark || r.productionJobId || r.quotationRef) && (
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {r.storekeeperRemark ? <span>{r.storekeeperRemark}</span> : null}
                {r.productionJobId ? (
                  <span className="block text-slate-500">Job: {r.productionJobId}</span>
                ) : null}
                {r.quotationRef ? <span className="block text-slate-500">QT: {r.quotationRef}</span> : null}
              </p>
            )}

            {canApprove ? (
              <div className="flex flex-wrap gap-2 items-end pt-1">
                <input
                  className="z-input text-xs min-w-[14rem] flex-1"
                  placeholder="Manager remark (required to reject)"
                  value={remarks[r.id] || ''}
                  onChange={(e) => setRemarks((s) => ({ ...s, [r.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="z-btn-primary text-xs"
                  disabled={actingId === r.id}
                  onClick={() => approve(r.id)}
                >
                  {actingId === r.id ? 'Posting…' : 'Approve & post'}
                </button>
                <button
                  type="button"
                  className="z-btn-secondary text-xs"
                  disabled={actingId === r.id}
                  onClick={() => reject(r.id)}
                >
                  Reject
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-amber-900/70">
        Full register:{' '}
        <Link to="/operations/material-exceptions" className="font-bold underline underline-offset-2">
          Material exceptions → Pending
        </Link>
      </p>
    </section>
  );
}
