import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Receipt,
  Save,
  Wrench,
  X,
} from 'lucide-react';
import { apiFetch } from '../../lib/apiBase';
import { ModalFrame } from '../layout';
import { initialExpenseRequestFormState, buildPaymentRequestBodyFromForm } from '../../lib/expenseRequestFormCore.js';
import { ExpenseRequestFormFields } from '../office/ExpenseRequestFormFields.jsx';
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

/**
 * Manager PAC — open plant fault work orders.
 * Shell matches Needs approval / Cash / Material rows (data-pac-row, KindPill, SLA, empty state, DecisionBand).
 */
export function MaintenanceIssuesPanel({ search = '', onCountChange, focusWorkOrderId = '', onFocusWorkOrderHandled }) {
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
  const focusedWorkOrderRef = useRef('');
  const expenseFileInputRef = useRef(null);
  const [expenseForm, setExpenseForm] = useState(() => ({
    ...initialExpenseRequestFormState(),
    expenseCategory: 'Maintenance',
  }));

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
      setSelected({ ...row, ...detailRes.data.workOrder });
    }
    if (techRes.ok) setTechnicians(techRes.data?.technicians || []);
    if (vendRes.ok) setVendors(vendRes.data?.vendors || []);
  }, []);

  useEffect(() => {
    const wid = String(focusWorkOrderId || '').trim();
    if (!wid || loading) return;
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
    if (r.data?.workOrder) setSelected(r.data.workOrder);
    else if (selected?.id) {
      const refreshed = (await apiFetch(`/api/maintenance/work-orders/${encodeURIComponent(selected.id)}`).catch(
        () => null
      ))?.data?.workOrder;
      if (refreshed) setSelected(refreshed);
    }
  };

  const submitExpense = async () => {
    setBusy(true);
    const body = buildPaymentRequestBodyFromForm({
      ...expenseForm,
      description:
        expenseForm.description ||
        `Maintenance for ${selected?.machineName || selected?.machineId || 'machine'} (${selected?.id})`,
      expenseCategory: 'Maintenance',
      requestReference: selected?.id || '',
    });
    const res = await apiFetch('/api/payment-requests', { method: 'POST', body }).catch(() => ({
      ok: false,
    }));
    if (!res.ok || res.data?.ok === false) {
      setBusy(false);
      setError(res.data?.error || 'Could not create expense request.');
      return;
    }
    const requestId = res.data?.requestID || res.data?.requestId;
    if (requestId && selected?.id) {
      const linkRes = await apiFetch(
        `/api/maintenance/work-orders/${encodeURIComponent(selected.id)}/link-payment-request`,
        {
          method: 'POST',
          body: { paymentRequestId: requestId },
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

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-zarewa-teal/15';

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
              : 'Queue clear — check your daily checklist or Branch Operations next.'
          }
        />
      ) : (
        visibleRows.map((row) => {
          const urgent = String(row.priority || '').toLowerCase().replace(/-/g, '_') === 'machine_down';
          const statusLabel = String(row.status || 'open').replace(/_/g, ' ');
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
                <span className="capitalize text-slate-500">{statusLabel}</span>
              </span>
              <PacSlaChip kind="issues" row={row} />
              <ChevronRight size={14} className="shrink-0 text-slate-300" />
            </button>
          );
        })
      )}

      <ModalFrame isOpen={Boolean(selected)} onClose={() => setSelected(null)} closeDisabled={busy}>
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
                      {String(selected.priority || 'normal').replace(/_/g, ' ')}
                    </DecisionChip>
                    <DecisionChip tone="slate">{String(selected.status || 'open').replace(/_/g, ' ')}</DecisionChip>
                    {selected.vendorName ? <DecisionChip tone="teal">{selected.vendorName}</DecisionChip> : null}
                  </>
                }
              />
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
                <p className="text-slate-800">{selected.symptom || selected.summary}</p>
                {selected.data?.attachment?.dataBase64 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                    <p className="mb-1.5 text-ui-xs font-bold uppercase tracking-wide text-slate-500">
                      Photo
                    </p>
                    {String(selected.data.attachment.mime || '').startsWith('image/') ? (
                      <img
                        src={`data:${selected.data.attachment.mime};base64,${selected.data.attachment.dataBase64}`}
                        alt={selected.data.attachment.name || 'Fault photo'}
                        className="max-h-48 w-full rounded-md object-contain bg-white"
                      />
                    ) : (
                      <p className="text-xs font-semibold text-slate-700">
                        {selected.data.attachment.name || 'Attachment on file'}
                      </p>
                    )}
                  </div>
                ) : null}
                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Assign technician
                  <select
                    className={`mt-1 ${inputClass}`}
                    value={assignTechId}
                    onChange={(e) => setAssignTechId(e.target.value)}
                  >
                    <option value="">—</option>
                    {technicians.map((t) => (
                      <option key={t.userId} value={t.userId}>
                        {t.displayName} ({t.specialty})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Assign vendor
                  <select
                    className={`mt-1 ${inputClass}`}
                    value={assignVendorId}
                    onChange={(e) => setAssignVendorId(e.target.value)}
                  >
                    <option value="">—</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.specialty})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-ui-xs font-bold uppercase text-slate-500">
                  Closing note
                  <textarea
                    className={`mt-1 ${inputClass} min-h-[4rem]`}
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                  />
                </label>
              </div>
            </DecisionModalBody>
            <DecisionStickyActions hint="Acknowledge the fault, assign repair ownership, or close it with a note.">
              <div className="flex flex-wrap gap-2">
                <DecisionActionTile
                  variant="secondary"
                  icon={X}
                  label="Close"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                />
                <DecisionActionTile
                  variant="secondary"
                  icon={Receipt}
                  label="Create expense"
                  disabled={busy}
                  onClick={() => {
                    setExpenseForm({
                      ...initialExpenseRequestFormState(),
                      expenseCategory: 'Maintenance',
                      description: `Repair: ${selected.machineName || selected.machineId} — ${selected.symptom || selected.summary}`,
                      requestReference: selected.id,
                    });
                    setExpenseOpen(true);
                  }}
                />
              </div>
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
                  variant="brand"
                  icon={CheckCircle2}
                  label="Mark resolved"
                  disabled={busy || !resolveNote.trim()}
                  onClick={() =>
                    void run(() =>
                      apiFetch(`/api/maintenance/work-orders/${encodeURIComponent(selected.id)}/resolve`, {
                        method: 'POST',
                        body: { note: resolveNote },
                      }).then((r) => {
                        if (r.ok) setSelected(null);
                        return r;
                      })
                    )
                  }
                />
              </div>
            </DecisionStickyActions>
          </div>
        ) : null}
      </ModalFrame>

      <ModalFrame isOpen={expenseOpen} onClose={() => !busy && setExpenseOpen(false)} closeDisabled={busy}>
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
            <div className="rounded-xl border border-slate-200 bg-white p-4">
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
                disabled={busy}
                onClick={() => void submitExpense()}
              />
            </div>
          </DecisionStickyActions>
        </div>
      </ModalFrame>
    </>
  );
}
