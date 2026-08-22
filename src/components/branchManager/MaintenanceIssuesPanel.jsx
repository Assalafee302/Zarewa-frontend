import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Factory,
  Receipt,
  Save,
  Wrench,
  X,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { FIELD } from '../../lib/designTokens';
import { FormField, ModalFrame } from '../layout';
import { formatNgn } from '../../lib/formatNgn';
import { initialExpenseRequestFormState, buildPaymentRequestBodyFromForm } from '../../lib/expenseRequestFormCore.js';
import { ExpenseRequestFormFields } from '../office/ExpenseRequestFormFields.jsx';
import { MaintenanceEnvelopeStrip } from '../operations/MaintenanceEnvelopeStrip';
import { MachineDossierModal } from '../operations/MachineDossierModal';
import {
  MAINTENANCE_COST_KINDS,
  MAINTENANCE_COST_KIND_LABELS,
  MAINTENANCE_WO_KINDS,
  MAINTENANCE_WO_KIND_LABELS,
  maintenanceCostKindLabel,
  maintenanceCostKindRequiresVendor,
  maintenanceDowntimeHours,
  maintenancePriorityLabel,
  maintenanceWorkOrderStatusLabel,
} from '../../shared/lib/maintenanceCostEnvelope';
import { MAINTENANCE_SPECIALTY_LABELS } from '../../shared/maintenanceRegistry';
import {
  DecisionActionTile,
  DecisionBand,
  DecisionChip,
  DecisionModalBody,
  DecisionModalHeader,
  DecisionStickyActions,
} from '../management/DecisionSurface.jsx';
import {
  PAC_INBOX_ROW_CLASS,
  PacEmptyState,
  PacKindPill,
  PacSlaChip,
} from './PacInboxChrome.jsx';

function formatOpenedAt(iso) {
  const ms = Date.parse(String(iso || '').trim());
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function paymentRequestDeskLabel(pr) {
  const paid = Math.round(Number(pr.paidAmountNgn) || 0);
  const asked = Math.round(Number(pr.amountRequestedNgn) || 0);
  const st = String(pr.approvalStatus || '').toLowerCase();
  if (paid > 0 && (asked <= 0 || paid >= asked)) return 'Paid by cashier';
  if (st.includes('reject')) return 'Rejected';
  if (st.includes('approv')) return 'Approved · awaiting cashier';
  return 'Pending approval';
}

function specialtyLabel(raw) {
  const key = String(raw || '').trim().toLowerCase();
  return MAINTENANCE_SPECIALTY_LABELS[key] || raw || 'General';
}

/**
 * Manager PAC — open plant fault work orders.
 * Shell matches Needs approval / Cash / Material rows (data-pac-row, KindPill, SLA, empty state, DecisionBand).
 */
export function MaintenanceIssuesPanel({
  search = '',
  onCountChange,
  focusWorkOrderId = '',
  onFocusWorkOrderHandled,
  roleKey = '',
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [assignTechId, setAssignTechId] = useState('');
  const [assignVendorId, setAssignVendorId] = useState('');
  const [resolveNote, setResolveNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseCostKind, setExpenseCostKind] = useState('parts');
  const [estimateNgn, setEstimateNgn] = useState('');
  const [woKind, setWoKind] = useState('corrective');
  const focusedWorkOrderRef = useRef('');
  const expenseFileInputRef = useRef(null);
  const [expenseForm, setExpenseForm] = useState(() => ({
    ...initialExpenseRequestFormState(),
    expenseCategory: 'Maintenance',
  }));
  const [dossierMachineId, setDossierMachineId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await apiFetch('/api/maintenance/work-orders?openOnly=1').catch(() => ({ ok: false }));
    setLoading(false);
    if (!res.ok) {
      setError(res.data?.error || 'Could not load issues.');
      setRows([]);
      return;
    }
    setRows(Array.isArray(res.data?.workOrders) ? res.data.workOrders : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onCountChange?.(rows.length);
  }, [onCountChange, rows.length]);

  const visibleRows = useMemo(() => {
    const query = String(search || '').trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [
        row.referenceNo,
        row.id,
        row.machineName,
        row.machineId,
        row.symptom,
        row.summary,
        row.status,
        row.priority,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [rows, search]);

  const openDetail = useCallback(async (row) => {
    setSelected(row);
    setAssignTechId(row.assignedToUserId || '');
    setAssignVendorId(row.vendorId || '');
    setResolveNote('');
    const [detailRes, techRes, vendRes] = await Promise.all([
      apiFetch(`/api/maintenance/work-orders/${encodeURIComponent(row.id)}`).catch(() => ({ ok: false })),
      apiFetch('/api/maintenance/technicians').catch(() => ({ ok: false })),
      apiFetch('/api/maintenance/vendors?status=active').catch(() => ({ ok: false })),
    ]);
    if (detailRes.ok && detailRes.data?.workOrder) {
      const wo = { ...row, ...detailRes.data.workOrder };
      setSelected(wo);
      setEstimateNgn(wo.estimatedCostNgn ? String(wo.estimatedCostNgn) : '');
      setWoKind(wo.kind || 'corrective');
    }
    if (techRes.ok) setTechnicians(techRes.data?.technicians || []);
    if (vendRes.ok) setVendors(vendRes.data?.vendors || []);
  }, []);

  useEffect(() => {
    const wid = String(focusWorkOrderId || '').trim();
    if (!wid) {
      focusedWorkOrderRef.current = '';
      return;
    }
    if (loading) return;
    if (focusedWorkOrderRef.current === wid) return;
    focusedWorkOrderRef.current = wid;
    const row = rows.find((r) => String(r.id) === wid) || { id: wid };
    void openDetail(row).finally(() => onFocusWorkOrderHandled?.());
  }, [focusWorkOrderId, loading, onFocusWorkOrderHandled, openDetail, rows]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    const r = await fn();
    setBusy(false);
    if (!r?.ok || r.data?.ok === false) {
      setError(r?.data?.error || 'Action failed.');
      return;
    }
    await load();
    const id = r.data?.workOrder?.id || selected?.id;
    if (id) {
      const refreshed = (
        await apiFetch(`/api/maintenance/work-orders/${encodeURIComponent(id)}`).catch(() => null)
      )?.data?.workOrder;
      if (refreshed) {
        setSelected(refreshed);
        setEstimateNgn(refreshed.estimatedCostNgn ? String(refreshed.estimatedCostNgn) : '');
        setWoKind(refreshed.kind || 'corrective');
      }
    }
  };

  const submitExpense = async () => {
    if (maintenanceCostKindRequiresVendor(expenseCostKind) && !(selected?.vendorId || assignVendorId)) {
      setError('Assign a vendor on the work order before contractor spend.');
      return;
    }
    setBusy(true);
    const body = {
      ...buildPaymentRequestBodyFromForm({
        ...expenseForm,
        description:
          expenseForm.description ||
          `Maintenance for ${selected?.machineName || selected?.machineId || 'machine'} (${selected?.id})`,
        expenseCategory: 'Maintenance',
        requestReference: selected?.id || '',
      }),
      workOrderId: selected?.id,
      costKind: expenseCostKind,
    };
    const res = await apiFetch('/api/payment-requests', { method: 'POST', body }).catch(() => ({
      ok: false,
    }));
    if (!res.ok || res.data?.ok === false) {
      setBusy(false);
      setError(res.data?.error || 'Could not create expense request.');
      return;
    }
    const requestId = res.data?.requestID || res.data?.requestId;
    const alreadyLinked = Boolean(res.data?.workOrderId || res.data?.costLineId);
    if (requestId && selected?.id && !alreadyLinked) {
      const linkRes = await apiFetch(
        `/api/maintenance/work-orders/${encodeURIComponent(selected.id)}/link-payment-request`,
        {
          method: 'POST',
          body: { paymentRequestId: requestId, costKind: expenseCostKind },
        }
      ).catch(() => ({ ok: false }));
      if (!linkRes.ok || linkRes.data?.ok === false) {
        setBusy(false);
        setError(
          linkRes.data?.error ||
            `Expense ${requestId} was created but could not be linked to this work order.`
        );
        await load();
        return;
      }
    }
    setBusy(false);
    setExpenseOpen(false);
    setExpenseForm({ ...initialExpenseRequestFormState(), expenseCategory: 'Maintenance' });
    await load();
  };

  return (
    <>
      {error ? (
        <p className="m-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading issues">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : visibleRows.length === 0 ? (
        <PacEmptyState
          icon={<Wrench size={36} className="mb-3 text-teal-600 opacity-25" />}
          title={search.trim() ? 'No matches' : 'Nothing in this queue'}
          detail={
            search.trim()
              ? 'Try clearing the search filter.'
              : 'Store reports faults from Operations Desk. This queue is clear.'
          }
        />
      ) : (
        visibleRows.map((row) => {
          const urgent = String(row.priority || '').toLowerCase().replace(/-/g, '_') === 'machine_down';
          const statusLabel = maintenanceWorkOrderStatusLabel(row);
          return (
            <button
              key={row.id}
              type="button"
              data-pac-row="1"
              className={`${PAC_INBOX_ROW_CLASS} border-l-4 focus-visible:ring-zarewa-teal/25 ${
                urgent
                  ? 'border-l-rose-500 hover:bg-rose-50/40'
                  : 'border-l-amber-400 hover:bg-amber-50/40'
              }`}
              onClick={() => void openDetail(row)}
            >
              <PacKindPill label="fault" tone={urgent ? 'urgent' : 'pending'} />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
                <span className="font-mono font-bold text-zarewa-teal">{row.referenceNo || row.id}</span>
                {' · '}
                {row.machineName || row.machineId || 'Machine'}
                {' · '}
                {row.symptom || row.summary || 'Fault reported'}
                {' · '}
                <span className="text-slate-500">{statusLabel}</span>
              </span>
              <PacSlaChip kind="issues" row={row} />
              <ChevronRight size={14} className="shrink-0 text-slate-300" />
            </button>
          );
        })
      )}

      <ModalFrame isOpen={Boolean(selected)} onClose={() => setSelected(null)} closeDisabled={busy} showCloseButton={false}>
        {selected ? (
          <div className="z-modal-panel flex max-h-[min(92vh,860px)] w-full max-w-3xl flex-col overflow-hidden p-0">
            <DecisionModalHeader
              title="Maintenance issue"
              onClose={() => setSelected(null)}
              busy={busy}
              icon={Wrench}
            />
            <DecisionModalBody>
              <DecisionBand
                tone={
                  String(selected.priority || '').toLowerCase().replace(/-/g, '_') === 'machine_down'
                    ? 'risk'
                    : 'material'
                }
                eyebrow="Plant fault"
                title={selected.referenceNo || selected.id}
                subtitle={selected.machineName || selected.machineId || 'Machine'}
                meta={
                  <>
                    <DecisionChip
                      tone={
                        String(selected.priority || '').toLowerCase().replace(/-/g, '_') === 'machine_down'
                          ? 'rose'
                          : 'amber'
                      }
                    >
                      {maintenancePriorityLabel(selected.priority, { short: true })}
                    </DecisionChip>
                    <DecisionChip tone="slate">{maintenanceWorkOrderStatusLabel(selected)}</DecisionChip>
                    {selected.vendorName ? <DecisionChip tone="teal">{selected.vendorName}</DecisionChip> : null}
                    {selected.machineId ? (
                      <button
                        type="button"
                        className="rounded-md border border-zarewa-teal/30 bg-white px-2 py-0.5 text-ui-xs font-semibold text-zarewa-teal hover:bg-zarewa-teal/5"
                        onClick={() => setDossierMachineId(selected.machineId)}
                      >
                        Machine file
                      </button>
                    ) : null}
                  </>
                }
              />
              <MaintenanceEnvelopeStrip workOrder={selected} />
              <div className="space-y-4 rounded-md border border-[var(--z-border)] bg-white p-4 text-xs">
                <div>
                  <p className="text-[var(--z-text)]">{selected.symptom || selected.summary}</p>
                  <p className="mt-1.5 text-[var(--z-text-muted)]">
                    {[
                      formatOpenedAt(selected.openedAtIso)
                        ? `Opened ${formatOpenedAt(selected.openedAtIso)}`
                        : null,
                      selected.machineCode ? `Plant ${selected.machineCode}` : null,
                      (() => {
                        const hours = maintenanceDowntimeHours(selected);
                        if (hours <= 0) return selected.returnedToProductionAtIso ? null : 'Just opened';
                        return selected.returnedToProductionAtIso
                          ? `${hours} h off the line`
                          : `${hours} h off the line so far`;
                      })(),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {selected.data?.attachment?.dataBase64 ? (
                  <div className="rounded-md border border-[var(--z-border)] bg-[var(--z-surface-muted)]/50 p-2">
                    <p className="mb-1.5 text-ui-xs font-semibold uppercase tracking-wide text-[var(--z-text-muted)]">
                      Photo
                    </p>
                    {String(selected.data.attachment.mime || '').startsWith('image/') ? (
                      <img
                        src={`data:${selected.data.attachment.mime};base64,${selected.data.attachment.dataBase64}`}
                        alt={selected.data.attachment.name || 'Fault photo'}
                        className="max-h-48 w-full rounded-md object-contain bg-white"
                      />
                    ) : (
                      <p className="text-xs font-semibold text-[var(--z-text)]">
                        {selected.data.attachment.name || 'Attachment on file'}
                      </p>
                    )}
                  </div>
                ) : null}
                <div>
                  <p className="mb-2 text-ui-xs font-semibold uppercase tracking-wide text-zarewa-teal">Plant</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      label="Assign technician"
                      htmlFor="wo-tech"
                      hint={
                        technicians.length === 0
                          ? 'None flagged in HR. Assign a vendor, or mark staff as technicians under People.'
                          : undefined
                      }
                    >
                      <select
                        id="wo-tech"
                        className={FIELD.compact}
                        value={assignTechId}
                        onChange={(e) => setAssignTechId(e.target.value)}
                      >
                        <option value="">— None —</option>
                        {technicians.map((t) => (
                          <option key={t.userId} value={t.userId}>
                            {t.displayName} ({specialtyLabel(t.specialty)})
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField
                      label="Assign vendor"
                      htmlFor="wo-vendor"
                      hint={
                        vendors.length === 0
                          ? 'None on file. Register contractors on Expenses → Machines.'
                          : 'Required only for contractor invoices — not for parts, feeding, or lodging.'
                      }
                    >
                      <select
                        id="wo-vendor"
                        className={FIELD.compact}
                        value={assignVendorId}
                        onChange={(e) => setAssignVendorId(e.target.value)}
                      >
                        <option value="">— None —</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({specialtyLabel(v.specialty)})
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-ui-xs font-semibold uppercase tracking-wide text-zarewa-teal">Money</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Job kind" htmlFor="wo-kind">
                      <select
                        id="wo-kind"
                        className={FIELD.compact}
                        value={woKind}
                        onChange={(e) => setWoKind(e.target.value)}
                      >
                        {MAINTENANCE_WO_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {MAINTENANCE_WO_KIND_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField
                      label="Estimated total (₦)"
                      htmlFor="wo-estimate"
                      hint="Ceiling for this job. Spend is added bit by bit below."
                    >
                      <input
                        id="wo-estimate"
                        className={FIELD.compact}
                        inputMode="numeric"
                        value={estimateNgn}
                        onChange={(e) => setEstimateNgn(e.target.value)}
                        placeholder="e.g. 800000"
                      />
                    </FormField>
                  </div>
                </div>
                <FormField
                  label="Note"
                  htmlFor="wo-note"
                  hint="Optional. Saved with Back on line or Close finances."
                >
                  <textarea
                    id="wo-note"
                    className={`${FIELD.compact} min-h-[4rem]`}
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="What was done, leftover parts, lodging still to pay…"
                  />
                </FormField>
                {(selected.paymentRequests || []).length > 0 ? (
                  <div>
                    <p className="text-ui-xs font-semibold uppercase tracking-wide text-[var(--z-text-muted)]">
                      Payment requests
                    </p>
                    <ul className="mt-1 divide-y divide-[var(--z-border-subtle)]">
                      {selected.paymentRequests.map((pr) => (
                        <li key={pr.requestID} className="flex justify-between gap-2 py-1">
                          <span className="text-[var(--z-text-muted)]">
                            {pr.requestID}
                            {' · '}
                            {maintenanceCostKindLabel(pr.maintenanceCostKind)}
                            {' · '}
                            {paymentRequestDeskLabel(pr)}
                          </span>
                          <span className="z-stencil font-semibold">
                            {formatNgn(pr.paidAmountNgn || pr.amountRequestedNgn || 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(selected.costLines || []).length > 0 ? (
                  <div>
                    <p className="text-ui-xs font-semibold uppercase tracking-wide text-[var(--z-text-muted)]">Spend so far</p>
                    <ul className="mt-1 divide-y divide-[var(--z-border-subtle)]">
                      {selected.costLines.map((line) => (
                        <li key={line.id} className="flex justify-between gap-2 py-1">
                          <span className="text-[var(--z-text-muted)]">
                            {maintenanceCostKindLabel(line.costKind)}
                            {line.sourceId ? ` · ${line.sourceId}` : ''}
                          </span>
                          <span className="z-stencil font-semibold">{formatNgn(line.amountNgn)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[var(--z-text-muted)]">No spend tagged yet. Use Add spend for parts, feeding, lodging, or labour.</p>
                )}
              </div>
            </DecisionModalBody>
            <DecisionStickyActions hint="Parts, feeding, lodging and labour are each their own spend. Return the machine without closing the envelope.">
              <div className="space-y-2">
                <p className="text-ui-xs font-semibold uppercase tracking-wide text-[var(--z-text-muted)]">Plant</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <DecisionActionTile
                    variant="neutral"
                    icon={ClipboardCheck}
                    label="Acknowledge"
                    disabled={busy || Boolean(selected.acknowledgedAtIso)}
                    onClick={() =>
                      void run(() =>
                        apiFetch(`/api/maintenance/work-orders/${encodeURIComponent(selected.id)}/acknowledge`, {
                          method: 'POST',
                          body: {},
                        })
                      )
                    }
                  />
                  <DecisionActionTile
                    variant="approve"
                    icon={Save}
                    label="Save assignment"
                    disabled={busy || (!assignTechId && !assignVendorId)}
                    onClick={() =>
                      void run(() =>
                        apiFetch(`/api/maintenance/work-orders/${encodeURIComponent(selected.id)}/assign`, {
                          method: 'POST',
                          body: {
                            assignedToUserId: assignTechId || null,
                            vendorId: assignVendorId || null,
                          },
                        })
                      )
                    }
                  />
                  <DecisionActionTile
                    variant="neutral"
                    icon={Factory}
                    label="Back on line"
                    disabled={busy || Boolean(selected.returnedToProductionAtIso)}
                    onClick={() =>
                      void run(() =>
                        apiFetch(
                          `/api/maintenance/work-orders/${encodeURIComponent(selected.id)}/return-to-production`,
                          {
                            method: 'POST',
                            body: resolveNote.trim() ? { note: resolveNote.trim() } : {},
                          }
                        )
                      )
                    }
                  />
                </div>
                <p className="text-ui-xs font-semibold uppercase tracking-wide text-[var(--z-text-muted)]">Money</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <DecisionActionTile
                    variant="secondary"
                    icon={Save}
                    label="Save estimate"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        apiFetch(`/api/maintenance/work-orders/${encodeURIComponent(selected.id)}/envelope`, {
                          method: 'PATCH',
                          body: {
                            estimatedCostNgn: Number(String(estimateNgn).replace(/,/g, '')) || 0,
                            kind: woKind,
                          },
                        })
                      )
                    }
                  />
                  <DecisionActionTile
                    variant="secondary"
                    icon={Receipt}
                    label="Add spend"
                    disabled={busy || Boolean(selected.costClosedAtIso)}
                    onClick={() => {
                      setExpenseCostKind('parts');
                      setExpenseForm({
                        ...initialExpenseRequestFormState(),
                        expenseCategory: 'Maintenance',
                        description: `Repair: ${selected.machineName || selected.machineId} — ${selected.symptom || selected.summary}`,
                        requestReference: selected.id,
                      });
                      setExpenseOpen(true);
                    }}
                  />
                  <DecisionActionTile
                    variant="brand"
                    icon={CheckCircle2}
                    label="Close finances"
                    disabled={busy || Boolean(selected.costClosedAtIso)}
                    onClick={() =>
                      void run(() =>
                        apiFetch(
                          `/api/maintenance/work-orders/${encodeURIComponent(selected.id)}/close-costs`,
                          {
                            method: 'POST',
                            body: resolveNote.trim() ? { note: resolveNote.trim() } : {},
                          }
                        ).then((r) => {
                          if (r.ok && (selected.returnedToProductionAtIso || r.data?.workOrder?.returnedToProductionAtIso)) {
                            setSelected(null);
                          }
                          return r;
                        })
                      )
                    }
                  />
                </div>
                <DecisionActionTile
                  variant="secondary"
                  icon={X}
                  label="Close"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                />
              </div>
            </DecisionStickyActions>
          </div>
        ) : null}
      </ModalFrame>

      <ModalFrame isOpen={expenseOpen} onClose={() => !busy && setExpenseOpen(false)} closeDisabled={busy} showCloseButton={false}>
        <div className="z-modal-panel flex max-h-[min(92vh,860px)] w-full max-w-3xl flex-col overflow-hidden p-0">
          <DecisionModalHeader
            title="Maintenance expense"
            onClose={() => setExpenseOpen(false)}
            busy={busy}
            icon={Receipt}
          />
          <DecisionModalBody>
            <DecisionBand
              tone="payment"
              eyebrow="Expense request"
              title="Create maintenance expense"
              subtitle={selected ? `${selected.referenceNo || selected.id} · ${selected.machineName || selected.machineId || ''}` : null}
            />
            <div className="space-y-3 rounded-md border border-[var(--z-border)] bg-white p-4">
              <FormField
                label="This spend is for"
                htmlFor="wo-cost-kind"
                hint="Parts, feeding, lodging, labour — one request at a time. Contractor invoices need a vendor on the work order."
              >
                <select
                  id="wo-cost-kind"
                  className={FIELD.compact}
                  value={expenseCostKind}
                  onChange={(e) => setExpenseCostKind(e.target.value)}
                >
                  {MAINTENANCE_COST_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {MAINTENANCE_COST_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </FormField>
              {maintenanceCostKindRequiresVendor(expenseCostKind) &&
              !(selected?.vendorId || assignVendorId) ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950">
                  Assign a vendor on the work order before submitting contractor spend.
                </p>
              ) : null}
              <ExpenseRequestFormFields
                form={expenseForm}
                setForm={setExpenseForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitExpense();
                }}
                fileInputRef={expenseFileInputRef}
                showToast={(message) => setError(message)}
                formatNgn={(value) => `₦${Math.round(Number(value) || 0).toLocaleString('en-NG')}`}
                submitting={busy}
                scrollable
                hideSubmit
              />
            </div>
          </DecisionModalBody>
          <DecisionStickyActions hint="Creates a payment request and links it to this work order. Payout stays on the Cashier desk.">
            <div className="flex flex-wrap gap-2">
              <DecisionActionTile
                variant="secondary"
                icon={X}
                label="Cancel"
                disabled={busy}
                onClick={() => setExpenseOpen(false)}
              />
              <DecisionActionTile
                variant="brand"
                icon={Receipt}
                label="Submit expense"
                disabled={
                  busy ||
                  (maintenanceCostKindRequiresVendor(expenseCostKind) &&
                    !(selected?.vendorId || assignVendorId))
                }
                onClick={() => void submitExpense()}
              />
            </div>
          </DecisionStickyActions>
        </div>
      </ModalFrame>

      <MachineDossierModal
        machineId={dossierMachineId}
        layer="nested"
        roleKey={roleKey}
        onClose={() => setDossierMachineId('')}
        onActOnWorkOrder={(wid) => {
          setDossierMachineId('');
          const row = rows.find((r) => String(r.id) === String(wid)) || { id: wid };
          void openDetail(row);
        }}
      />
    </>
  );
}
