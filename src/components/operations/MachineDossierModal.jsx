import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { formatNgn } from '../../lib/formatNgn';
import { SURFACE, TEXT } from '../../lib/designTokens';
import { ModalFrame, ModalScrollBody, ModalScrollFooter, ModalScrollHeader, ModalScrollShell } from '../layout';
import { Button } from '../ui/button';
import { MaintenanceEnvelopeStrip } from './MaintenanceEnvelopeStrip';
import { MACHINE_STATUS_LABELS } from '../../shared/maintenanceRegistry';
import {
  MAINTENANCE_COST_KIND_LABELS,
  MAINTENANCE_WO_KIND_LABELS,
  maintenanceCostKindLabel,
  maintenanceDowntimeHours,
  maintenanceEventKindLabel,
  maintenancePriorityLabel,
  maintenanceWorkOrderStatusLabel,
} from '../../shared/lib/maintenanceCostEnvelope';
import { MACHINE_TYPE_LABELS, userMayEditMaintenanceVendors } from '../../shared/maintenanceRegistry';
import { repairReplaceLabel } from '../../shared/maintenanceRepairReplace';

function flagToneClass(flag) {
  switch (flag) {
    case 'urgent':
    case 'replace_review':
      return 'border-rose-200 bg-rose-50 text-rose-900';
    case 'watch':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return 'border-[var(--z-border)] bg-white text-[var(--z-text)]';
  }
}

function formatWhen(iso) {
  const ms = Date.parse(String(iso || '').trim());
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className={TEXT.labelCaps}>{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[var(--z-text)]">{value}</p>
    </div>
  );
}

function FaultPhoto({ wo }) {
  const att = wo?.data?.attachment;
  if (!att?.dataBase64) return null;
  if (!String(att.mime || '').startsWith('image/')) {
    return <p className={`mt-2 ${TEXT.label}`}>{att.name || 'Attachment on file'}</p>;
  }
  return (
    <img
      src={`data:${att.mime};base64,${att.dataBase64}`}
      alt={att.name || 'Fault photo'}
      className="mt-2 max-h-40 w-full rounded-md border border-[var(--z-border)] object-contain bg-white"
    />
  );
}

/**
 * BM / MD / Ops machine file: standing register, current fault, next actions, event history.
 * Pass onActOnWorkOrder so BM can jump to Approvals → Issues for the job.
 */
export function MachineDossierModal({
  machineId,
  onClose,
  roleKey = '',
  onActOnWorkOrder,
  layer = 'default',
}) {
  const canAct = userMayEditMaintenanceVendors(roleKey);
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const id = String(machineId || '').trim();
    if (!id) {
      setPack(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const res = await apiFetch(`/api/maintenance/machines/${encodeURIComponent(id)}/dossier`).catch(() => ({
      ok: false,
    }));
    setLoading(false);
    if (!res.ok || res.data?.ok === false) {
      setError(res.data?.error || 'Could not load machine file.');
      setPack(null);
      return;
    }
    setPack(res.data);
  }, [machineId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClose = () => {
    setPack(null);
    setError('');
    onClose?.();
  };

  const actOn = (workOrderId) => {
    const wid = String(workOrderId || '').trim();
    if (!wid || !onActOnWorkOrder) return;
    onClose?.();
    onActOnWorkOrder(wid);
  };

  const machine = pack?.machine || {};
  const insight = pack?.insight || {};
  const workOrders = Array.isArray(pack?.workOrders) ? pack.workOrders : [];
  const currentFaults = Array.isArray(pack?.currentFaults) ? pack.currentFaults : [];
  const events = Array.isArray(pack?.events) ? pack.events : [];
  const nextActions = Array.isArray(pack?.nextActions) ? pack.nextActions : [];
  const costByKind = pack?.costByKind || {};
  const spendKinds = Object.entries(MAINTENANCE_COST_KIND_LABELS).filter(([key]) => Number(costByKind[key] || 0) > 0);
  const linkedAsset = Array.isArray(machine.linkedAssets) ? machine.linkedAssets[0] : null;

  return (
    <ModalFrame
      isOpen={Boolean(machineId)}
      onClose={handleClose}
      surface="plain"
      showCloseButton={false}
      layer={layer}
    >
      <ModalScrollShell size="xl">
        <ModalScrollHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={TEXT.labelCaps}>Machine file</p>
              <h2 className="mt-0.5 truncate text-lg font-bold text-[var(--z-text)]">
                {machine.name || insight.name || machineId}
              </h2>
              <p className={`mt-0.5 ${TEXT.label}`}>
                {[
                  machine.machineCode || machine.referenceNo,
                  MACHINE_TYPE_LABELS[machine.machineType] || machine.machineType,
                  machine.lineName,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Plant register'}
              </p>
            </div>
            <button
              type="button"
              className="rounded-md p-1.5 text-[var(--z-text-muted)] hover:bg-[var(--z-surface-muted)] hover:text-[var(--z-text)]"
              onClick={handleClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </ModalScrollHeader>
        <ModalScrollBody>
          {error ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
              {error}
            </p>
          ) : null}
          {loading && !pack ? (
            <div className="space-y-2 py-6" aria-busy="true" aria-label="Loading machine file">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-[var(--z-surface-muted)]" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-4">
                <div className={`${SURFACE.card} p-3`}>
                  <p className={TEXT.labelCaps}>Status</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--z-text)]">
                    {MACHINE_STATUS_LABELS[machine.status] ||
                      String(machine.status || 'active').replace(/_/g, ' ')}
                  </p>
                </div>
                <div className={`${SURFACE.card} p-3`}>
                  <p className={TEXT.labelCaps}>Lifetime maint.</p>
                  <p className="z-stencil mt-1 text-sm font-semibold text-zarewa-teal">
                    {formatNgn(insight.lifetimeMaintenanceNgn || 0)}
                  </p>
                </div>
                <div className={`rounded-md border p-3 ${flagToneClass(insight.flag)}`}>
                  <p className={TEXT.labelCaps}>Flag</p>
                  <p className="mt-1 text-sm font-semibold">
                    {insight.flagLabel || repairReplaceLabel(insight.flag) || 'OK'}
                  </p>
                </div>
                <div className={`${SURFACE.card} p-3`}>
                  <p className={TEXT.labelCaps}>Open jobs</p>
                  <p className="z-stencil mt-1 text-sm font-semibold text-[var(--z-text)]">
                    {insight.openWorkOrders ?? currentFaults.length}
                  </p>
                </div>
              </div>

              <div className={`${SURFACE.card} p-3`}>
                <p className={TEXT.labelCaps}>Standing file</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <Fact label="Plant code" value={machine.machineCode || machine.referenceNo} />
                  <Fact label="Serial" value={machine.serialNo} />
                  <Fact label="Model" value={machine.modelNo} />
                  <Fact label="Manufacturer" value={machine.manufacturer} />
                  <Fact label="Installed" value={formatWhen(machine.installedAtIso)} />
                  <Fact
                    label="Fixed asset"
                    value={linkedAsset?.assetId ? `Linked · ${linkedAsset.assetId}` : 'Not linked'}
                  />
                </div>
                {machine.notes ? <p className={`mt-3 ${TEXT.label}`}>{machine.notes}</p> : null}
              </div>

              <div>
                <p className={`mb-2 ${TEXT.labelCaps}`}>What’s wrong now</p>
                {currentFaults.length === 0 ? (
                  <p className={`${SURFACE.muted} px-3 py-4 text-sm text-[var(--z-text)]`}>
                    Nothing open on this machine. Store reports new faults from Operations Desk.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {currentFaults.map((wo) => (
                      <li key={wo.id} className={`${SURFACE.card} p-3`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-zarewa-teal">
                            {wo.referenceNo || wo.id}
                            <span className="ml-2 font-medium text-[var(--z-text-muted)]">
                              {MAINTENANCE_WO_KIND_LABELS[wo.kind] || wo.kind}
                            </span>
                          </p>
                          <span className={`${TEXT.labelCaps} !mb-0`}>
                            {maintenanceWorkOrderStatusLabel(wo)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--z-text)]">{wo.symptom || wo.summary}</p>
                        <p className={`mt-1 ${TEXT.label}`}>
                          {[
                            maintenancePriorityLabel(wo.priority, { short: true }),
                            formatWhen(wo.openedAtIso) ? `Opened ${formatWhen(wo.openedAtIso)}` : null,
                            maintenanceDowntimeHours(wo) > 0
                              ? `${maintenanceDowntimeHours(wo)} h off the line`
                              : null,
                            wo.vendorName || null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        <FaultPhoto wo={wo} />
                        <MaintenanceEnvelopeStrip workOrder={wo} className="mt-2" />
                        {canAct && onActOnWorkOrder ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2"
                            onClick={() => actOn(wo.id)}
                          >
                            Take action on this job
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className={`mb-2 ${TEXT.labelCaps}`}>Actions to take</p>
                {nextActions.length === 0 ? (
                  <p className={`${SURFACE.muted} px-3 py-4 text-sm text-[var(--z-text)]`}>
                    No next step on file. This machine is clear.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {nextActions.map((action, idx) => (
                      <li
                        key={`${action.key}-${action.workOrderId || idx}`}
                        className={`${SURFACE.card} flex flex-wrap items-start justify-between gap-2 p-3`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--z-text)]">{action.title}</p>
                          <p className={`mt-0.5 ${TEXT.label}`}>{action.detail}</p>
                        </div>
                        {canAct && action.workOrderId && onActOnWorkOrder ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => actOn(action.workOrderId)}>
                            Open job
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                {canAct && !onActOnWorkOrder ? (
                  <p className={`mt-2 ${TEXT.label}`}>
                    Open Approvals → Issues to acknowledge, assign, add spend, or return the machine.
                  </p>
                ) : null}
                {!canAct ? (
                  <p className={`mt-2 ${TEXT.label}`}>
                    Branch Manager acts on Approvals → Issues. This file is view-only here.
                  </p>
                ) : null}
              </div>

              <div className={`${SURFACE.card} p-3`}>
                <p className={TEXT.labelCaps}>Spend by type</p>
                {spendKinds.length === 0 ? (
                  <p className={`mt-2 ${TEXT.label}`}>No tagged spend yet.</p>
                ) : (
                  <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {spendKinds.map(([key, label]) => (
                      <li key={key} className="flex justify-between gap-2 text-ui-xs">
                        <span className="text-[var(--z-text-muted)]">{label}</span>
                        <span className="z-stencil font-semibold text-[var(--z-text)]">
                          {formatNgn(costByKind[key] || 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className={`mb-2 ${TEXT.labelCaps}`}>Event history</p>
                {events.length === 0 ? (
                  <p className={`${SURFACE.muted} px-3 py-4 text-center text-xs`}>
                    No events recorded on this machine yet.
                  </p>
                ) : (
                  <ol className="space-y-0 divide-y divide-[var(--z-border-subtle)] rounded-md border border-[var(--z-border)] bg-white">
                    {events.map((ev) => (
                      <li key={ev.id} className="px-3 py-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold text-[var(--z-text)]">
                            {maintenanceEventKindLabel(ev.eventKind)}
                            {ev.workOrderRef ? (
                              <span className="ml-2 font-medium text-zarewa-teal">{ev.workOrderRef}</span>
                            ) : null}
                          </p>
                          <span className={TEXT.micro}>{formatWhen(ev.atIso)}</span>
                        </div>
                        {ev.note ? <p className={`mt-0.5 ${TEXT.label}`}>{ev.note}</p> : null}
                        {ev.actorDisplayName ? (
                          <p className={`mt-0.5 ${TEXT.micro}`}>{ev.actorDisplayName}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div>
                <p className={`mb-2 ${TEXT.labelCaps}`}>All work orders</p>
                {workOrders.length === 0 ? (
                  <p className={`${SURFACE.muted} px-3 py-6 text-center text-xs`}>
                    No jobs on this machine yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {workOrders.map((wo) => (
                      <li key={wo.id} className={`${SURFACE.card} p-3`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-zarewa-teal">
                            {wo.referenceNo || wo.id}
                            <span className="ml-2 font-medium capitalize text-[var(--z-text-muted)]">
                              {MAINTENANCE_WO_KIND_LABELS[wo.kind] || wo.kind}
                            </span>
                          </p>
                          <span className={`${TEXT.labelCaps} !mb-0`}>
                            {maintenanceWorkOrderStatusLabel(wo)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--z-text)]">{wo.symptom || wo.summary}</p>
                        {(() => {
                          const hours = maintenanceDowntimeHours(wo);
                          const openedLabel = formatWhen(wo.openedAtIso);
                          if (!openedLabel && hours <= 0) return null;
                          return (
                            <p className={`mt-1 ${TEXT.label}`}>
                              {[openedLabel ? `Opened ${openedLabel}` : null, hours > 0 ? `${hours} h downtime` : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          );
                        })()}
                        <MaintenanceEnvelopeStrip workOrder={wo} className="mt-2" />
                        {(wo.costLines || []).length > 0 ? (
                          <ul className="mt-2 divide-y divide-[var(--z-border-subtle)]">
                            {wo.costLines.map((line) => (
                              <li key={line.id} className="flex justify-between gap-2 py-1 text-ui-xs">
                                <span className="text-[var(--z-text-muted)]">
                                  {maintenanceCostKindLabel(line.costKind)}
                                  {line.sourceId ? ` · ${line.sourceId}` : ''}
                                </span>
                                <span className="z-stencil font-semibold">{formatNgn(line.amountNgn)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={`mt-2 ${TEXT.label}`}>No cost lines yet.</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </ModalScrollBody>
        <ModalScrollFooter>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </ModalScrollFooter>
      </ModalScrollShell>
    </ModalFrame>
  );
}
