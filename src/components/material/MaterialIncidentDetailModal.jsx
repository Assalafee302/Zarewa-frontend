import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Printer, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ModalFrame } from '../layout/ModalFrame';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../lib/apiBase';
import { coilDamagePreview, isCoilDamageIncident } from '../../lib/coilDamageRecordCore';
import { fmtConv2 } from '../../lib/conversionKgPerM';
import {
  INCIDENT_STATUS_LABEL,
  INCIDENT_TYPES,
  RETURN_DISPOSITIONS,
} from '../../lib/materialIncidentConstants';

function typeLabel(id) {
  return INCIDENT_TYPES.find((t) => t.id === id)?.label || id || '—';
}

function dispositionLabel(id) {
  return RETURN_DISPOSITIONS.find((t) => t.id === id)?.label || id || '—';
}

function fmtIso(iso) {
  const s = String(iso || '').trim();
  if (!s) return '—';
  return s.slice(0, 19).replace('T', ' ');
}

function Chip({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-ui-xs font-semibold text-slate-700">
      <span className="text-slate-400 uppercase text-ui-xs">{label}</span>
      {value}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-ui-xs font-black uppercase tracking-widest text-zarewa-teal border-b border-slate-100 pb-1">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Popup modal — full incident reference, audit trail, production issues, and manager actions.
 */
export default function MaterialIncidentDetailModal({
  isOpen,
  onClose,
  incidentId = '',
  canApprove = false,
  managerRemark = '',
  onManagerRemarkChange,
  onApprove,
  onReject,
  onPrint,
  onUpdated,
  externalBusy = false,
}) {
  const { show: showToast } = useToast();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const decisionLocked = acting || externalBusy;

  const load = useCallback(async () => {
    const id = String(incidentId || '').trim();
    if (!id) return;
    setLoading(true);
    try {
      const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(id)}`);
      if (ok && data?.incident) setIncident(data.incident);
      else {
        setIncident(null);
        showToast(data?.error || 'Could not load incident.', { variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }, [incidentId, showToast]);

  useEffect(() => {
    if (!isOpen || !incidentId) {
      setIncident(null);
      return;
    }
    void load();
  }, [isOpen, incidentId, load]);

  const preview = useMemo(() => {
    if (!incident || !isCoilDamageIncident(incident)) return null;
    return coilDamagePreview({
      beforeKg: incident.beforeKg,
      afterKg: incident.afterKg,
      meters: incident.totalMeters,
      supplierConversionKgPerM: incident.conversionKgPerM,
    });
  }, [incident]);

  const copyId = async () => {
    if (!incident?.id) return;
    try {
      await navigator.clipboard.writeText(incident.id);
      showToast(`Copied ${incident.id}`);
    } catch {
      showToast(incident.id, { variant: 'info' });
    }
  };

  const handlePrint = async () => {
    if (!incident?.id) return;
    if (onPrint) {
      await onPrint(incident.id);
      return;
    }
    const { ok, data } = await apiFetch(`/api/material-incidents/${encodeURIComponent(incident.id)}/print-payload`);
    if (!ok || !data?.payload) {
      showToast(data?.error || 'Print data unavailable', { variant: 'error' });
    }
  };

  const lines = Array.isArray(incident?.lines) ? incident.lines : [];
  const issues = Array.isArray(incident?.issues) ? incident.issues : [];

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={() => !decisionLocked && onClose?.()}
      title={`Material incident ${incidentId || ''}`}
      surface="plain"
      showCloseButton={false}
      closeDisabled={decisionLocked}
    >
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[min(92dvh,900px)] flex flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="min-w-0">
            <p className="text-ui-xs font-bold uppercase tracking-widest text-slate-400">Tracking reference</p>
            <p className="font-mono text-2xl font-black text-zarewa-teal tracking-tight truncate">
              {incident?.id || incidentId || '—'}
            </p>
            {incident ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-ui-xs font-bold uppercase ${
                    incident.status === 'posted'
                      ? 'bg-teal-100 text-teal-900'
                      : incident.status === 'submitted'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {INCIDENT_STATUS_LABEL[incident.status] || incident.status}
                </span>
                <span className="text-xs text-slate-500">{typeLabel(incident.incidentType)}</span>
                <span className="text-xs text-slate-500">· {incident.dateISO}</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={decisionLocked}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
          {loading ? (
            <p className="text-sm text-slate-500">Loading incident…</p>
          ) : !incident ? (
            <p className="text-sm text-slate-500">Incident not found.</p>
          ) : (
            <>
              <Section title="Material spec (from coil register)">
                <div className="flex flex-wrap gap-2">
                  <Chip label="Coil" value={incident.coilNo} />
                  <Chip label="Product" value={incident.productId} />
                  <Chip label="Gauge" value={incident.gaugeLabel} />
                  <Chip label="Colour" value={incident.colour} />
                  <Chip label="Family" value={incident.materialFamily} />
                  <Chip label="Disposition" value={dispositionLabel(incident.returnDisposition)} />
                </div>
                {incident.coilNo ? (
                  <Link
                    to={`/operations/coils/${encodeURIComponent(incident.coilNo)}`}
                    className="text-xs font-semibold text-sky-800 underline underline-offset-2"
                    onClick={onClose}
                  >
                    Open coil profile
                  </Link>
                ) : null}
              </Section>

              {(incident.beforeKg != null || incident.afterKg != null) && (
                <Section title="Kg on roll">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-ui-xs font-bold uppercase text-slate-400">Before kg</p>
                      <p className="font-mono font-bold tabular-nums">{incident.beforeKg ?? '—'}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-ui-xs font-bold uppercase text-slate-400">After kg</p>
                      <p className="font-mono font-bold tabular-nums">{incident.afterKg ?? '—'}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-ui-xs font-bold uppercase text-slate-400">Kg removed</p>
                      <p className="font-mono font-bold tabular-nums">
                        {incident.kgDeducted ?? preview?.kgDeducted ?? '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-ui-xs font-bold uppercase text-slate-400">Conversion</p>
                      <p className="font-mono font-bold tabular-nums">
                        {fmtConv2(incident.conversionKgPerM ?? preview?.actualConversionKgPerM, { suffix: 'kg/m' })}
                      </p>
                    </div>
                  </div>
                </Section>
              )}

              <Section title="Damaged sections">
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-ui-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Length (m)</th>
                        <th className="px-2 py-1.5 text-left">Qty</th>
                        <th className="px-2 py-1.5 text-left">Line (m)</th>
                        <th className="px-2 py-1.5 text-left">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-3 text-center text-slate-400">
                            —
                          </td>
                        </tr>
                      ) : (
                        lines.map((ln) => (
                          <tr key={ln.id} className="border-t border-slate-100">
                            <td className="px-2 py-1.5 font-mono">{ln.lengthM}</td>
                            <td className="px-2 py-1.5 font-mono">{ln.quantity}</td>
                            <td className="px-2 py-1.5 font-mono font-semibold text-orange-700">{ln.totalM}</td>
                            <td className="px-2 py-1.5 text-slate-600">{ln.conditionNote || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                      <tr>
                        <td colSpan={2} className="px-2 py-1.5">
                          Total metres
                        </td>
                        <td className="px-2 py-1.5 font-mono">{Number(incident.totalMeters || 0).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-slate-500">
                          Pool avail: {Number(incident.metersAvailable || 0).toFixed(2)} m
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Section>

              <Section title="Notes">
                <p className="text-xs text-slate-600">
                  <span className="font-bold text-slate-500">Storekeeper:</span>{' '}
                  {incident.storekeeperRemark || '—'}
                </p>
                {incident.managerRemark ? (
                  <p className="text-xs text-slate-600">
                    <span className="font-bold text-slate-500">Manager:</span> {incident.managerRemark}
                  </p>
                ) : null}
                {incident.reasonText ? (
                  <p className="text-xs text-slate-600">
                    <span className="font-bold text-slate-500">Reason:</span> {incident.reasonText}
                  </p>
                ) : null}
              </Section>

              <Section title="Audit trail">
                <ul className="text-xs text-slate-600 space-y-1 font-mono">
                  <li>Created {fmtIso(incident.createdAtIso)} · {incident.storekeeperDisplay || incident.createdByUserId || '—'}</li>
                  <li>Updated {fmtIso(incident.updatedAtIso)}</li>
                  {incident.approvedAtIso ? <li>Approved {fmtIso(incident.approvedAtIso)}</li> : null}
                  {incident.postedAtIso ? <li>Posted to stock {fmtIso(incident.postedAtIso)}</li> : null}
                  <li>Book ref: {incident.bookRef || incident.id}</li>
                </ul>
              </Section>

              {issues.length > 0 ? (
                <Section title="Production use (metres deducted)">
                  <ul className="space-y-1 text-xs">
                    {issues.map((iss) => (
                      <li key={iss.id} className="flex justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                        <span className="font-mono font-semibold text-zarewa-teal">{iss.targetRef || iss.targetKind}</span>
                        <span className="tabular-nums font-bold">{Number(iss.meters).toFixed(2)} m</span>
                        <span className="text-slate-400 text-ui-xs">{fmtIso(iss.issuedAtIso)}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : (
                <p className="text-ui-xs text-slate-500">
                  No production deductions yet — after approval, issue metres from this MEX ID on production complete.
                </p>
              )}

              <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-xs text-slate-700">
                <p className="font-bold text-zarewa-teal uppercase text-ui-xs mb-1">How to use this reference</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>
                    <strong>Production:</strong> pick <span className="font-mono">{incident.id}</span> in offcut supply when completing a job.
                  </li>
                  <li>
                    <strong>Month-end stock:</strong> quote this MEX ID when physical count differs from system.
                  </li>
                  <li>
                    <strong>Physical book:</strong> print and file with the offcut register.
                  </li>
                </ul>
              </div>

              {incident.status === 'submitted' && canApprove ? (
                <label className="block text-sm">
                  <span className="text-ui-xs font-bold uppercase text-slate-500">Manager remark</span>
                  <input
                    className="z-input w-full mt-1 text-xs"
                    placeholder="Required to reject; optional for approve"
                    value={managerRemark}
                    onChange={(e) => onManagerRemarkChange?.(e.target.value)}
                  />
                </label>
              ) : null}
            </>
          )}
        </div>

        <footer className="shrink-0 flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3 bg-white">
          <button type="button" className="z-btn-secondary text-xs" onClick={onClose}>
            Close
          </button>
          {incident ? (
            <>
              <button type="button" className="z-btn-secondary text-xs inline-flex items-center gap-1" onClick={copyId}>
                <Copy size={14} /> Copy ID
              </button>
              <button
                type="button"
                className="z-btn-secondary text-xs inline-flex items-center gap-1"
                onClick={() => void handlePrint()}
              >
                <Printer size={14} /> Print
              </button>
              {incident.status === 'submitted' && canApprove ? (
                <>
                  <button
                    type="button"
                    className="z-btn-primary text-xs flex-1 justify-center"
                    disabled={decisionLocked}
                    onClick={async () => {
                      if (!onApprove) return;
                      setActing(true);
                      try {
                        await onApprove(incident.id);
                        await load();
                        onUpdated?.();
                      } finally {
                        setActing(false);
                      }
                    }}
                  >
                    {decisionLocked ? 'Posting…' : 'Approve & post'}
                  </button>
                  <button
                    type="button"
                    className="z-btn-secondary text-xs"
                    disabled={decisionLocked}
                    onClick={async () => {
                      if (!onReject) return;
                      setActing(true);
                      try {
                        await onReject(incident.id);
                        await load();
                        onUpdated?.();
                      } finally {
                        setActing(false);
                      }
                    }}
                  >
                    Reject
                  </button>
                </>
              ) : null}
            </>
          ) : null}
        </footer>
      </div>
    </ModalFrame>
  );
}
